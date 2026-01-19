import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Grid,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Skeleton,
  Alert,
  Button,
  Avatar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import BlockIcon from "@mui/icons-material/Block";

import { getRoleWithPermissions } from "@/services/project/project-service";
import theme from "@/utils/theme";

export type PermissionType = "FULL_ACCESS" | "READ_ONLY" | "HIDDEN";
type PermissionKeys = "COMPARE" | "PREDICT" | "COPILOT" | "INSIGHTS";

interface ViewRoleDrawerProps {
  open: boolean;
  onClose: () => void;
  roleId: string;
  userName: string;
  email: string;
  userImage: string;
}

export default function ViewRoleDrawer({
  open,
  onClose,
  roleId,
  userName,
  email,
  userImage,
}: ViewRoleDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roleDetails, setRoleDetails] = useState<{
    name: string;
    description: string;
    permissions: Record<string, PermissionType>;
  } | null>(null);

  useEffect(() => {
    if (!roleId || !open) return;
    (async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const { data } = await getRoleWithPermissions(roleId);
        setRoleDetails({
          name: data.data.name,
          description: data.data.description,
          permissions: {
            COMPARE: data.data.permissions?.COMPARE || "HIDDEN",
            PREDICT: data.data.permissions?.PREDICT || "HIDDEN",
            COPILOT: data.data.permissions?.COPILOT || "HIDDEN",
            INSIGHTS: data.data.permissions?.INSIGHTS || "HIDDEN",
          },
        });
      } catch (err: any) {
        setErrorMessage(
          err?.response?.data?.message || "Failed to load role details."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [roleId, open]);

  const PERMISSION_OPTIONS = [
    {
      value: "FULL_ACCESS",
      label: "Full Access",
      description: "Can use, edit, and share results",
      icon: LockIcon,
    },
    {
      value: "READ_ONLY",
      label: "Read Only",
      description: "Can view results, cannot make changes",
      icon: VisibilityIcon,
    },
    {
      value: "HIDDEN",
      label: "No Access",
      description: "Feature is hidden or disabled",
      icon: BlockIcon,
    },
  ] as const;

  const renderPermissionGroup = (
    label: string,
    fieldName: PermissionKeys,
    helperText: string
  ) => (
    <Box sx={{ mb: 3 }}>
      <Box mb={4}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        <Typography variant="caption">{helperText}</Typography>
      </Box>

      {loading ? (
        <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 2 }} />
      ) : (
        <RadioGroup value={roleDetails?.permissions[fieldName]} sx={{ mt: 2 }}>
          <Grid container spacing={1} rowSpacing={3}>
            {PERMISSION_OPTIONS.map(
              ({ value, label, description, icon: Icon }) => (
                <Grid key={value} component={Grid} size={{ xs: 12, sm: 6 }}>
                  <FormControlLabel
                    value={value}
                    sx={{
                      ":hover": {
                        cursor: "default",
                      },
                    }}
                    control={
                      <Radio
                        sx={{
                          color: "#7F56D9 !important",
                        }}
                        readOnly
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            background: "#F4EBFF",
                            borderRadius: "100px",
                            height: "34px",
                            width: "34px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon sx={{ color: "#7F56D9", fontSize: "16px" }} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 500 }} variant="body2">
                            {label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {description}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </Grid>
              )
            )}
          </Grid>
        </RadioGroup>
      )}
      <Divider sx={{ mt: 2 }} />
    </Box>
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { maxWidth: 768, width: "100%" } }}
    >
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          borderBottom: "1px solid #eee",
        }}
      >
        <Typography variant="h6">View Role Details</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* CONTENT */}
      <Box sx={{ p: 3, flex: 1, overflowY: "auto" }}>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}

        {/* Role & User Info */}
        <Grid container spacing={3}>
          <Grid component={Grid} size={{ xs: 12 }}>
            {/* ✅ USER INFO SECTION */}
            <Box sx={{ borderBottom: "1px solid #eee" }}>
              {/* 🔹 Header Row */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  p: 2,
                  bgcolor: "#fafafa",
                  borderBottom: "1px solid #eee",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "text.secondary", flex: 1 }}
                >
                  Name
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: "text.secondary",
                    width: 120,
                    textAlign: "right",
                  }}
                >
                  Access Role
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 2,
                }}
              >
                {/* LEFT SIDE: Avatar + Name + Email */}
                <Box display="flex" alignItems="center" flex={1}>
                  <Avatar
                    src={userImage}
                    alt={userName}
                    sx={{ width: 40, height: 40, mr: 2 }}
                  />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {userName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {email}
                    </Typography>
                  </Box>
                </Box>

                {/* RIGHT SIDE: Role */}
                {loading ? (
                  <Skeleton width={60} />
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: "text.secondary",
                      width: 120,
                      textAlign: "right",
                    }}
                  >
                    {roleDetails?.name || "—"}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Permissions */}
          <Grid component={Grid} size={{ xs: 12 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Feature Permissions
            </Typography>
            {renderPermissionGroup(
              "Compare",
              "COMPARE",
              "Run comparisons, export and share results"
            )}
            {renderPermissionGroup(
              "Predict",
              "PREDICT",
              "Upload data, run predictions, view reports"
            )}
            {renderPermissionGroup(
              "Copilot",
              "COPILOT",
              "Get AI assistance with your tasks"
            )}
            {renderPermissionGroup(
              "Insights",
              "INSIGHTS",
              "View insights and analytics"
            )}
          </Grid>
        </Grid>
      </Box>
    </Drawer>
  );
}
