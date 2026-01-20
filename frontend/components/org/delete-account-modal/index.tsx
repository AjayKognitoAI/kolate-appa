"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Stack,
  Box,
  TextField,
  IconButton,
} from "@mui/material";
import { IconX } from "@tabler/icons-react";
import { orgSettingsService } from "@/services/org-admin/settings";

const REASONS = [
  "Moving to a different platform",
  "Temporarily closing services",
  "Merging with another organization",
  "I am not satisfied with the features or services.",
  "I had issues with technical support.",
  "Cost concerns",
  "Other (please specify)",
];

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  open,
  onClose,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false); // Loader state
  const [error, setError] = useState<string>(""); // Error state

  const handleReasonChange = (reason: string) => {
    setSelectedReason(reason);
    if (reason !== "Other (please specify)") setOtherReason("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    let reason = selectedReason;
    if (selectedReason === "Other (please specify)") {
      reason = otherReason;
    }
    try {
      await orgSettingsService.requestAccountDeletion({
        delete_reason: reason,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to submit deletion request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    setOtherReason("");
    setError("");
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 20, pb: 0 }}></DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ mb: 2 }} fontWeight={600}>
            {submitted
              ? "Account Deletion Request Submitted"
              : "Request Account Deletion"}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <IconX size={18} />
          </IconButton>
        </Box>
        {submitted ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your request has been sent to the kolateAI Admin Team.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              An kolateAI representative will review your request and contact
              you shortly for confirmation and next steps. If you have any
              questions in the meantime, please reach out to your kolateAI
              support contact.
            </Typography>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2, pr: 3 }}
            >
              To proceed with account deletion, we need to understand your
              reasons. This helps us improve our service and address any
              concerns you might have.
            </Typography>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Reason for deletion <span style={{ color: "#E6524B" }}>*</span>
            </Typography>
            <Stack spacing={1}>
              {REASONS.map((reason) => (
                <FormControlLabel
                  key={reason}
                  control={
                    <Checkbox
                      checked={selectedReason === reason}
                      onChange={() => handleReasonChange(reason)}
                      disabled={loading}
                    />
                  }
                  label={reason}
                />
              ))}
              {selectedReason === "Other (please specify)" && (
                <Box sx={{ pl: 4 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Please specify"
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    disabled={loading}
                  />
                </Box>
              )}
            </Stack>
            {error && (
              <Typography color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </form>
        )}
      </DialogContent>
      {!submitted && (
        <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            color="inherit"
            size="large"
            fullWidth
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="error"
            size="large"
            disabled={
              loading ||
              !selectedReason ||
              (selectedReason === "Other (please specify)" && !otherReason)
            }
            type="submit"
            fullWidth
            sx={{ backgroundColor: "#D81D2C" }}
          >
            {loading ? "Submitting..." : "Submit Deletion Request"}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default DeleteAccountModal;
