"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Chip,
  InputAdornment,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import PageContainer from "@/components/container/PageContainer";
import {
  AttachFile,
  Send,
  History,
  Star,
  NorthEast,
  SmartToy,
  Science,
  Insights,
  QuestionAnswer,
  Biotech,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import copilotService, { Trial, TrialFile } from "@/services/copilot/copilot-service";
import { addStoredSession } from "@/utils/sessionStorage";
import VoiceInput from "@/components/common/VoiceInput";

const CoPilotPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  // Trial state
  const [trials, setTrials] = useState<Trial[]>([]);
  const [selectedTrial, setSelectedTrial] = useState<string | null>(null);
  const [isLoadingTrials, setIsLoadingTrials] = useState(false);
  const [selectedTrialFileCount, setSelectedTrialFileCount] = useState<number>(0);

  // Bronze S3 file paths for selected trial
  const [bronzeFilePaths, setBronzeFilePaths] = useState<string[]>([]);

  const suggestedPrompts = [
    "Show me data visuals",
    "Run data statistics",
    "Describe the data content",
    "Identify data trends",
  ];

  const cards = [
    {
      icon: Insights,
      title: "Insights",
      description: "Get AI-powered insights from your clinical data",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
    {
      icon: QuestionAnswer,
      title: "Smart Questions",
      description: "Let AI guide your research with intelligent queries",
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    },
    {
      icon: Biotech,
      title: "Clinical Evidence",
      description: "Find relevant clinical evidence and references",
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    },
  ];

  // Fetch available trials on mount
  useEffect(() => {
    const fetchTrials = async () => {
      setIsLoadingTrials(true);
      try {
        const response = await copilotService.listTrials();
        console.log("[Copilot] Trials API response:", response);
        setTrials(response.trials || []);
      } catch (err) {
        console.error("Error fetching trials:", err);
        // Don't show error to user - trials are optional
      } finally {
        setIsLoadingTrials(false);
      }
    };

    fetchTrials();
  }, []);

  // Handle trial selection change
  const handleTrialChange = async (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    const trialName = value === "" ? null : value;
    setSelectedTrial(trialName);
    // Reset session and file when trial changes
    setCurrentSessionId(null);
    setSelectedFile(null);
    setSelectedTrialFileCount(0);
    setBronzeFilePaths([]);

    // Fetch bronze files for selected trial
    if (trialName) {
      try {
        const files = await copilotService.listTrialFiles(trialName);
        console.log("[Copilot] Bronze files for trial:", files);
        setSelectedTrialFileCount(files?.length || 0);

        // Extract S3 keys from trial files
        const filePaths = files?.map((f: TrialFile) => f.file_name) || [];
        setBronzeFilePaths(filePaths);
        console.log("[Copilot] File names set:", filePaths);
      } catch (err) {
        console.error("Error fetching trial files:", err);
        // Fall back to s3_files from trial list
        const trial = trials.find((t) => t.name === trialName);
        setSelectedTrialFileCount(trial?.s3_files || 0);
        setBronzeFilePaths([]);
      }
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    
    if (
      !validTypes.includes(file.type) &&
      !file.name.endsWith(".csv") &&
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls")
    ) {
      setError("Please upload a CSV or Excel file");
      setShowError(true);
      return;
    }

    setSelectedFile(file);
    setIsUploading(true);

    try {
      let sessionId = currentSessionId;

      if (!sessionId) {
        const orgId = (session?.user as any)?.orgId ?? "";
        const userId = session?.user?.email ?? null;
        const response = await copilotService.createSession(orgId, userId, selectedTrial);

        sessionId = response.session_id;
        setCurrentSessionId(sessionId);

        addStoredSession({
          session_id: response.session_id,
          user_id: response.user_id,
          created_at: response.created_at,
          title: selectedTrial ? `Trial: ${selectedTrial}` : "New Conversation",
        });
      }

      await copilotService.uploadFile(sessionId, file);
    } catch (err: any) {
      setError(err.message || "File upload failed");
      setShowError(true);
      setSelectedFile(null);
      setCurrentSessionId(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !selectedFile && !selectedTrial) return;

    setIsLoading(true);

    try {
      let sessionId = currentSessionId;

      if (!sessionId) {
        const orgId = (session?.user as any)?.orgId ?? "";
        const userId = session?.user?.email ?? null;
        const response = await copilotService.createSession(orgId, userId, selectedTrial);

        sessionId = response.session_id;
        setCurrentSessionId(sessionId);

        const title = selectedTrial
          ? `Trial: ${selectedTrial}`
          : inputValue.length > 60
            ? inputValue.substring(0, 60) + "..."
            : inputValue;

        addStoredSession({
          session_id: response.session_id,
          user_id: response.user_id,
          created_at: response.created_at,
          title,
        });
      }

      await copilotService.analyze({
        session_id: sessionId,
        message: inputValue,
        trial_name: selectedTrial,
        file_paths: bronzeFilePaths.length > 0 ? bronzeFilePaths : null,
      });

      router.push(`/copilot/history/${sessionId}`);
    } catch (err: any) {
      setError(err.message || "Failed to send message");
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer
      title="AI Research Co-Pilot"
      description="AI-powered research assistant for clinical insights"
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
          height: "calc(100vh - 64px)",
          maxHeight: "calc(100vh - 64px)",
          overflow: "hidden",
          boxSizing: "border-box",
          bgcolor: "#fafbfc",
        }}
      >
        {/* Robot Icon */}
        <Box
          sx={{
            width: { xs: 56, sm: 64 },
            height: { xs: 56, sm: 64 },
            borderRadius: "16px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: { xs: 2, sm: 2.5 },
            flexShrink: 0,
            boxShadow: "0 4px 20px rgba(102, 126, 234, 0.4)",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)",
              borderRadius: "16px",
            },
          }}
        >
          <SmartToy
            sx={{
              fontSize: { xs: 32, sm: 36 },
              color: "white",
              position: "relative",
              zIndex: 1,
            }}
          />
        </Box>

        {/* Main Text */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 400,
            textAlign: "center",
            color: "text.secondary",
            mb: 0.5,
            fontSize: { xs: "1rem", sm: "1.1rem" },
          }}
        >
          I'm your{" "}
          <Box
            component="span"
            sx={{
              fontWeight: 700,
              background: "linear-gradient(90deg, #10b981 0%, #3b82f6 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Clinical Co-Pilot
          </Box>.
        </Typography>

        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            textAlign: "center",
            color: "text.primary",
            mb: 1,
            fontSize: { xs: "1.5rem", sm: "2rem" },
          }}
        >
          How can we{" "}
          <Box
            component="span"
            sx={{
              background: "linear-gradient(90deg, #10b981 0%, #3b82f6 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            assist
          </Box>{" "}
          you today?
        </Typography>

        <Typography
          variant="body2"
          sx={{
            textAlign: "center",
            color: "text.secondary",
            mb: { xs: 1.5, sm: 2 },
            fontSize: { xs: "0.85rem", sm: "0.95rem" },
          }}
        >
          Ask questions and get AI-powered clinical insights
        </Typography>

        {/* History / Starred */}
        <Box sx={{ display: "flex", gap: 1.5, mb: { xs: 2, sm: 3 }, flexShrink: 0 }}>
          <Link href="/copilot/history" passHref legacyBehavior>
            <Button
              size="small"
              variant="outlined"
              startIcon={<History sx={{ fontSize: 18, color: "#6b7280" }} />}
              component="a"
              sx={{
                textTransform: "none",
                borderRadius: "20px",
                px: 2.5,
                py: 0.75,
                fontSize: "14px",
                fontWeight: 500,
                borderColor: "#e5e7eb",
                color: "text.primary",
                bgcolor: "white",
                "&:hover": {
                  borderColor: "#d1d5db",
                  bgcolor: "#f9fafb",
                },
              }}
            >
              History
            </Button>
          </Link>

          <Link href="/copilot/history?starred=true" passHref legacyBehavior>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Star sx={{ fontSize: 18, color: "#f59e0b" }} />}
              component="a"
              sx={{
                textTransform: "none",
                borderRadius: "20px",
                px: 2.5,
                py: 0.75,
                fontSize: "14px",
                fontWeight: 500,
                borderColor: "#e5e7eb",
                color: "text.primary",
                bgcolor: "white",
                "&:hover": {
                  borderColor: "#d1d5db",
                  bgcolor: "#f9fafb",
                },
              }}
            >
              Starred
            </Button>
          </Link>
        </Box>

        {/* Trial Selector */}
        {(trials.length > 0 || isLoadingTrials) && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              mb: { xs: 2, sm: 3 },
              p: 1.5,
              px: 2,
              bgcolor: "rgba(59, 130, 246, 0.05)",
              borderRadius: "12px",
              border: "1px solid rgba(59, 130, 246, 0.15)",
              flexShrink: 0,
            }}
          >
            <Science sx={{ fontSize: 20, color: "#3b82f6" }} />
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: "text.primary", whiteSpace: "nowrap" }}
            >
              Select Trial:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <Select
                value={selectedTrial || ""}
                onChange={handleTrialChange}
                displayEmpty
                disabled={isLoadingTrials || isLoading || isUploading}
                sx={{
                  bgcolor: "white",
                  borderRadius: "8px",
                  fontSize: "14px",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e5e7eb",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#d1d5db",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#3b82f6",
                  },
                }}
              >
                <MenuItem value="">
                  <em>-- No Trial (Use Uploaded Files) --</em>
                </MenuItem>
                {trials.map((trial) => (
                  <MenuItem key={trial.name} value={trial.name}>
                    {trial.name} ({trial.s3_files} files)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {isLoadingTrials && <CircularProgress size={18} />}
            {selectedTrial && bronzeFilePaths.length > 0 && (
              <Chip
                label={`${bronzeFilePaths.length} files selected`}
                size="small"
                sx={{
                  bgcolor: "#10b981",
                  color: "white",
                  fontWeight: 500,
                  fontSize: "12px",
                }}
              />
            )}
          </Box>
        )}

        {/* Feature Cards */}
        <Box
          sx={{
            display: "flex",
            gap: { xs: 1.5, sm: 2 },
            width: "100%",
            maxWidth: { xs: "100%", sm: 750, md: 900 },
            mb: { xs: 2, sm: 3 },
            flexShrink: 0,
          }}
        >
          {cards.map((card, index) => (
            <Paper
              key={index}
              elevation={0}
              sx={{
                flex: "1",
                p: { xs: 2, sm: 2.5 },
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                bgcolor: "#ffffff",
                cursor: "pointer",
                transition: "all 0.2s ease",
                position: "relative",
                "&:hover": {
                  bgcolor: "#f9fafb",
                  borderColor: "#d1d5db",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                },
              }}
            >

              {/* Arrow */}
              <Box
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <NorthEast sx={{ fontSize: 14, color: "#9ca3af" }} />
              </Box>

              <Typography
                variant="subtitle1"
                sx={{
                  mb: 1,
                  fontSize: { xs: "15px", sm: "17px" },
                  fontWeight: 600,
                  color: "text.primary",
                  pr: 4,
                }}
              >
                {card.title}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: { xs: "12px", sm: "13px" },
                  lineHeight: 1.5,
                }}
              >
                {card.description}
              </Typography>
            </Paper>
          ))}
        </Box>

        {/* Search Box */}
        <Box sx={{ maxWidth: { xs: "100%", sm: 700, md: 850 }, width: "100%", mb: { xs: 2, sm: 3 }, flexShrink: 0 }}>
          {selectedFile && (
            <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                label={isUploading ? `Uploading ${selectedFile.name}...` : selectedFile.name}
                onDelete={isUploading ? undefined : () => {
                  setSelectedFile(null);
                  setCurrentSessionId(null);
                }}
                size="small"
                icon={isUploading ? <CircularProgress size={12} /> : undefined}
                sx={{ bgcolor: "#e0f2fe", color: "#0369a1", height: 28, fontSize: "13px" }}
              />
            </Box>
          )}

          <TextField
            fullWidth
            placeholder="Ask a research question about this analysis..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isLoading}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "28px",
                bgcolor: "#ffffff",
                fontSize: { xs: "14px", sm: "15px" },
                paddingLeft: "20px",
                paddingRight: "8px",
                minHeight: "56px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                "& fieldset": {
                  border: "1px solid #e5e7eb",
                },
                "&:hover fieldset": {
                  borderColor: "#d1d5db",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#3b82f6",
                  borderWidth: "1px",
                },
              },
              "& .MuiOutlinedInput-input": {
                padding: "16px 0",
              },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end" sx={{ gap: 0.5 }}>
                  <IconButton
                    size="small"
                    component="label"
                    disabled={isLoading || isUploading}
                    sx={{
                      p: 1,
                      color: "#9ca3af",
                      "&:hover": {
                        color: "#6b7280",
                      },
                    }}
                  >
                    <AttachFile sx={{ fontSize: 22 }} />
                    <input
                      type="file"
                      hidden
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                    />
                  </IconButton>

                  <VoiceInput
                    onTranscript={(text) => setInputValue((prev) => prev + text)}
                    disabled={isLoading || isUploading}
                  />

                  <IconButton
                    size="small"
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={isLoading || isUploading || (!inputValue.trim() && !selectedFile)}
                    sx={{
                      bgcolor: "#3b82f6",
                      color: "white",
                      width: 40,
                      height: 40,
                      "&:hover": {
                        bgcolor: "#2563eb",
                      },
                      "&.Mui-disabled": {
                        bgcolor: "#e5e7eb",
                        color: "#9ca3af",
                      },
                    }}
                  >
                    {isLoading ? (
                      <CircularProgress size={18} sx={{ color: "white" }} />
                    ) : (
                      <Send sx={{ fontSize: 20 }} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Suggested Prompts */}
        <Box sx={{ maxWidth: { xs: "100%", sm: 700, md: 850 }, width: "100%", flexShrink: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: "text.primary",
              mb: 1.5,
              fontSize: { xs: "13px", sm: "14px" },
            }}
          >
            Suggested prompts:
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            {suggestedPrompts.map((prompt, index) => (
              <Chip
                key={index}
                label={prompt}
                onClick={() => setInputValue(prompt)}
                disabled={isLoading}
                variant="outlined"
                sx={{
                  borderRadius: "20px",
                  bgcolor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  fontSize: { xs: "12px", sm: "13px" },
                  height: { xs: "32px", sm: "36px" },
                  px: 0.5,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: "#f9fafb",
                    borderColor: "#d1d5db",
                  },
                  "& .MuiChip-label": {
                    px: 1.5,
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowError(false)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default CoPilotPage;
