"use client";
import React, { useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { signIn, useSession } from "next-auth/react";
import { setAuthorizationHeader } from "@/utils/axios";

const Loader = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const [loading, setLoading] = React.useState(true);
  const initialized = React.useRef(false);
  const [loadingMessage, setLoadingMessage] =
    React.useState<string>("Getting Started...");

  useEffect(() => {
    if (initialized.current) return;
    if (status === "loading") return;
    initialized.current = true; // Set immediately to prevent reruns
    (async () => {
      if (status === "unauthenticated") {
        setLoadingMessage("Taking you to sign in...");
        await signIn("auth0");
      } else if (status === "authenticated") {
        setAuthorizationHeader(session?.accessToken ?? "");
        setLoading(false); // Set loading to false immediately
      }
    })();
  }, [session, status]);

  return loading ? (
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
        <span style={{ color: "#555", fontSize: 16 }}>{loadingMessage}</span>
      </Box>
    </Box>
  ) : (
    children
  );
};

export default Loader;
