"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Box,
  Typography,
  Stack,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import { IconLock, IconInfoCircle } from "@tabler/icons-react";

import CustomTextField from "@/components/forms/theme-elements/CustomTextField";
import { useOnboarding, SSOConfigData } from "@/context/OnboardingContext";

const schema = yup.object({
  enabled: yup.boolean().default(false),
  provider: yup.string().when("enabled", {
    is: true,
    then: (schema) => schema.required("Provider is required"),
    otherwise: (schema) => schema.default(""),
  }),
  domain: yup.string().when("enabled", {
    is: true,
    then: (schema) => schema.required("Domain is required"),
    otherwise: (schema) => schema.default(""),
  }),
  clientId: yup.string().default(""),
  clientSecret: yup.string().default(""),
  metadataUrl: yup.string().url("Enter a valid URL").default(""),
});

interface SSOConfigStepProps {
  onComplete: (data?: Record<string, any>) => void;
}

const ssoProviders = [
  { value: "saml", label: "SAML 2.0" },
  { value: "oidc", label: "OpenID Connect (OIDC)" },
  { value: "azure-ad", label: "Azure Active Directory" },
  { value: "okta", label: "Okta" },
  { value: "google", label: "Google Workspace" },
];

export default function SSOConfigStep({ onComplete }: SSOConfigStepProps) {
  const { state, setSsoConfig } = useOnboarding();
  const [ssoEnabled, setSsoEnabled] = useState(state.ssoConfig?.enabled || false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<SSOConfigData>({
    resolver: yupResolver(schema),
    defaultValues: {
      enabled: state.ssoConfig?.enabled || false,
      provider: state.ssoConfig?.provider || "",
      domain: state.ssoConfig?.domain || state.enterpriseDomain || "",
      clientId: state.ssoConfig?.clientId || "",
      clientSecret: state.ssoConfig?.clientSecret || "",
      metadataUrl: state.ssoConfig?.metadataUrl || "",
    },
  });

  const onSubmit = (data: SSOConfigData) => {
    setSsoConfig(data);
    onComplete({
      sso_enabled: data.enabled,
      sso_provider: data.provider,
      sso_domain: data.domain,
      sso_client_id: data.clientId,
      sso_metadata_url: data.metadataUrl,
    });
  };

  const handleSkip = () => {
    setSsoConfig({ enabled: false });
    onComplete({ sso_enabled: false });
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <IconLock size={28} />
        <Box>
          <Typography variant="h5" fontWeight={600}>
            SSO Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure Single Sign-On for your organization (optional)
          </Typography>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }} icon={<IconInfoCircle size={20} />}>
        SSO allows your team members to log in using your company&apos;s identity provider.
        You can configure this later from the admin settings.
      </Alert>

      <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={3}>
        <FormControlLabel
          control={
            <Switch
              checked={ssoEnabled}
              onChange={(e) => {
                setSsoEnabled(e.target.checked);
                setValue("enabled", e.target.checked);
              }}
            />
          }
          label="Enable Single Sign-On (SSO)"
        />

        {ssoEnabled && (
          <>
            <FormControl fullWidth error={!!errors.provider}>
              <InputLabel id="provider-label" size="small">
                SSO Provider *
              </InputLabel>
              <Select
                labelId="provider-label"
                label="SSO Provider *"
                size="small"
                value={watch("provider") || ""}
                onChange={(e) => setValue("provider", e.target.value)}
              >
                {ssoProviders.map((provider) => (
                  <MenuItem key={provider.value} value={provider.value}>
                    {provider.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <CustomTextField
              customLabel="Domain *"
              {...register("domain")}
              error={!!errors.domain}
              helperText={errors.domain?.message || "Your company domain (e.g., example.com)"}
              placeholder="example.com"
              fullWidth
            />

            <CustomTextField
              customLabel="Client ID"
              {...register("clientId")}
              error={!!errors.clientId}
              helperText={errors.clientId?.message}
              placeholder="Your SSO provider client ID"
              fullWidth
            />

            <CustomTextField
              customLabel="Client Secret"
              {...register("clientSecret")}
              error={!!errors.clientSecret}
              helperText={errors.clientSecret?.message}
              placeholder="Your SSO provider client secret"
              type="password"
              fullWidth
            />

            <CustomTextField
              customLabel="Metadata URL"
              {...register("metadataUrl")}
              error={!!errors.metadataUrl}
              helperText={errors.metadataUrl?.message || "SAML metadata URL or OIDC discovery URL"}
              placeholder="https://your-provider.com/.well-known/openid-configuration"
              fullWidth
            />
          </>
        )}

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, pt: 2 }}>
          <Button
            variant="text"
            onClick={handleSkip}
            disabled={state.isLoading}
          >
            Skip for Now
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={state.isLoading}
          >
            {ssoEnabled ? "Save & Continue" : "Continue"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
