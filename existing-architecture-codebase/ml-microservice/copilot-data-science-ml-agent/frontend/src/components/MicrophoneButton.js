import React, { useState, useRef, useEffect, useCallback } from 'react';

const MicrophoneButton = ({ onTranscript, disabled }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);
  const callbackRef = useRef(onTranscript);
  const isFinalRef = useRef(false);

  // Update callback ref when onTranscript changes
  useEffect(() => {
    callbackRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    // Check browser support for Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsListening(true);
      isFinalRef.current = false;
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        console.log(`Result ${i}: "${transcript}" (isFinal: ${event.results[i].isFinal})`);

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Send final transcript immediately
      if (finalTranscript && !isFinalRef.current) {
        isFinalRef.current = true;
        const trimmedTranscript = finalTranscript.trim();
        console.log('✅ Final transcript:', trimmedTranscript);
        callbackRef.current(trimmedTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error);
      let errorMsg = '';

      switch (event.error) {
        case 'network':
          errorMsg = '⚠️ Network error: Cannot connect to speech service.\n\nTry:\n1. Check internet connection\n2. Disable VPN/Proxy if active\n3. Check firewall settings\n4. Try a different browser (Chrome works best)';
          break;
        case 'no-speech':
          errorMsg = '⚠️ No speech detected. Please speak louder and try again.';
          break;
        case 'audio-capture':
          errorMsg = '⚠️ Microphone not found or not permitted.\n\nCheck browser microphone permissions.';
          break;
        case 'service-not-allowed':
          errorMsg = '⚠️ Speech recognition service not allowed by browser.';
          break;
        default:
          errorMsg = `⚠️ Error: ${event.error}`;
      }

      alert(errorMsg);
    };

    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
    }
  };

  if (!isSupported) {
    return null; // Don't show button if not supported
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      className={`mic-button ${isListening ? 'listening' : ''}`}
      title={isListening ? 'Stop listening' : 'Start voice input'}
      aria-label="Microphone"
    >
      <span className="mic-icon">
        {isListening ? '🎙️' : '🎤'}
      </span>
      {isListening && (
        <span className="listening-indicator">
          <span className="pulse"></span>
        </span>
      )}
    </button>
  );
};

export default MicrophoneButton;
