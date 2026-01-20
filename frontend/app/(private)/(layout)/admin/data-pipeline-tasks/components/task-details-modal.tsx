"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid as Grid,
  Chip,
  LinearProgress,
  Divider,
  Alert,
  IconButton,
} from "@mui/material";
import {
  IconX,
  IconClock,
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconCloudDownload,
  IconDownload,
} from "@tabler/icons-react";
import { TaskResponse, dataPipelineService } from "@/services/data-pipeline/data-pipeline-service";
import { toast } from "react-toastify";

interface TaskDetailsModalProps {
  open: boolean;
  onClose: () => void;
  task: TaskResponse;
  onRefresh: () => void;
}

const TaskDetailsModal = ({ open, onClose, task: initialTask, onRefresh }: TaskDetailsModalProps) => {
  const [task, setTask] = useState<TaskResponse>(initialTask);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  const handleRefreshTask = async () => {
    setLoading(true);
    try {
      const updatedTask = await dataPipelineService.getTaskStatus(task.task_id);
      setTask(updatedTask);
      toast.success("Task status refreshed");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to refresh task");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTask = async () => {
    try {
      await dataPipelineService.cancelTask(task.task_id);
      toast.success("Task cancelled successfully");
      onRefresh();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to cancel task");
    }
  };

  const handleDownloadFile = async () => {
    if (!task.s3_key) {
      toast.error("No S3 key available for download");
      return;
    }

    try {
      toast.info("Preparing download...");
      const blob = await dataPipelineService.downloadFile(task.s3_key);

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Extract filename from s3_key or use dataset name
      const filename = task.s3_key.split("/").pop() || `${task.dataset_name}.csv`;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Download started");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to download file");
    }
  };

  const getStatusColor = (status: string): "default" | "primary" | "success" | "error" | "warning" => {
    switch (status) {
      case "completed":
        return "success";
      case "running":
        return "primary";
      case "failed":
        return "error";
      case "cancelled":
        return "default";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <IconCheck size={20} />;
      case "running":
        return <IconCloudDownload size={20} />;
      case "failed":
        return <IconAlertCircle size={20} />;
      case "pending":
        return <IconClock size={20} />;
      default:
        return <IconClock size={20} />;
    }
  };

  const formatBytes = (bytes: number | null | undefined): string => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "N/A";
    // Ensure UTC dates are properly parsed by appending 'Z' if not present
    const utcDateString = dateString.endsWith("Z") ? dateString : `${dateString}Z`;
    return new Date(utcDateString).toLocaleString();
  };

  const calculateDuration = (): string => {
    if (!task.started_at) return "N/A";
    const startDateString = task.started_at.endsWith("Z") ? task.started_at : `${task.started_at}Z`;
    const start = new Date(startDateString).getTime();
    const endDateString = task.completed_at
      ? (task.completed_at.endsWith("Z") ? task.completed_at : `${task.completed_at}Z`)
      : null;
    const end = endDateString ? new Date(endDateString).getTime() : Date.now();
    const duration = Math.floor((end - start) / 1000);

    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h5" fontWeight="bold">
            Task Details
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton onClick={handleRefreshTask} disabled={loading} size="small">
              <IconRefresh size={20} />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <IconX size={20} />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Status Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            {getStatusIcon(task.status)}
            <Chip
              label={task.status.toUpperCase()}
              color={getStatusColor(task.status)}
              size="medium"
            />
          </Box>

          {/* Progress Bar for Running Tasks */}
          {task.status === "running" && task.progress_percent !== null && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={task.progress_percent}
                sx={{ height: 8, borderRadius: 4, mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {task.progress_percent}% complete
              </Typography>
            </Box>
          )}

          {/* Error Message */}
          {task.status === "failed" && task.error_message && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                Error:
              </Typography>
              <Typography variant="body2">{task.error_message}</Typography>
            </Alert>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Task Information */}
        <Grid container spacing={3}>
          {/* Task ID */}
          <Grid size={12}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Task ID
            </Typography>
            <Typography variant="body1" fontFamily="monospace" fontSize="0.875rem">
              {task.task_id}
            </Typography>
          </Grid>

          {/* Dataset Name */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Dataset Name
            </Typography>
            <Typography variant="body1" fontWeight="500">
              {task.dataset_name}
            </Typography>
          </Grid>

          {/* URL */}
          <Grid size={12}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Download URL
            </Typography>
            <Typography
              variant="body2"
              sx={{
                wordBreak: "break-all",
                bgcolor: "grey.100",
                p: 1.5,
                borderRadius: 1,
              }}
            >
              {task.url}
            </Typography>
          </Grid>

          {/* S3 Key */}
          {task.s3_key && (
            <Grid size={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                S3 Storage Location
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  wordBreak: "break-all",
                  bgcolor: "success.lighter",
                  p: 1.5,
                  borderRadius: 1,
                  color: "success.dark",
                }}
              >
                {task.s3_key}
              </Typography>
            </Grid>
          )}

          {/* Download Size */}
          {task.total_bytes && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Download Size
              </Typography>
              <Typography variant="body1">
                {formatBytes(task.bytes_downloaded)} / {formatBytes(task.total_bytes)}
              </Typography>
            </Grid>
          )}

          {/* Duration */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Duration
            </Typography>
            <Typography variant="body1">{calculateDuration()}</Typography>
          </Grid>

          {/* Created At */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Created At
            </Typography>
            <Typography variant="body2">{formatDate(task.created_at)}</Typography>
          </Grid>

          {/* Started At */}
          {task.started_at && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Started At
              </Typography>
              <Typography variant="body2">{formatDate(task.started_at)}</Typography>
            </Grid>
          )}

          {/* Completed At */}
          {task.completed_at && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Completed At
              </Typography>
              <Typography variant="body2">{formatDate(task.completed_at)}</Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <Box>
            {task.status === "completed" && task.s3_key && (
              <Button
                onClick={handleDownloadFile}
                variant="contained"
                color="primary"
                startIcon={<IconDownload size={18} />}
              >
                Download Dataset
              </Button>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={onClose} variant="outlined">
              Close
            </Button>
            {(task.status === "pending" || task.status === "running") && (
              <Button onClick={handleCancelTask} variant="contained" color="error">
                Cancel Task
              </Button>
            )}
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default TaskDetailsModal;