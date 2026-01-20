"use client";
import { Box, Button, Stack, Typography } from "@mui/material";
import Image from "next/image";
import ErrorLayout from "@/components/layout/error-layout";
import Link from "next/link";
import { urlWrapper } from "@/utils/url-wrapper";

export default function ErrorPage() {
  return (
    <ErrorLayout>
      {/* Illustration */}
      <Box sx={{ mb: 4 }}>
        <Image
          src={urlWrapper.background + "error.svg"} // Add an SVG or image in your public folder
          alt="Error Illustration"
          width={300}
          height={200}
          style={{ objectFit: "contain" }}
        />
      </Box>

      {/* Text */}
      <Typography variant="h4" gutterBottom>
        Oops, something went wrong.
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        align="center"
        sx={{ maxWidth: 500 }}
      >
        We're sorry! An unexpected error has occurred. Our team has been
        notified, and we're working on it.
      </Typography>

      {/* Actions */}
      <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
        <Button
          component={Link}
          href="/"
          variant="outlined"
          color="primary"
          sx={{ mt: 2, px: 6 }}
        >
          Try Again
        </Button>
      </Stack>
    </ErrorLayout>
  );
}
