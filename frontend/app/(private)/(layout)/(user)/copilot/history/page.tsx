"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import PageContainer from "@/components/container/PageContainer";
import Header from "@/components/layout/header/Header";
import {
  ArrowBack,
  ChatBubbleOutline,
  Schedule,
  Star,
  StarBorder,
  Delete,
  Add,
  Send,
  AttachFile,
  Mic,
} from "@mui/icons-material";
import { useRouter, useSearchParams } from "next/navigation";
import { TextField, InputAdornment } from "@mui/material";
import {
  getStoredSessions,
  addStoredSession,
  clearStoredSessions,
  toggleSessionStarred,
  removeStoredSession,
  StoredSession,
} from "@/utils/sessionStorage";
import copilotService, { SessionResponse } from "@/services/copilot/copilot-service";
import { useSession } from "next-auth/react";
import Head from "next/head";

interface SessionWithMetadata extends StoredSession {
  messageCount?: number;
}

const CopilotHistoryPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // Chat / sessions state
  const [chatInput, setChatInput] = useState("");
  const [sessions, setSessions] = useState<SessionWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  // Speech recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Get filter from URL
  const starredFilter = searchParams.get("starred") === "true";

  // ----------------------------
  // Web Speech API initialization
  // ----------------------------
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setChatInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop?.();
      } catch {}
      recognitionRef.current = null;
    };
  }, []);

  const handleMicClick = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError("Speech Recognition is not supported in this browser.");
      setShowError(true);
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error("Error starting recognition:", err);
        setError("Failed to start speech recognition.");
        setShowError(true);
      }
    }
  };

  // ----------------------------
  // Load sessions from localStorage
  // ----------------------------
  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true);
      try {
        // Get sessions from localStorage
        let storedSessions = getStoredSessions();

        // Filter by starred if needed
        if (starredFilter) {
          storedSessions = storedSessions.filter((s) => s.starred);
        }

        // Add message counts
        const sessionsWithMetadata = await Promise.all(
          storedSessions.map(async (sess) => {
            try {
              const history = await copilotService.getSessionHistory(sess.session_id);
              return {
                ...sess,
                messageCount: history.length,
              };
            } catch (err) {
              console.error(`Error fetching history for session ${sess.session_id}:`, err);
              return {
                ...sess,
                messageCount: 0,
              };
            }
          })
        );

        setSessions(sessionsWithMetadata);
      } catch (err: any) {
        console.error("Error loading sessions:", err);
        setError("Failed to load sessions");
        setShowError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, [starredFilter]);

  // ----------------------------
  // Actions: star, delete, create session, etc.
  // ----------------------------
  const handleToggleStar = (sessionId: string) => {
    toggleSessionStarred(sessionId);
    
    // Reload sessions to reflect the change
    const updatedSessions = getStoredSessions();
    if (starredFilter) {
      setSessions(updatedSessions.filter((s) => s.starred));
    } else {
      setSessions(updatedSessions);
    }
  };

  const handleDeleteClick = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;

    try {
      // Delete from backend
      await copilotService.deleteSession(sessionToDelete);
      
      // Delete from localStorage
      removeStoredSession(sessionToDelete);
      
      // Update UI
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionToDelete));
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    } catch (err: any) {
      console.error("Error deleting session:", err);
      setError(err?.message || "Failed to delete session");
      setShowError(true);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

  const handleClearAllClick = () => {
    setClearAllDialogOpen(true);
  };

  const handleClearAllConfirm = () => {
    clearStoredSessions();
    setSessions([]);
    setClearAllDialogOpen(false);
  };

  const handleClearAllCancel = () => {
    setClearAllDialogOpen(false);
  };

  const handleStartNewChat = async () => {
    if (!chatInput.trim()) return;

    setIsSending(true);
    setError(null);

    try {
      const orgId = (session?.user as any)?.orgId ?? "";
      const userId = session?.user?.email ?? null;

      // Create a new session
      const sessionResponse = await copilotService.createSession(orgId, userId);
      const sessionId = sessionResponse.session_id;

      // Save session locally
      addStoredSession({
        session_id: sessionResponse.session_id,
        user_id: sessionResponse.user_id,
        created_at: sessionResponse.created_at,
        title: chatInput.length > 60 
          ? chatInput.substring(0, 60) + "..." 
          : chatInput,
        starred: false,
      });

      // Send the message to analyze endpoint
      await copilotService.analyze({
        session_id: sessionId,
        message: chatInput,
      });

      router.push(`/copilot/history/${sessionId}`);
    } catch (err: any) {
      console.error("Error creating session:", err);
      setError(err?.message || "Failed to start conversation");
      setShowError(true);
      setIsSending(false);
    }
  };

  const formatSessionTime = (createdAt: string) => {
    const utcTimestamp = createdAt.endsWith("Z") || createdAt.includes("+") || createdAt.includes("-", 10)
      ? createdAt
      : `${createdAt}Z`;

    const created = new Date(utcTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    const formattedDate = created.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: created.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
    const formattedTime = created.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (diffDays > 7) {
      return `${formattedDate} at ${formattedTime}`;
    }
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    }
    if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    }
    if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    }
    return "Just now";
  };

  return (
    <PageContainer>
      <Head>
        <title>Co-Pilot History</title>
        <meta name="description" content="Your Co-Pilot session history" />
      </Head>
      <Box px={3}>
        <Box mb={3}>
          <Header
            title="Session History"
            subtitle="View and manage your Co-Pilot conversation history"
            rightContent={
              <IconButton
                onClick={() => router.push("/copilot")}
                sx={{
                  border: "1px solid #ececf1",
                  borderRadius: 1,
                }}
              >
                <ArrowBack />
              </IconButton>
            }
          />
        </Box>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 1,
            border: "1px solid #ececf1",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              p: 2,
              bgcolor: "#fafbfc",
              borderBottom: "1px solid #ececf1",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="h6" fontWeight={500}>
                  {starredFilter ? "Starred Sessions" : "Recent Sessions"}
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  value={starredFilter ? "starred" : "all"}
                  exclusive
                  onChange={(_, value) => {
                    if (value === "starred") {
                      router.push("/copilot/history?starred=true");
                    } else if (value === "all") {
                      router.push("/copilot/history");
                    }
                  }}
                  sx={{
                    "& .MuiToggleButton-root": {
                      textTransform: "none",
                      px: 1.5,
                      py: 0.5,
                      fontSize: "12px",
                    },
                  }}
                >
                  <ToggleButton value="all">All</ToggleButton>
                  <ToggleButton value="starred">
                    <Star sx={{ fontSize: 14, mr: 0.5 }} />
                    Starred
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={`${sessions.length} session${sessions.length !== 1 ? "s" : ""}`}
                  size="small"
                  sx={{
                    bgcolor: "primary.light",
                    color: "primary.main",
                    fontWeight: 500,
                  }}
                />
                {sessions.length > 0 && !starredFilter && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={handleClearAllClick}
                    sx={{
                      textTransform: "none",
                      borderRadius: 1,
                      fontSize: "12px",
                    }}
                  >
                    Clear All
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>

          <Box>
            {isLoading ? (
              <Box
                sx={{
                  p: 6,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <CircularProgress />
              </Box>
            ) : sessions.length === 0 ? (
              <Box
                sx={{
                  p: 6,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {starredFilter ? (
                  <>
                    <ChatBubbleOutline
                      sx={{ fontSize: 64, color: "text.secondary", opacity: 0.3, mb: 2 }}
                    />
                    <Typography variant="h6" color="text.secondary" mb={1}>
                      No starred sessions
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Star your favorite conversations to find them easily
                    </Typography>
                  </>
                ) : (
                  <>
                    <ChatBubbleOutline
                      sx={{ fontSize: 64, color: "text.secondary", opacity: 0.3, mb: 2 }}
                    />
                    <Typography variant="h6" color="text.secondary" mb={1}>
                      No conversation history
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Start a new conversation with Co-Pilot to see your history here
                    </Typography>
                  </>
                )}
              </Box>
            ) : (
              sessions.map((sess, index) => (
                <React.Fragment key={sess.session_id}>
                  <Box
                    sx={{
                      p: 2.5,
                      cursor: "pointer",
                      transition: "background 0.2s",
                      "&:hover": {
                        bgcolor: "#f5faff",
                      },
                    }}
                    onClick={() => {
                      router.push(`/copilot/history/${sess.session_id}`);
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          bgcolor: "primary.light",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ChatBubbleOutline
                          sx={{ fontSize: 20, color: "primary.main" }}
                        />
                      </Box>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body1"
                          fontWeight={500}
                          sx={{ mb: 0.5 }}
                        >
                          {sess.title || `Session ${sess.session_id.substring(0, 8)}`}
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Schedule sx={{ fontSize: 16, color: "text.secondary" }} />
                            <Typography variant="body2" color="text.secondary">
                              {formatSessionTime(sess.created_at)}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {sess.messageCount || 0} messages
                          </Typography>
                        </Stack>
                      </Box>

                      <Stack direction="row" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStar(sess.session_id);
                          }}
                        >
                          {sess.starred ? (
                            <Star sx={{ fontSize: 20, color: "warning.main" }} />
                          ) : (
                            <StarBorder sx={{ fontSize: 20 }} />
                          )}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(sess.session_id);
                          }}
                        >
                          <Delete sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Box>
                  {index < sessions.length - 1 && <Divider />}
                </React.Fragment>
              ))
            )}
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            mt: 3,
            borderRadius: 1,
            border: "1px solid #ececf1",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              p: 2,
              bgcolor: "#fafbfc",
              borderBottom: "1px solid #ececf1",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6" fontWeight={500}>
                Start New Conversation
              </Typography>
              <Button
                size="small"
                variant="contained"
                startIcon={<Add />}
                onClick={() => router.push("/copilot")}
                sx={{
                  textTransform: "none",
                  borderRadius: 1,
                  fontWeight: 500,
                }}
              >
                New Chat
              </Button>
            </Stack>
          </Box>

          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Ask a question or start a conversation with Co-Pilot
            </Typography>
            <TextField
              fullWidth
              placeholder="Ask a research question about clinical analysis..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey && chatInput.trim() && !isSending) {
                  e.preventDefault();
                  handleStartNewChat();
                }
              }}
              disabled={isSending}
              multiline
              maxRows={3}
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1,
                  bgcolor: "#ffffff",
                  "& fieldset": {
                    border: "1px solid #ececf1",
                  },
                  "&:hover fieldset": {
                    borderColor: "primary.light",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "primary.main",
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton size="small" edge="start" disabled={isSending}>
                      <AttachFile
                        sx={{ fontSize: 20, color: "text.secondary" }}
                      />
                    </IconButton>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        size="small"
                        onClick={handleMicClick}
                        disabled={isSending}
                        sx={{
                          color: isListening ? "error.main" : "text.secondary",
                        }}
                      >
                        <Mic sx={{ fontSize: 20 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={handleStartNewChat}
                        disabled={!chatInput.trim() || isSending}
                        sx={{
                          color: chatInput.trim() && !isSending ? "primary.main" : "text.secondary",
                        }}
                      >
                        {isSending ? (
                          <CircularProgress size={20} />
                        ) : (
                          <Send sx={{ fontSize: 20 }} />
                        )}
                      </IconButton>
                    </Stack>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Paper>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          aria-labelledby="delete-dialog-title"
        >
          <DialogTitle id="delete-dialog-title">Delete Session?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this session? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" autoFocus>
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Clear All Confirmation Dialog */}
        <Dialog
          open={clearAllDialogOpen}
          onClose={handleClearAllCancel}
          aria-labelledby="clear-all-dialog-title"
        >
          <DialogTitle id="clear-all-dialog-title">Clear All Sessions?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to clear all sessions? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClearAllCancel}>Cancel</Button>
            <Button onClick={handleClearAllConfirm} color="error" autoFocus>
              Clear All
            </Button>
          </DialogActions>
        </Dialog>

        {/* Error Snackbar */}
        <Snackbar
          open={showError}
          autoHideDuration={6000}
          onClose={() => setShowError(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setShowError(false)}
            severity="error"
            sx={{ width: "100%" }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </PageContainer>
  );
};

export default CopilotHistoryPage;