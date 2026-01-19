"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  TextField,
} from "@mui/material";
import { IconAlertTriangle, IconTrash } from "@tabler/icons-react";
import { trialsService, Trial } from "@/services/admin/trials-service";
import { mlEvaluationAdminService } from "@/services/admin/ml-evaluation-admin-service";
import { toast } from "react-toastify";

interface DeleteTrialModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  trial: Trial;
}

const DeleteTrialModal: React.FC<DeleteTrialModalProps> = ({
  open,
  onClose,
  onSuccess,
  trial,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const isConfirmValid = confirmText.toLowerCase() === "delete";

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Try to delete ML config first (if it exists)
      try {
        await mlEvaluationAdminService.deleteTrialConfig(
          trial.slug,
          trial.module_name
        );
        console.log(`ML configuration deleted for trial "${trial.name}"`);
      } catch (mlConfigErr: any) {
        // If ML config doesn't exist (404), that's okay - continue with trial deletion
        if (mlConfigErr.response?.status === 404) {
          console.log(`No ML configuration found for trial "${trial.name}" - skipping`);
        } else if (mlConfigErr.response?.status === 501 || mlConfigErr.response?.status === 405) {
          // Backend endpoint not implemented yet - warn but continue
          console.warn("ML config deletion endpoint not implemented yet");
        } else {
          // Other errors - log but continue with trial deletion
          console.error("Failed to delete ML config:", mlConfigErr);
          toast.warning("ML configuration could not be deleted. Proceeding with trial deletion.");
        }
      }

      // Step 2: Delete the trial from enterprise-manager
      await trialsService.deleteTrial(trial.id);
      toast.success(`Trial "${trial.name}" deleted successfully`);
      setConfirmText("");
      onSuccess?.();
    } catch (err: any) {
      console.error("Delete trial failed:", err);
      const errorMessage =
        err.response?.data?.message || "Failed to delete trial. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: "center", pt: 3 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box
            sx={{
              bgcolor: "error.lighter",
              borderRadius: "50%",
              p: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconAlertTriangle size={32} color="var(--mui-palette-error-main)" />
          </Box>
          <Typography variant="h6" fontWeight={600}>
            Delete Study
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
          Are you sure you want to delete the study{" "}
          <Typography component="span" fontWeight={600} color="text.primary">
            "{trial.name}"
          </Typography>
          ? This action cannot be undone.
        </Typography>

        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Deleting this trial will remove all associated ML configurations (models, field
            metadata, charts). Enterprises currently using this trial may lose access.
          </Typography>
        </Alert>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Type <strong>delete</strong> to confirm:
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="delete"
            autoComplete="off"
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "grey.50",
              },
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pb: 3, px: 3, gap: 1 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          color="inherit"
          fullWidth
          size="large"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          variant="contained"
          color="error"
          fullWidth
          size="large"
          disabled={loading || !isConfirmValid}
          loading={loading}
          startIcon={<IconTrash size={18} />}
        >
          Delete study
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteTrialModal;
