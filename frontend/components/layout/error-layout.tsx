"use client";

import { Box, Button, Container, Stack, Typography } from "@mui/material";
import Image from "next/image";
import { urlWrapper } from "@/utils/url-wrapper";

export default function ErrorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#f4f6fb",
      }}
    >
      {/* Header */}
      <Container>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ py: 3 }}
        >
          <Image
            src={urlWrapper.images + "logo/kolate-logo.png"}
            alt="logo"
            height={40}
            width={140}
            priority
            style={{ objectFit: "contain" }}
          />
          <form action="/api/auth/logout">
            <Button type="submit" variant="outlined" color="error">
              Logout
            </Button>
          </form>
        </Stack>
      </Container>

      {/* Error Content */}
      <Container
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: 4,
        }}
      >
        {children}
      </Container>
    </Box>
  );
}
