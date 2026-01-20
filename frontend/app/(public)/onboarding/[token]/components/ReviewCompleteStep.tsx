"use client";

import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Alert,
  Avatar,
} from "@mui/material";
import {
  IconCheck,
  IconBuilding,
  IconUser,
  IconLock,
  IconUsers,
  IconDatabase,
  IconRocket,
  IconAlertCircle,
} from "@tabler/icons-react";

import { useOnboarding } from "@/context/OnboardingContext";

interface ReviewCompleteStepProps {
  onComplete: () => void;
}

export default function ReviewCompleteStep({ onComplete }: ReviewCompleteStepProps) {
  const { state } = useOnboarding();

  const summaryItems = [
    {
      icon: IconBuilding,
      label: "Company",
      value: state.companyInfo?.name || state.enterpriseName,
      subtext: state.companyInfo?.industry || state.enterpriseDomain,
      completed: !!state.companyInfo?.name,
    },
    {
      icon: IconUser,
      label: "Administrator",
      value: state.adminInfo
        ? state.adminInfo.firstName + " " + state.adminInfo.lastName
        : state.adminEmail,
      subtext: state.adminInfo?.jobTitle || "",
      completed: !!state.adminInfo?.firstName,
    },
    {
      icon: IconLock,
      label: "SSO Configuration",
      value: state.ssoConfig?.enabled
        ? state.ssoConfig.provider || "Configured"
        : "Not configured",
      subtext: state.ssoConfig?.domain || "",
      completed: state.ssoConfig?.enabled || false,
      optional: true,
    },
    {
      icon: IconUsers,
      label: "Team Invitations",
      value: state.invitedUsers.length + " member" + (state.invitedUsers.length !== 1 ? "s" : "") + " invited",
      subtext:
        state.invitedUsers.length > 0
          ? state.invitedUsers.map((u) => u.email).join(", ")
          : "No team members invited yet",
      completed: state.invitedUsers.length > 0,
      optional: true,
    },
    {
      icon: IconDatabase,
      label: "Data Source",
      value: state.datasourceConfig?.configured
        ? state.datasourceConfig.type
        : "Not configured",
      subtext: state.datasourceConfig?.name || "",
      completed: state.datasourceConfig?.configured || false,
      optional: true,
    },
  ];

  const requiredComplete = !!state.companyInfo?.name && !!state.adminInfo?.firstName;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Avatar sx={{ width: 48, height: 48, bgcolor: "primary.main" }}>
          <IconRocket size={24} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Review and Complete Setup
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review your configuration before activating your account
          </Typography>
        </Box>
      </Box>

      {!requiredComplete && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<IconAlertCircle size={20} />}>
          Please complete all required steps before finishing the setup.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ mb: 3 }}>
        <List disablePadding>
          {summaryItems.map((item, index) => (
            <Box key={item.label}>
              {index > 0 && <Divider />}
              <ListItem sx={{ py: 2, opacity: item.completed ? 1 : 0.6 }}>
                <ListItemIcon>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: item.completed ? "success.light" : "grey.200",
                      color: item.completed ? "success.main" : "grey.500",
                    }}
                  >
                    {item.completed ? <IconCheck size={20} /> : <item.icon size={20} />}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="subtitle2">{item.label}</Typography>
                      {item.optional && <Chip label="Optional" size="small" variant="outlined" />}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body1">{item.value}</Typography>
                      {item.subtext && (
                        <Typography variant="caption" color="text.secondary">
                          {item.subtext}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            </Box>
          ))}
        </List>
      </Paper>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">After completing setup:</Typography>
        <ul style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
          <li>Your organization will be activated</li>
          <li>Team invitations will be sent (if any)</li>
          <li>You will be redirected to login with your new account</li>
        </ul>
      </Alert>

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, pt: 2 }}>
        <Button
          variant="contained"
          size="large"
          onClick={onComplete}
          disabled={!requiredComplete || state.isLoading}
          startIcon={<IconRocket size={20} />}
          sx={{ minWidth: 200 }}
        >
          {state.isLoading ? "Completing..." : "Complete Setup"}
        </Button>
      </Box>
    </Box>
  );
}
