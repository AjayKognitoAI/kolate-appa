"use client"

import { Backdrop, CircularProgress, Box, Typography, Paper } from "@mui/material"

interface LoadingOverlayProps {
  open: boolean
  message?: string
}

/**
 * LoadingOverlay Component
 *
 * Displays a fullscreen overlay with a spinner and optional message
 * Used during data loading and validation operations
 */
export function LoadingOverlay({ open, message = "Loading..." }: LoadingOverlayProps) {
  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(4px)",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2.5,
          px: 5,
          py: 4,
          borderRadius: 3,
          background: "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
          border: "1px solid rgba(102, 126, 234, 0.2)",
        }}
      >
        <Box
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress
            size={56}
            thickness={4}
            sx={{
              color: "#667eea",
              "& .MuiCircularProgress-circle": {
                strokeLinecap: "round",
              },
            }}
          />
          <Box
            sx={{
              position: "absolute",
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)",
              animation: "pulse 2s ease-in-out infinite",
              "@keyframes pulse": {
                "0%, 100%": {
                  opacity: 0.4,
                  transform: "scale(1)",
                },
                "50%": {
                  opacity: 0.8,
                  transform: "scale(1.1)",
                },
              },
            }}
          />
        </Box>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            color: "#1a1a2e",
            letterSpacing: "0.01em",
          }}
        >
          {message}
        </Typography>
      </Paper>
    </Backdrop>
  )
}
