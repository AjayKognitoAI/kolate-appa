import { Box, Button, Stack, Typography } from "@mui/material";
import Image from "next/image";
import ErrorLayout from "@/components/layout/error-layout";
import Link from "next/link";
import { urlWrapper } from "@/utils/url-wrapper";

export default function NotFound() {
  return (
    <ErrorLayout>
      {/* Illustration */}
      <Box sx={{ mb: 4 }}>
        <Image
          src={urlWrapper.background + "404.svg"}
          alt="404 Illustration"
          width={300}
          height={200}
          style={{ objectFit: "contain" }}
        />
      </Box>

      {/* Text */}
      <Typography variant="h4" gutterBottom>
        We couldn’t find that page
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        align="center"
        sx={{ maxWidth: 500 }}
      >
        The page you’re looking for doesn’t exist or might have been removed.
        Double-check the URL, or click the button below to return to the
        homepage.
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
          Go Back Home
        </Button>
      </Stack>
    </ErrorLayout>
  );
}
