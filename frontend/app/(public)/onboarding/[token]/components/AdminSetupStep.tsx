"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Box, Typography, Stack, Button } from "@mui/material";
import { IconUser } from "@tabler/icons-react";

import CustomTextField from "@/components/forms/theme-elements/CustomTextField";
import { useOnboarding, AdminInfoData } from "@/context/OnboardingContext";

const schema = yup.object({
  firstName: yup.string().required("First name is required"),
  lastName: yup.string().required("Last name is required"),
  jobTitle: yup.string().default(""),
  phone: yup.string().default(""),
});

interface AdminSetupStepProps {
  onComplete: (data?: Record<string, any>) => void;
}

export default function AdminSetupStep({ onComplete }: AdminSetupStepProps) {
  const { state, setAdminInfo } = useOnboarding();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminInfoData>({
    resolver: yupResolver(schema),
    defaultValues: {
      firstName: state.adminInfo?.firstName || "",
      lastName: state.adminInfo?.lastName || "",
      jobTitle: state.adminInfo?.jobTitle || "",
      phone: state.adminInfo?.phone || "",
    },
  });

  const onSubmit = (data: AdminInfoData) => {
    setAdminInfo(data);
    onComplete({
      admin_first_name: data.firstName,
      admin_last_name: data.lastName,
      admin_job_title: data.jobTitle,
      admin_phone: data.phone,
    });
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <IconUser size={28} />
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Admin Account Setup
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Set up your administrator profile for {state.adminEmail}
          </Typography>
        </Box>
      </Box>

      <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={3}>
        <Box sx={{ display: "flex", gap: 2 }}>
          <CustomTextField
            customLabel="First Name *"
            {...register("firstName")}
            error={!!errors.firstName}
            helperText={errors.firstName?.message}
            placeholder="John"
            fullWidth
          />

          <CustomTextField
            customLabel="Last Name *"
            {...register("lastName")}
            error={!!errors.lastName}
            helperText={errors.lastName?.message}
            placeholder="Doe"
            fullWidth
          />
        </Box>

        <CustomTextField
          customLabel="Job Title"
          {...register("jobTitle")}
          error={!!errors.jobTitle}
          helperText={errors.jobTitle?.message}
          placeholder="Chief Technology Officer"
          fullWidth
        />

        <CustomTextField
          customLabel="Phone Number"
          {...register("phone")}
          error={!!errors.phone}
          helperText={errors.phone?.message}
          placeholder="+1 (555) 123-4567"
          fullWidth
        />

        <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 2 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={state.isLoading}
          >
            Continue
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
