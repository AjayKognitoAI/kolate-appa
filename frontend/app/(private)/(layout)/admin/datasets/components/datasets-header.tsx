"use client";

import { Box, Typography, Button, IconButton } from "@mui/material";
import { IconRefresh, IconUpload, IconArrowLeft } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

interface DatasetsHeaderProps {
  onRefresh?: () => void;
}

const DatasetsHeader = ({ onRefresh }: DatasetsHeaderProps) => {
  const router = useRouter();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 3,
        pt: 3,
        flexWrap: "wrap",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton
          onClick={() => router.push("/admin/data-pipeline")}
          size="small"
          sx={{
            bgcolor: "grey.100",
            "&:hover": { bgcolor: "grey.200" }
          }}
        >
          <IconArrowLeft size={20} />
        </IconButton>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Datasets
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Browse and manage your uploaded datasets from S3 storage
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", gap: 2 }}>
        {onRefresh && (
          <Button
            variant="outlined"
            startIcon={<IconRefresh size={18} />}
            onClick={onRefresh}
            size="small"
          >
            Refresh
          </Button>
        )}
        <Button
          variant="contained"
          startIcon={<IconUpload size={18} />}
          onClick={() => router.push("/admin/data-pipeline")}
          size="small"
        >
          Upload New
        </Button>
      </Box>
    </Box>
  );
};

export default DatasetsHeader;
