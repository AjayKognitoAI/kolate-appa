import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Skeleton,
} from "@mui/material";
import CustomTextField from "@/components/forms/theme-elements/CustomTextField";
import CustomFormLabel from "@/components/forms/theme-elements/CustomFormLabel";
import { IconSend, IconX } from "@tabler/icons-react";
import { toast } from "react-toastify";
import CustomSelect from "@/components/forms/theme-elements/CustomSelect";
import { userManagerService } from "@/services/org-admin/user-manager";
import { useSession } from "next-auth/react";
import { updateOnboardingProgress } from "@/services/org-admin/enterprise-setup";

interface InviteFormValues {
  email: string;
  role: string;
}

const schema = yup.object({
  email: yup
    .string()
    .email("Enter a valid email address")
    .required("Email address is required"),
  role: yup.string().required("Role is required"),
});

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
}

const MemberInviteModal: React.FC<InviteModalProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const { data: session } = useSession();

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
        setRoles(options);
      } catch (err) {
        setRoles([]);
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRoles();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<InviteFormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: "",
      role: "",
    },
  });

  useEffect(() => {
    // Reset form and error state when modal opens
    if (open) {
      reset({
        email: "",
        role: "",
      });
      setError(null);
    }
  }, [open, reset]);

  const onSubmit = async (data: InviteFormValues) => {
    setLoading(true);
    setError(null);
    try {
      await userManagerService.inviteUser({
        inviter_name: `${session?.user?.firstName || ""} ${
          session?.user?.lastName || ""
        }`.trim(),
        invitee_email: data.email,
        role_id: data.role,
      });
      toast.success("Invitation sent successfully!", {
        icon: <IconSend size={18} color="var(--primary-700)" />,
      });
      reset();
      onSave ? onSave() : onClose();
      updateOnboardingProgress("INVITED_MEMBER");
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        "Failed to send invitation. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          position: "relative",
          fontWeight: 600,
          fontSize: 18,
          pt: 3,
        }}
      >
        Invite Team Members
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
          }}
        >
          <IconX size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <p
          style={{
            margin: "0 0 20px",
            color: "rgba(0, 0, 0, 0.6)",
          }}
        >
          Add team members to collaborate in your organization.
        </p>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={3}>
          <div>
            <CustomFormLabel htmlFor="email">Email ID *</CustomFormLabel>
            <CustomTextField
              id="email"
              {...register("email")}
              error={!!errors.email}
              helperText={errors.email?.message}
              placeholder="Enter email address"
              autoFocus
              fullWidth
            />
          </div>

          <div>
            {rolesLoading ? (
              <Skeleton variant="rounded" width="100%" height={40} />
            ) : (
              <CustomSelect
                customLabel="Role"
                options={roles}
                defaultValue=""
                displayEmpty
                error={!!errors.role}
                helperText={errors.role?.message}
                placeholder="Select role"
                {...register("role")}
              />
            )}
          </div>
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{ justifyContent: "space-between", pb: 3, px: 3, pt: 5 }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          size="large"
          disabled={loading}
          sx={{ width: "48%" }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          color="primary"
          size="large"
          disabled={loading}
          sx={{ width: "48%" }}
        >
          Send Invitation
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MemberInviteModal;
