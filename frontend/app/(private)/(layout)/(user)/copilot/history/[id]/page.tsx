"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Avatar,
  Stack,
  InputAdornment,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
} from "@mui/material";
import PageContainer from "@/components/container/PageContainer";
import {
  ArrowBack,
  Send,
  AttachFile,
  Psychology,
  Science,
} from "@mui/icons-material";
import { useRouter, useParams } from "next/navigation";
import copilotService, {
  ConversationTurn,
  SessionInfo,
} from "@/services/copilot/copilot-service";
import MarkdownRenderer from "@/components/common/MarkdownRenderer";

const ChatSessionPage = () => {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ConversationTurn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to last message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch session history and details
  useEffect(() => {
    const fetchSessionData = async () => {
      setIsLoading(true);
      try {
        // Fetch history and session details in parallel
        const [history, details] = await Promise.all([
          copilotService.getSessionHistory(sessionId),
          copilotService.getSessionDetails(sessionId).catch(() => null),
        ]);
        setMessages(history);
        if (details) {
          setSessionInfo(details);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load session history");
        setShowError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId) fetchSessionData();
  }, [sessionId]);

  // Send message
  const handleSend = async () => {
    if (!inputValue.trim() && !selectedFile) return;

    // Prevent sending while uploading
    if (isUploading) return;

    setIsSending(true);
    setError(null);

    try {
      // Upload file first if selected
      if (selectedFile) {
        setIsUploading(true);
        await copilotService.uploadFile(sessionId, selectedFile);
        setSelectedFile(null);
        setIsUploading(false);
      }

      // Send message - must have a message to send
      if (inputValue.trim()) {
        await copilotService.analyze({
          session_id: sessionId,
          message: inputValue,
          trial_name: sessionInfo?.trial_name ?? null,
        });

        setInputValue("");

        // Refresh history
        const updatedHistory = await copilotService.getSessionHistory(sessionId);
        setMessages(updatedHistory);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send message");
      setShowError(true);
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  // Format timestamp - Fixed to handle both ISO and non-ISO formats
  const formatTimestamp = (ts: string) => {
    try {
      // Try parsing as-is first
      let date = new Date(ts);
      
      // If invalid, try adding Z
      if (isNaN(date.getTime()) && !ts.endsWith("Z")) {
        date = new Date(ts + "Z");
      }
      
      // If still invalid, return original string
      if (isNaN(date.getTime())) {
        return ts;
      }
      
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return ts;
    }
  };

  // Get session title from first message
  const getSessionTitle = () => {
    const msg = messages.find((m) => m.user_message && m.user_message.trim());
    if (!msg) return `Session ${sessionId.substring(0, 8)}`;
    const t = msg.user_message;
    return t.length <= 70 ? t : t.substring(0, 70) + "...";
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    const valid =
      validTypes.includes(file.type) ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls");

    if (!valid) {
      setError("Please upload a CSV or Excel file");
      setShowError(true);
      return;
    }

    setSelectedFile(file);
  };

  return (
    <PageContainer
      title="Co-Pilot Session"
      description="Chat with the data analysis co-pilot"
    >
      <Box
        sx={{
          position: "fixed",
          top: 70,
          left: { xs: 0, lg: 280 },
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          bgcolor: "#fafbfc",
        }}
      >
        {/* HEADER */}
        <Box
          sx={{
            p: 2,
            bgcolor: "white",
            borderBottom: "1px solid #eee",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography variant="h6" fontWeight={600}>
                {getSessionTitle()}
              </Typography>
              {sessionInfo?.trial_name && (
                <Chip
                  icon={<Science sx={{ fontSize: 16 }} />}
                  label={`Trial: ${sessionInfo.trial_name}`}
                  size="small"
                  sx={{
                    bgcolor: "#10b981",
                    color: "white",
                    fontWeight: 500,
                    fontSize: "12px",
                    "& .MuiChip-icon": {
                      color: "white",
                    },
                  }}
                />
              )}
            </Box>

            <IconButton onClick={() => router.push("/copilot/history")}>
              <ArrowBack />
            </IconButton>
          </Stack>
        </Box>

        {/* CHAT WINDOW */}
        <Paper
          sx={{
            flex: 1,
            m: 2,
            p: 2,
            borderRadius: 2,
            border: "1px solid #e2e2e2",
            overflowY: "auto",
            bgcolor: "white",
          }}
        >
          {isLoading ? (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : messages.length === 0 ? (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Psychology sx={{ fontSize: 60, opacity: 0.3 }} />
              <Typography mt={1}>Start a conversation</Typography>
            </Box>
          ) : (
            messages.map((msg, i) => (
              <div key={i}>
                {/* USER MESSAGE */}
                {msg.user_message && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      mb: 2,
                    }}
                  >
                    <Paper
                      sx={{
                        p: 1.5,
                        bgcolor: "primary.main",
                        color: "white",
                        borderRadius: "12px",
                        maxWidth: "70%",
                      }}
                    >
                      {msg.user_message}
                      <Typography
                        variant="caption"
                        sx={{ opacity: 0.7, display: "block", mt: 1 }}
                      >
                        {formatTimestamp(msg.timestamp)}
                      </Typography>
                    </Paper>
                  </Box>
                )}

                {/* AGENT RESPONSE */}
                {msg.agent_response && (
                  <Box sx={{ display: "flex", mb: 2 }}>
                    <Avatar sx={{ bgcolor: "primary.main", mr: 1 }}>
                      <Psychology sx={{ color: "white" }} />
                    </Avatar>
                    <Paper
                      sx={{
                        p: 1.5,
                        borderRadius: "12px",
                        maxWidth: "80%",
                        border: "1px solid #eee",
                      }}
                    >
                      <MarkdownRenderer content={msg.agent_response} />
                      <Typography
                        variant="caption"
                        sx={{ opacity: 0.7, display: "block", mt: 1 }}
                      >
                        {formatTimestamp(msg.timestamp)}
                      </Typography>
                    </Paper>
                  </Box>
                )}
              </div>
            ))
          )}

          <div ref={messagesEndRef} />
        </Paper>

        {/* INPUT BAR */}
        <Box sx={{ p: 2, bgcolor: "white", borderTop: "1px solid #eee" }}>
          {selectedFile && (
            <Chip
              label={isUploading ? "Uploading..." : selectedFile.name}
              icon={isUploading ? <CircularProgress size={14} /> : undefined}
              onDelete={!isUploading ? () => setSelectedFile(null) : undefined}
              sx={{ mb: 1 }}
            />
          )}

          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            disabled={isUploading}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton component="label" disabled={isUploading || isSending}>
                    <AttachFile />
                    <input
                      type="file"
                      hidden
                      onChange={handleFileSelect}
                      accept=".csv,.xlsx,.xls"
                    />
                  </IconButton>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleSend}
                    disabled={isSending || isUploading || (!inputValue.trim() && !selectedFile)}
                    sx={{ bgcolor: "primary.main", color: "white" }}
                  >
                    {isSending || isUploading ? (
                      <CircularProgress size={20} sx={{ color: "white" }} />
                    ) : (
                      <Send />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>

      {/* ERROR SNACKBAR */}
      <Snackbar
        open={showError}
        autoHideDuration={5000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setShowError(false)}>
          {error}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default ChatSessionPage;