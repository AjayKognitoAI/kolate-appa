"use client";
import React, { useState, useEffect, useCallback } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { Mic, MicOff } from "@mui/icons-material";

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      const rec = new SpeechRecognitionAPI();

      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);

      rec.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) onTranscript(transcript);
      };

      rec.onerror = (err) => console.error("Speech error:", err.error);

      setRecognition(rec);
    }

    return () => {
      recognition?.abort();
    };
  }, []);

  const toggle = useCallback(() => {
    if (!recognition) return;
    if (isListening) recognition.stop();
    else recognition.start();
  }, [recognition, isListening]);

  if (!isSupported) {
    return (
      <Tooltip title="Voice input not supported in this browser">
        <span>
          <IconButton size="small" disabled>
            <MicOff />
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={isListening ? "Stop Listening" : "Speak"}>
      <IconButton
        size="small"
        onClick={toggle}
        disabled={disabled}
        sx={{
          color: isListening ? "error.main" : "text.secondary",
          animation: isListening ? "pulse 1.5s infinite" : "none",
          "@keyframes pulse": {
            "0%": { opacity: 1 },
            "50%": { opacity: 0.4 },
            "100%": { opacity: 1 },
          },
        }}
      >
        <Mic />
      </IconButton>
    </Tooltip>
  );
};

export default VoiceInput;
