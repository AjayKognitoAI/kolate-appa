"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Skeleton,
  Alert,
} from "@mui/material";
import { IconX } from "@tabler/icons-react";
import CustomSelect from "@/components/forms/theme-elements/CustomSelect";
import {
  moveUsersAndDeleteRole,
  projectService,
} from "@/services/project/project-service";

interface MoveRoleModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  oldRoleId: string;
  oldRoleName: string;
  onSuccess: () => void;
}

const MoveRoleModal: React.FC<MoveRoleModalProps> = ({
  open,
  onClose,
  projectId,
  oldRoleId,
  oldRoleName,
  onSuccess,
}) => {
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const fetchRoles = async () => {
      setRolesLoading(true);
      try {
        const res = await projectService.getProjectRoles(projectId);
        const options = (res.data || [])
          .filter((role: any) => role.id !== oldRoleId)
          .map((role: any) => ({
            value: role.id,
            label: role.name,
          }));
        setRoles(options);
      } catch (err) {
        setRoles([]);
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRoles();
  }, [open, oldRoleId, projectId]);

  const handleConfirm = async () => {
    if (!selectedRole) {
      setError("Please select a role to move users.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await moveUsersAndDeleteRole(projectId, oldRoleId, selectedRole);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to move users and delete the role."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        },
      }}
    >
      {/* CLOSE BUTTON */}
      <Box sx={{ position: "absolute", right: 15, top: 15 }}>
        <IconButton onClick={onClose} size="small">
          <IconX size={20} />
        </IconButton>
      </Box>

      {/* CONTENT */}
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Move Users & Delete Role
        </Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>
          You are about to delete the role <strong>{oldRoleName}</strong>.
          Please select another role to move all users before deletion.
        </Typography>

        {/* ROLE DROPDOWN */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Select Target Role
          </Typography>
          {rolesLoading ? (
            <Skeleton variant="rounded" width="100%" height={40} />
          ) : roles.length === 0 ? (
            <Alert severity="warning">
              No other roles available. You need to create a new role first.
            </Alert>
          ) : (
            <CustomSelect
              options={roles}
              value={selectedRole}
              onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
                setSelectedRole(e.target.value as string)
              }
              displayEmpty
              placeholder="Select a role"
              fullWidth
            />
          )}
        </Box>

        {/* ERROR MESSAGE */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      {/* FOOTER BUTTONS */}
      <DialogActions sx={{ px: 3, pb: 3, justifyContent: "space-between" }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={onClose}
          sx={{ width: "48%" }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleConfirm}
          disabled={!selectedRole || loading || roles.length === 0}
          sx={{ width: "48%" }}
        >
          {loading ? "Processing..." : "Move & Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MoveRoleModal;
