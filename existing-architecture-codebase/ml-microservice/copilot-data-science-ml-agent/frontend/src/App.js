import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import ChatMessage from './components/ChatMessage';
import FileUpload from './components/FileUpload';
import MicrophoneButton from './components/MicrophoneButton';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/copilot-data-science-ml-agent/v1';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Create session on mount
    createSession();
  }, []);

  const createSession = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/sessions`, {
        org_id: 'default-org',  // Organization ID for multi-tenancy
        user_id: `web_user_${Date.now()}`
      });
      setSessionId(response.data.session_id);
      setUploadedFiles([]);  // Clear uploaded files for new session
      setMessages([]);  // Clear messages for new session
      console.log('Session created:', response.data.session_id);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleMicrophoneTranscript = useCallback((transcribedText) => {
    console.log('📝 Microphone transcript received:', transcribedText);
    setInputMessage(prev => {
      const newMessage = prev.trim();
      const result = newMessage ? `${newMessage} ${transcribedText}` : transcribedText;
      console.log('📝 Input message updated to:', result);
      return result;
    });
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !sessionId) return;

    // Add user message to chat
    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Send to API
      const response = await axios.post(`${API_BASE_URL}/analyze`, {
        session_id: sessionId,
        message: inputMessage,
        file_paths: uploadedFiles.map(f => f.file_path)
      });

      // Add agent response to chat
      const agentMessage = {
        role: 'agent',
        content: response.data.response,
        timestamp: response.data.timestamp
      };
      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'agent',
        content: `Error: ${error.response?.data?.detail || error.message}`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!sessionId) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/upload?session_id=${sessionId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setUploadedFiles(prev => [...prev, response.data]);

      // Add system message about file upload
      const systemMessage = {
        role: 'system',
        content: `✓ File uploaded: ${response.data.filename} (${(response.data.file_size_bytes / 1024).toFixed(2)} KB)`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, systemMessage]);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const quickActions = [
    "Perform comprehensive EDA with insights",
    "Generate insights about data quality",
    "What patterns can you detect?",
    "Create visualizations for key findings"
  ];

  return (
    <div className="App">
      <div className="container">
        <header className="App-header">
          <h1>🔬 Data Science & ML Chatbot</h1>
          <p>Analyze datasets with AI-powered insights</p>
        </header>

        <div className="chat-container">
          <div className="messages-container">
            {messages.length === 0 && (
              <div className="welcome-message">
                <h2>Welcome! 👋</h2>
                <p>Upload a CSV file or ask me anything about data science, statistics, or machine learning.</p>
                <div className="features">
                  <div className="feature">
                    <span className="icon">📊</span>
                    <span>Automatic EDA & Insights</span>
                  </div>
                  <div className="feature">
                    <span className="icon">🔍</span>
                    <span>Evidence-Based Analysis</span>
                  </div>
                  <div className="feature">
                    <span className="icon">📈</span>
                    <span>Pattern Detection</span>
                  </div>
                  <div className="feature">
                    <span className="icon">🎯</span>
                    <span>ML Recommendations</span>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <ChatMessage key={index} message={msg} />
            ))}

            {isLoading && (
              <div className="loading-message">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p>Analyzing...</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {uploadedFiles.length > 0 && (
            <div className="uploaded-files">
              <h4>Uploaded Files:</h4>
              {uploadedFiles.map((file, index) => (
                <div key={index} className="file-chip">
                  📄 {file.filename}
                </div>
              ))}
            </div>
          )}

          {messages.length === 0 && (
            <div className="quick-actions">
              <p>Quick actions:</p>
              <div className="action-buttons">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(action)}
                    className="action-button"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="input-container">
            <FileUpload onFileUpload={handleFileUpload} />

            <form onSubmit={sendMessage} className="message-form">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about your data..."
                className="message-input"
                disabled={!sessionId || isLoading}
              />
              <MicrophoneButton
                onTranscript={handleMicrophoneTranscript}
                disabled={!sessionId || isLoading}
              />
              <button
                type="submit"
                className="send-button"
                disabled={!sessionId || isLoading || !inputMessage.trim()}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
