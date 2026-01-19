import React from 'react';
import ReactMarkdown from 'react-markdown';
import './ChatMessage.css';

// Backend API URL - images are served from here
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function ChatMessage({ message }) {
  const { role, content, timestamp, isError } = message;

  // Custom renderer for images to prepend API base URL
  const components = {
    img: ({ node, ...props }) => {
      let src = props.src;
      // If the src starts with /visualizations, prepend the API base URL
      if (src && src.startsWith('/visualizations')) {
        src = `${API_BASE_URL}${src}`;
      }
      return (
        <img
          {...props}
          src={src}
          alt={props.alt || 'Visualization'}
          loading="lazy"
          onClick={() => window.open(src, '_blank')}
          title="Click to open full size"
        />
      );
    }
  };

  return (
    <div className={`chat-message ${role} ${isError ? 'error' : ''}`}>
      <div className="message-header">
        <span className="role-badge">
          {role === 'user' ? '👤 You' : role === 'agent' ? '🤖 Agent' : '📢 System'}
        </span>
        <span className="timestamp">
          {new Date(timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div className="message-content">
        {role === 'agent' || role === 'system' ? (
          <ReactMarkdown components={components}>{content}</ReactMarkdown>
        ) : (
          <p>{content}</p>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
