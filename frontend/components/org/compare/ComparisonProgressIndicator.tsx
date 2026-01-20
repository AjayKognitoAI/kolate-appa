"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  Stack,
  Button,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";

interface ComparisonProgressIndicatorProps {
  open: boolean;
  currentStep: number;
  totalSteps: number;
  message: string;
  onCancel?: () => void;
}

const STEP_LABELS = [
  "Filtering patients",
  "Analyzing comparator",
  "Analyzing target",
  "Generating results",
];

const ComparisonProgressIndicator: React.FC<ComparisonProgressIndicatorProps> = ({
  open,
  currentStep,
  totalSteps,
  message,
  onCancel,
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogContent>
        <Box sx={{ textAlign: "center", py: 2 }}>
          {/* Animated Icon */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--indigo-100) 0%, var(--indigo-200) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 3,
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                border: "3px solid var(--indigo-400)",
                borderTopColor: "transparent",
                animation: "spin 1s linear infinite",
              },
              "@keyframes spin": {
                "0%": { transform: "rotate(0deg)" },
                "100%": { transform: "rotate(360deg)" },
              },
            }}
          >
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{ color: "var(--indigo-700)" }}
            >
              {Math.round(progress)}%
            </Typography>
          </Box>

          <Typography variant="h6" fontWeight={600} mb={1}>
            Running Comparison
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {message}
          </Typography>

          {/* Stepper */}
          <Stepper activeStep={currentStep - 1} alternativeLabel sx={{ mb: 3 }}>
            {STEP_LABELS.map((label, index) => (
              <Step key={label} completed={index < currentStep - 1}>
                <StepLabel
                  sx={{
                    "& .MuiStepLabel-label": {
                      fontSize: 12,
                    },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Progress Bar */}
          <Box sx={{ px: 2, mb: 3 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: "var(--gray-100)",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 4,
                  background:
                    "linear-gradient(90deg, var(--indigo-500) 0%, var(--indigo-600) 100%)",
                },
              }}
            />
          </Box>

          {/* Cancel Button */}
          {onCancel && (
            <Button variant="outlined" color="inherit" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ComparisonProgressIndicator;
