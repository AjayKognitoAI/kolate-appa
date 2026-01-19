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
  Avatar,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { IconX } from "@tabler/icons-react";
import CustomSelect from "@/components/forms/theme-elements/CustomSelect";
import { Member } from "../member-table";
import userManagerService from "@/services/org-admin/user-manager";
import Skeleton from "@mui/material/Skeleton";

interface MemberRoleModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newRole: string) => void;
  member?: Member;
  loading?: boolean;
}

const MemberRoleModal: React.FC<MemberRoleModalProps> = ({
  open,
  onClose,
  onConfirm,
  member,
  loading = false,
}) => {
  const [selectedRole, setSelectedRole] = useState("");
  const [roleOptions, setRoleOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch roles on mount
    const fetchRoles = async () => {
      setRolesLoading(true);
      try {
        const res = await userManagerService.getUserRoles();
        // Assuming API returns an array of roles with id and name
        const options = (res.data || []).map((role: any) => ({
          value: role.id,
          label: (role?.name ?? "")?.toString()?.replace("org:", ""),
        }));
        setRoleOptions(options);
      } catch (err) {
        setRoleOptions([]);
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRoles();
  }, []);

  // Reset selected role when modal opens with a new member
  React.useEffect(() => {
    if (open && member) {
      setSelectedRole(member.role || "");
    }
  }, [open, member]);

  const handleConfirm = async () => {
    if (selectedRole && member) {
      setError(null);
      setSuccess(null);
      try {
        await userManagerService.updateUserRole(
          member.auth0_id ?? "",
          selectedRole
        );
        setSuccess("Role updated successfully.");
        onConfirm(selectedRole);
      } catch (error: any) {
        setError(
          error?.response?.data?.message ||
            "Failed to update role. Please try again."
        );
      }
    }
  };

  if (!member) return null;

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
      <Box sx={{ position: "absolute", right: 15, top: 15 }}>
        <IconButton onClick={onClose} size="small">
          <IconX size={20} />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Change Member Role
        </Typography>

        <Typography variant="body2" sx={{ mb: 3 }}>
          Change Role for {member.name}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <Avatar
            src={member.avatar_url}
            alt={member.name}
            sx={{ width: 40, height: 40, mr: 2 }}
          />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
              {member.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {member.email}
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
          You are about to change the role of {member.name} from {member.role}{" "}
          to a new role. Changing a member's role will modify their permissions
          and access levels across the enterprise.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Select New Role
          </Typography>
          {rolesLoading ? (
            <Skeleton variant="rounded" width="100%" height={40} />
          ) : (
            <CustomSelect
              options={roleOptions}
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

        {success && (
          <Box sx={{ mb: 2 }}>
            <Typography color="success.main">{success}</Typography>
          </Box>
        )}
        {error && error.trim() !== "" && (
          <Box sx={{ mb: 2 }}>
            <Typography color="error.main">{error}</Typography>
          </Box>
        )}
      </DialogContent>

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
          disabled={!selectedRole || loading}
          sx={{ width: "48%" }}
        >
          Change Role
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MemberRoleModal;
