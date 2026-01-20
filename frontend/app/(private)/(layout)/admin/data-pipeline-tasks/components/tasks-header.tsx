"use client";

import { Box, Typography, Button, IconButton } from "@mui/material";
import { IconRefresh, IconArrowLeft } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

interface TasksHeaderProps {
  onRefresh?: () => void;
}

const TasksHeader = ({ onRefresh }: TasksHeaderProps) => {
  const router = useRouter();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 3,
        pt: 3,
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
            Data Pipeline Tasks
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Monitor and manage URL download tasks
          </Typography>
        </Box>
      </Box>
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
    </Box>
  );
};

export default TasksHeader;
