import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  Button,
  IconButton,
  Grid,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Skeleton,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import BlockIcon from "@mui/icons-material/Block";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";

import {
  createProjectRole,
  getRoleWithPermissions,
  updateRolePermissions,
} from "@/services/project/project-service";
import CustomTextField from "@/components/forms/theme-elements/CustomTextField";
import theme from "@/utils/theme";

export type PermissionType = "FULL_ACCESS" | "READ_ONLY" | "HIDDEN";

export interface RoleFormData {
  name: string;
  description: string;
  role_permissions: {
    COMPARE: PermissionType;
    PREDICT: PermissionType;
    COPILOT: PermissionType;
    INSIGHTS: PermissionType;
  };
}

interface RoleFormProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  roleId?: string;
  fetchRoles: () => void;
}

const accessLevels = ["FULL_ACCESS", "READ_ONLY", "HIDDEN"] as const;

const RoleSchema: Yup.ObjectSchema<RoleFormData> = Yup.object({
  name: Yup.string().required("Role name is required"),
  description: Yup.string().required("Description is required"),
  role_permissions: Yup.object({
    COMPARE: Yup.mixed<PermissionType>().oneOf(accessLevels).required(),
    PREDICT: Yup.mixed<PermissionType>().oneOf(accessLevels).required(),
    COPILOT: Yup.mixed<PermissionType>().oneOf(accessLevels).required(),
    INSIGHTS: Yup.mixed<PermissionType>().oneOf(accessLevels).required(),
  }).required(),
});

export default function RoleForm({
  open,
  onClose,
  projectId,
  roleId,
  fetchRoles,
}: RoleFormProps) {
  const {
    handleSubmit,
    control,
    formState: { isSubmitting, errors },
    reset,
  } = useForm<RoleFormData>({
    resolver: yupResolver<RoleFormData, any, RoleFormData>(RoleSchema),
    defaultValues: {
      name: "",
      description: "",
      role_permissions: {
        COMPARE: "FULL_ACCESS",
        PREDICT: "FULL_ACCESS",
        COPILOT: "FULL_ACCESS",
        INSIGHTS: "FULL_ACCESS",
      },
    },
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!roleId) return;
    (async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const { data } = await getRoleWithPermissions(roleId);
        reset({
          name: data.data.name,
          description: data.data.description,
          role_permissions: {
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

  const onSubmit: SubmitHandler<RoleFormData> = async (data) => {
    setErrorMessage(null);
    try {
      if (roleId) {
        await updateRolePermissions(
          roleId,
          data?.name,
          data?.description,
          data.role_permissions
        );
      } else {
        await createProjectRole(projectId, data);
      }
      fetchRoles();
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message ||
          "An error occurred while saving the role."
      );
    }
  };

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
    fieldName: keyof RoleFormData["role_permissions"],
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
        <Controller
          name={`role_permissions.${fieldName}` as const}
          control={control}
          render={({ field }) => (
            <RadioGroup {...field} sx={{ mt: 2 }}>
              <Grid container spacing={1} rowSpacing={3}>
                {PERMISSION_OPTIONS.map(
                  ({ value, label, description, icon: Icon }) => (
                    <Grid key={value} size={{ xs: 12, sm: 6 }} component={Grid}>
                      <FormControlLabel
                        value={value}
                        control={
                          <Radio
                            sx={{
                              color: "#7F56D9 !important",
                            }}
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
                              <Icon
                                sx={{ color: "#7F56D9", fontSize: "16px" }}
                              />
                            </Box>
                            <Box>
                              <Typography
                                sx={{ fontWeight: 500 }}
                                variant="body2"
                              >
                                {label}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
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
        />
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
        <Typography variant="h6">
          {roleId ? "Edit Role" : "Create Role"}
        </Typography>
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

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid component={Grid} size={{ xs: 12 }}>
              {loading ? (
                <Skeleton height={56} sx={{ borderRadius: 2 }} />
              ) : (
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      customLabel="Role Name"
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              )}
            </Grid>

            <Grid component={Grid} size={{ xs: 12 }}>
              {loading ? (
                <Skeleton height={100} sx={{ borderRadius: 2 }} />
              ) : (
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <CustomTextField
                      {...field}
                      customLabel="Description"
                      fullWidth
                      multiline
                      error={!!errors.description}
                      helperText={errors.description?.message}
                    />
                  )}
                />
              )}
            </Grid>

            {/* PERMISSIONS */}
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
        </form>
      </Box>

      {/* FOOTER */}
      <Box
        sx={{
          mt: 3,
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          px: 3,
          py: 2,
          borderTop: "1px solid " + theme.palette.divider,
        }}
      >
        <Button onClick={onClose} variant="outlined" size="large">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting || loading}
          size="large"
          onClick={handleSubmit(onSubmit)}
        >
          {roleId ? "Update" : "Create"}
        </Button>
      </Box>
    </Drawer>
  );
}
