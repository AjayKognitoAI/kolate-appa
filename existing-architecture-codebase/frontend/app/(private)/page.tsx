"use client";
import { Box, CircularProgress } from "@mui/material";
import { signIn } from "next-auth/react";
import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    (async () => {
      await signIn("auth0");
    })();
  }, []);

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgba(255,255,255,0.8)",
        zIndex: 1300,
        flexDirection: "column",
      }}
    >
      <CircularProgress size={24} />
      <Box mt={2}>
        <span style={{ color: "#555", fontSize: 16 }}>
          {"Taking you to sign in..."}
        </span>
      </Box>
    </Box>
  );
}
