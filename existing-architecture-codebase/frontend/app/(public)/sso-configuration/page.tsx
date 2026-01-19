"use client";
import React, { use, useState } from "react";
import type { ChangeEvent } from "react";
import { Box, Button, TextField, Typography, Alert } from "@mui/material";
import PageContainer from "@/components/container/PageContainer";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import EmailIcon from "@mui/icons-material/Email";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LockIcon from "@mui/icons-material/Lock";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import BusinessIcon from "@mui/icons-material/Business";
import SecurityIcon from "@mui/icons-material/Security";
import Image from "next/image";
import { toast } from "react-toastify";
import ssoService from "@/services/sso/sso-services";
import { useSearchParams } from "next/navigation";
import CustomTextField from "@/components/forms/theme-elements/CustomTextField";
import { IconKey, IconLock, IconUsers, IconWorld } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { urlWrapper } from "@/utils/url-wrapper";

// Shared layout component
interface OnboardingLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

function OnboardingLayout({ children, pageTitle }: OnboardingLayoutProps) {
  return (
    <PageContainer title={pageTitle} description="Kolate AI Onboarding Process">
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          height: "100vh",
          width: "100%",
          overflow: "hidden",
        }}
      >
        {/* Left Side - Content */}
        <Box
          sx={{
            width: { xs: "100%", md: "50%" },
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            p: { xs: 3, md: 5 },
            maxWidth: { md: "800px" },
            mx: { md: "auto" },
            overflowY: "auto",
            height: "100%",
          }}
        >
          {/* Logo */}
          <Box sx={{ mb: 2, mt: 6 }}>
            <Box
              component="div"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Image
                src={urlWrapper.images + "logo/kolate-logo.png"}
                alt="Kolate AI"
                width={140}
                height={35}
                style={{ objectFit: "contain" }}
              />
            </Box>
          </Box>

          {/* Content */}
          {children}

          {/* Footer */}
          <Box
            sx={{
              mt: 6,
              display: "flex",
              justifyContent: "space-between",
              color: "text.secondary",
              fontSize: "0.875rem",
              pb: 4,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              2025 kolateAI.
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <EmailIcon fontSize="small" />
              <Typography variant="body2">help@kolate.AI</Typography>
            </Box>
          </Box>
        </Box>

        {/* Right Side - AI Hand Image */}
        <Box
          sx={{
            width: { xs: "100%", md: "50%" },
            bgcolor: "#e1f2fd",
            display: { xs: "none", md: "flex" },
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            minHeight: { xs: "300px", md: "100%" },
            flexShrink: 0,
          }}
        >
          <Image
            src={urlWrapper.background + "ai-hand.jpg"}
            alt="AI Hand"
            fill
            style={{ objectFit: "cover" }}
            priority
          />
        </Box>
      </Box>
    </PageContainer>
  );
}

// Welcome page component
interface WelcomePageProps {
  onNext: () => void;
}

function WelcomePageComponent({ onNext }: WelcomePageProps) {
  return (
    <>
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" fontWeight="medium" gutterBottom>
          Welcome to Kolate AI
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={4}>
          Set up enterprise-grade SSO in minutes. Auth0 SSO simplifies
          authentication across all your applications, improving security and
          user experience.
        </Typography>

        {/* Feature list */}
        <Box sx={{ my: 4 }}>
          {/* Enhanced Security */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
            <Box
              sx={{
                backgroundColor: "#f0f7ff",
                borderRadius: "50%",
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0047AB",
              }}
            >
              <IconLock />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="medium">
                Enhanced Security
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Centralized authentication reduces attack surface and enables
                consistent security policies.
              </Typography>
            </Box>
          </Box>

          {/* Seamless User Experience */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
            <Box
              sx={{
                backgroundColor: "#f0f7ff",
                borderRadius: "50%",
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0047AB",
              }}
            >
              <IconUsers />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="medium">
                Seamless User Experience
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Users log in once and access all authorized applications without
                re- authentication.
              </Typography>
            </Box>
          </Box>

          {/* Simplified Access Management */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
            <Box
              sx={{
                backgroundColor: "#f0f7ff",
                borderRadius: "50%",
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0047AB",
              }}
            >
              <IconKey />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="medium">
                Simplified Access Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage user permissions and access control from a single
                dashboard.
              </Typography>
            </Box>
          </Box>

          {/* Enterprise Compatibility */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
            <Box
              sx={{
                backgroundColor: "#f0f7ff",
                borderRadius: "50%",
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0047AB",
              }}
            >
              <IconWorld />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="medium">
                Enterprise Compatibility
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Integrate with your existing identity providers and directories.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
      >
        <Button
          variant="contained"
          onClick={onNext}
          endIcon={<ArrowForwardIcon />}
          sx={{
            px: 4,
          }}
          size="large"
        >
          Get Started
        </Button>
      </Box>
    </>
  );
}

// Domain Configuration page component
interface DomainConfigProps {
  onPrevious: () => void;
}

function DomainConfigComponent({ onPrevious }: DomainConfigProps) {
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const enterpriseId = searchParams.get("eid");
  const displayName = searchParams.get("ename");
  const router = useRouter();
  const handleDomainChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDomain(e.target.value);
    setError(null); // Clear error when user starts typing
  };

  const validateDomain = (domain: string): boolean => {
    // Regex to validate domain pattern (e.g., asd.com)
    const domainPattern = /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
    return domainPattern.test(domain);
  };

  const handleContinue = async () => {
    try {
      setLoading(true);
      if (!validateDomain(domain)) {
        setError("Please enter a valid domain (e.g., kolate.ai).");
        return;
      }

      if (!enterpriseId)
        return toast.error(
          "An error occurred while processing your request. Please try again."
        );

      const response = await ssoService.onboardEnterprise({
        enterprise_id: enterpriseId ?? "",
        display_name: displayName ?? "",
        // icon_url: "https://example.com/icon.png",
        domain_aliases: [domain],
        primary_color: "#1d4fd7",
        page_background_color: "#FFFFFF",
      });

      console.log("SSO Ticket Response:", response?.data);
      const ticketUrl = response?.data?.ticket?.ticket;
      if (ticketUrl) {
        router.replace(ticketUrl);
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "An error occurred while processing your request. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Configure Your Domain
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={4}>
          Your Auth0 domain will be used for your SSO login page and
          authentication endpoints.
        </Typography>

        {/* Domain Input */}
        <Box sx={{ my: 4 }}>
          <Typography variant="subtitle2" mb={1}>
            Organization Domain
          </Typography>
          <CustomTextField
            fullWidth
            placeholder="e.g., yourcompany.com"
            value={domain}
            onChange={handleDomainChange}
            variant="outlined"
            error={!!error}
            helperText={error}
            sx={{ mb: 2 }}
          />
          <Typography variant="caption" color="text.secondary">
            This will be your unique Auth0 domain. You can also set up a custom
            domain later.
          </Typography>

          {/* Warning Box */}
          <Alert
            severity="info"
            icon={<InfoOutlinedIcon />}
            sx={{
              mt: 3,
              backgroundColor: "#FFF8E1",
              color: "#5F4700",
              border: "none",
              "& .MuiAlert-icon": {
                color: "#5F4700",
              },
            }}
          >
            <Typography variant="body2">
              <strong>Important:</strong> Your domain name will be part of your
              SSO login URL and cannot be changed after setup. Choose a domain
              that reflects your organization.
            </Typography>
          </Alert>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Button
          variant="outlined"
          onClick={onPrevious}
          startIcon={<ArrowBackIcon />}
          size="large"
          color="inherit"
        >
          Previous
        </Button>
        <Button
          variant="contained"
          onClick={handleContinue}
          endIcon={<ArrowForwardIcon />}
          size="large"
          disabled={loading}
          loading={loading}
        >
          Continue
        </Button>
      </Box>
    </>
  );
}

// Main component to handle navigation
export default function OnboardingFlow() {
  const [step, setStep] = useState(1);

  const handleNext = () => {
    setStep(step + 1);
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  return (
    <OnboardingLayout pageTitle={`Kolate AI Onboarding`}>
      {step === 1 && <WelcomePageComponent onNext={handleNext} />}
      {step === 2 && <DomainConfigComponent onPrevious={handlePrevious} />}
    </OnboardingLayout>
  );
}
