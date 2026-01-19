"use client";

import userService from "@/services/user/user-services";
import { setAuthorizationHeader } from "@/utils/axios";
import { getUserPath } from "@/utils/getUserPath";
import { Box, CircularProgress } from "@mui/material";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

function getUserInfo(session: any) {
  const user = session?.user || {};
  return {
    auth0_id: user.sub || "",
    organization_id: user.orgId || "",
    first_name: user.firstName || "",
    last_name: user.lastName || "",
    avatar_url: "",
    email: user.email || "",
    mobile: "", // Not present in session
  };
}

export default function Page() {
  const { data: session, status, update } = useSession();
  const [loading, setLoading] = React.useState(true);
  const initialized = React.useRef(false);
  const [loadingMessage, setLoadingMessage] = React.useState<string>(
    "Setting up your profile..."
  );
  const router = useRouter();

  useEffect(() => {
    if (initialized.current) return;
    if (!session) return;
    initialized.current = true; // Set immediately to prevent reruns
    (async () => {
      setAuthorizationHeader(session?.accessToken ?? "");

      const userInfo = getUserInfo(session);
      let fetchedUser = false;
      let userCreted = false;
      try {
        try {
          await userService.getUserByAuth0Id(userInfo.auth0_id);
          fetchedUser = true;
        } catch {
          await userService.createUser(userInfo);
          userCreted = true;
        }

        if (!session?.user?.roles?.length) {
          const newSession = await (
            await fetch("/api/auth/refresh-token")
          ).json();

          if (!newSession?.accessToken) {
            console.error("Failed to refresh session, redirecting to login.");
            await signIn("auth0");
            return;
          }
          const newToken = newSession?.accessToken;
          if (newToken) setAuthorizationHeader(newToken);

          const roles = newSession?.roles;

          await update({
            ...session,
            user: {
              ...session.user,
              roles: roles || [],
              permissions: newSession.permissions || [],
            },
            accessToken: newToken,
            refreshToken: newSession.refreshToken,
            expiresAt: newSession.expiresAt,
          });
          const path = getUserPath(roles);
          router.push(path);
        } else {
          setLoading(false);
        }
      } catch (err) {
        router.push("/error");
      }
    })();
  }, [session, status, initialized]);

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
        <span style={{ color: "#555", fontSize: 16 }}>{loadingMessage}</span>
      </Box>
    </Box>
  );
}
