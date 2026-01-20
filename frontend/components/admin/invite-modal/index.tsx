import React, { use, useEffect, useState } from "react";
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
} from "@mui/material";
import CustomTextField from "@/components/forms/theme-elements/CustomTextField";
import {
  enterpriseService,
  EnterpriseInviteRequest,
} from "@/services/admin/enterprises-service";
import { IconCheck, IconSend } from "@tabler/icons-react";
import { toast } from "react-toastify";

interface InviteFormValues {
  enterpriseName: string;
  email: string;
  website: string;
}

const schema = yup.object({
  enterpriseName: yup.string().required("Enterprise Name is required"),
  email: yup
    .string()
    .email("Enter a valid email")
    .required("Email is required"),
  website: yup
    .string()
    .url("Enter a valid URL")
    .required("Website is required"),
});

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

const InviteModal: React.FC<InviteModalProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InviteFormValues>({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    // Reset form and error state when modal opens
    if (open) {
      reset();
      setError(null);
    }
  }, [open, reset]);

  const onSubmit = async (data: InviteFormValues) => {
    setLoading(true);
    setError(null);

    try {
      // Transform form data to match API request format
      const inviteData: EnterpriseInviteRequest = {
        enterprise_name: data.enterpriseName,
        admin_email: data.email,
        enterprise_url: data.website,
      };

      // Call the API to invite the enterprise
      const response = await enterpriseService.inviteEnterprise(inviteData);

      // Show success toast

      toast.success("Invite sent successfully.", {
        icon: <IconSend size={18} color="var(--primary-700)" />,
      });

      reset();

      // Close modal
      onClose();
    } catch (err: any) {
      // Handle error
      console.error("Enterprise invitation failed:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Failed to invite enterprise. Please try again.";

      // Set local error for display in the form
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{ textAlign: "center", fontWeight: 600, fontSize: 16, pt: 3 }}
      >
        Add Enterprise
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={2}>
          <CustomTextField
            customLabel="Enterprise Name"
            {...register("enterpriseName")}
            error={!!errors.enterpriseName}
            helperText={errors.enterpriseName?.message}
            placeholder="MediCure Labs"
            autoFocus
            fullWidth
          />
          <CustomTextField
            customLabel="Email ID"
            {...register("email")}
            error={!!errors.email}
            helperText={errors.email?.message}
            placeholder="olivia@mediCurelabs.io"
            type="email"
            fullWidth
          />
          <CustomTextField
            customLabel="Website"
            {...register("website")}
            error={!!errors.website}
            helperText={errors.website?.message}
            placeholder="www.mediCurelabs.io"
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", pb: 3, px: 3 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          fullWidth
          size="large"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          disabled={loading}
          loading={loading}
        >
          Send Invitation
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteModal;
