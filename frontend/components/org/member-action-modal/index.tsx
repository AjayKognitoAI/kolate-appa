import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import { IconX } from "@tabler/icons-react";
import { Member } from "../member-table";
import { userManagerService } from "@/services/org-admin/user-manager";
import { toast } from "react-toastify";

// Define action types
export type ActionType = "delete" | "block" | "unblock";

interface ActionConfig {
  title: string;
  description: string;
  confirmText: string;
  buttonText: string;
  buttonColor: string;
  consequences: React.ReactNode;
}

interface MemberActionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (status?: string) => void;
  member?: Member | null;
  actionType: ActionType;
  loading?: boolean;
}

const MemberActionModal: React.FC<MemberActionModalProps> = ({
  open,
  onClose,
  onConfirm,
  member,
  actionType = "delete",
  loading = false,
}) => {
  const [confirmText, setConfirmText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const memberName = member?.name || "this member";

  // Configuration for different action types
  const actionConfigs: Record<ActionType, ActionConfig> = {
    delete: {
      title: "Confirm Member Deletion",
      description: `Are you sure you want to delete ${memberName}?`,
      confirmText: "DELETE",
      buttonText: "Confirm Delete",
      buttonColor: "#B11F26",
      consequences: (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            What Happens After Delete
          </Typography>
          <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
            <li>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                The member will lose all access immediately.
              </Typography>
            </li>
            <li>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Their data may be permanently deleted depending on the delete
                type.
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                This action cannot be undone.
              </Typography>
            </li>
          </ul>
        </>
      ),
    },
    block: {
      title: "Block Member Confirmation",
      description: `Are you sure you want to block ${memberName}?`,
      confirmText: "BLOCK",
      buttonText: "Confirm Block",
      buttonColor: "#B11F26",
      consequences: (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            What Happens After Block
          </Typography>
          <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
            <li>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                The member will see an "Access Denied" message if they try to
                log in.
              </Typography>
            </li>
            <li>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Their user account will remain in the system, but their status
                will be updated to "Blocked."
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                You can unblock them at any time.
              </Typography>
            </li>
          </ul>
        </>
      ),
    },
    unblock: {
      title: "Unblock Member Confirmation",
      description: `Are you sure you want to unblock ${memberName}?`,
      confirmText: "UNBLOCK",
      buttonText: "Confirm Unblock",
      buttonColor: "#0466C8",
      consequences: (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            What Happens After Unblock
          </Typography>
          <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
            <li>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                The member's user account will be fully active.
              </Typography>
            </li>
            <li>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                They can log in immediately.
              </Typography>
            </li>
            <li>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Their status will be updated to "Active."
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Please ensure this member is authorized to regain access to your
                enterprise resources.
              </Typography>
            </li>
          </ul>
        </>
      ),
    },
  };

  const currentConfig = actionConfigs[actionType];
  const isConfirmEnabled = confirmText === currentConfig.confirmText;

  const handleConfirm = async () => {
    if (!isConfirmEnabled || actionLoading) return;
    setActionLoading(true);
    try {
      let updatedStatus = undefined;
      if (actionType === "block" || actionType === "unblock") {
        if (member) {
          await userManagerService.updateUserStatus(
            member.auth0_id || member.id,
            actionType
          );
          updatedStatus = actionType === "block" ? "block" : "active";
        }
      }

      const actionMessages = {
        delete: `${member?.name} has been deleted.`,
        block: `${member?.name} has been blocked.`,
        unblock: `${member?.name} has been unblocked.`,
      };

      toast.success(actionMessages[actionType]);
      onConfirm(updatedStatus); // Pass updated status to parent
      setConfirmText("");
    } catch (e: any) {
      // Optionally show error feedback here
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        },
      }}
    >
      <Box sx={{ position: "absolute", right: 15, top: 15 }}>
        <IconButton onClick={handleClose} size="small">
          <IconX size={20} />
        </IconButton>
      </Box>

      <DialogContent sx={{ pb: 2, pt: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, pb: 2 }}>
          {currentConfig.title}
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          {currentConfig.description}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
          {actionType === "delete"
            ? "This action will remove the member from the platform."
            : actionType === "block"
            ? "Blocking this member will immediately revoke their access to all enterprise resources, including Projects, applications, and communication channels. They will no longer be able to log in or interact with the platform."
            : "Unblocking this member will immediately restore their access to all enterprise resources they were previously authorized to use. They will be able to log in and interact with the platform again."}
        </Typography>

        <Box
          sx={{
            bgcolor: "#F9F5F5",
            p: 2,
            borderRadius: 0,
            mb: 3,
            color: "text.secondary",
          }}
        >
          {currentConfig.consequences}
        </Box>

        <Typography variant="body2" sx={{ mb: 1 }}>
          To confirm, please type {currentConfig.confirmText} in the box below:
        </Typography>
        <TextField
          fullWidth
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={currentConfig.confirmText}
          size="small"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "4px",
            },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={handleClose}
          fullWidth
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!isConfirmEnabled || loading || actionLoading}
          onClick={handleConfirm}
          fullWidth
          sx={{ background: currentConfig.buttonColor }}
        >
          {actionLoading
            ? actionType === "block"
              ? "Blocking..."
              : actionType === "unblock"
              ? "Unblocking..."
              : currentConfig.buttonText
            : currentConfig.buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MemberActionModal;
