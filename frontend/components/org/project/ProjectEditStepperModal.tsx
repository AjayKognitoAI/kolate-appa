import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Box,
  Typography,
  Select,
  InputLabel,
  FormControl,
  Avatar,
  IconButton,
  Alert, // add Alert from MUI
} from "@mui/material";
import CustomTextField from "@/components/forms/theme-elements/CustomTextField";
import CustomAutocomplete from "@/components/forms/theme-elements/CustomAutocomplete";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import userManagerService from "@/services/org-admin/user-manager";
import { projectService } from "@/services/project/project-service";
import { useSession } from "next-auth/react";
import { updateOnboardingProgress } from "@/services/org-admin/enterprise-setup";

// Dummy data for managers and team members (replace with real data/fetch in real app)
const MANAGERS = [
  { name: "Olivia Rhye", value: "olivia" },
  { name: "James Smith", value: "james" },
];
const TEAM_MEMBERS = [
  {
    name: "Olivia Rhye",
    email: "olivia@kolate.AI",
    avatar: "https://randomuser.me/api/portraits/women/1.jpg",
  },
  {
    name: "James Smith",
    email: "james@kolate.AI",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
  },
  {
    name: "Sophia Lee",
    email: "sophia@kolate.AI",
    avatar: "https://randomuser.me/api/portraits/women/2.jpg",
  },
];

interface TeamMemberOption {
  name: string;
  email: string;
  avatar?: string;
}

interface ProjectEditStepperModalProps {
  open: boolean;
  onClose: () => void;
  project?: {
    title: string;
    description: string;
    projectManagers: { name: string }[];
    teamMembers?: TeamMemberOption[];
  };
  onSave?: (data: any) => void;
}

const steps = ["Basic Details", "Team Members"];

const projectSchema = yup.object({
  name: yup.string().required("Project name is required"),
  description: yup.string().required("Project description is required"),
  manager: yup.string().notRequired(),
  teamMembers: yup
    .array()
    .of(
      yup.object({
        name: yup.string().required(),
        email: yup.string().email().required(),
        avatar: yup.string().notRequired(),
      })
    )
    .notRequired(),
});

const UserAutocompleteOption: React.FC<{
  option: { name: string; email?: string; avatar?: string };
  style?: React.CSSProperties;
  liProps?: any;
}> = ({ option, style, liProps }) => (
  <li
    {...liProps}
    style={{ display: "flex", alignItems: "center", gap: 12, ...style }}
  >
    <Avatar
      src={option.avatar}
      alt={option.name}
      sx={{ width: 32, height: 32 }}
    />
    <span style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontWeight: 500 }}>{option.name}</span>
      {option.email && (
        <span style={{ color: "#888", fontSize: 13 }}>{option.email}</span>
      )}
    </span>
  </li>
);

const ProjectEditStepperModal: React.FC<ProjectEditStepperModalProps> = ({
  open,
  onClose,
  project,
  onSave,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [users, setUsers] = useState<
    Array<{ name: string; value: string; email?: string; avatar?: string }>
  >([]);
  const { data: session } = useSession();
  const currentUserId = session?.user?.sub;
  const [managerOptions, setManagerOptions] = useState<any[]>([]);
  const [teamMemberOptions, setTeamMemberOptions] = useState<any[]>([]);
  const [managerInput, setManagerInput] = useState("");
  const [teamMemberInput, setTeamMemberInput] = useState("");
  const [managerLoading, setManagerLoading] = useState(false);
  const [teamMemberLoading, setTeamMemberLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultValues = {
    name: project?.title || "",
    description: project?.description || "",
    manager: project?.projectManagers?.[0]?.name || "",
    teamMembers: project?.teamMembers || [],
  };

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    register,
    formState: { errors },
  } = useForm({
    defaultValues,
    resolver: yupResolver(projectSchema),
    mode: "onChange",
  });

  React.useEffect(() => {
    if (open) {
      setActiveStep(0);
      reset({
        name: project?.title || "",
        description: project?.description || "",
        manager: project?.projectManagers?.[0]?.name || "",
        teamMembers: project?.teamMembers || [],
      });
    }
  }, [open, project, reset]);

  // Add debouncing to manager search
  useEffect(() => {
    let active = true;

    // Clear results if input is empty
    if (managerInput.length < 1) {
      setManagerOptions([]);
      setManagerLoading(false);
      return;
    }

    // Show loading state immediately when user starts typing
    setManagerLoading(true);

    // Set up debounce timer (500ms delay)
    const debounceTimer = setTimeout(() => {
      projectService
        .searchUsers({ q: managerInput, size: 10 })
        .then((res) => {
          if (!active) return;
          let users = (res.data?.content || []).filter(
            (u: any) =>
              u.auth0_id !== currentUserId &&
              !(watch("teamMembers") || []).some(
                (m: any) => m.value === u.auth0_id
              )
          );
          setManagerOptions(
            users.map((u: any) => ({
              name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
              value: u.auth0_id,
              email: u.email,
              avatar: u.avatar_url,
            }))
          );
          setManagerLoading(false);
        })
        .catch(() => {
          if (active) setManagerLoading(false);
        });
    }, 500); // Wait 500ms after user stops typing

    return () => {
      active = false;
      clearTimeout(debounceTimer); // Clear timeout on cleanup
    };
  }, [managerInput, currentUserId, watch("teamMembers")]);

  // Add debouncing to team member search
  useEffect(() => {
    let active = true;

    // Clear results if input is empty
    if (teamMemberInput.length < 1) {
      setTeamMemberOptions([]);
      setTeamMemberLoading(false);
      return;
    }

    // Show loading state immediately when user starts typing
    setTeamMemberLoading(true);

    // Set up debounce timer (500ms delay)
    const debounceTimer = setTimeout(() => {
      projectService
        .searchUsers({ q: teamMemberInput, size: 10 })
        .then((res) => {
          if (!active) return;
          let users = (res.data?.content || []).filter(
            (u: any) =>
              u.auth0_id !== currentUserId &&
              u.auth0_id !== watch("manager") &&
              !(watch("teamMembers") || []).some(
                (m: any) => m.value === u.auth0_id
              )
          );
          setTeamMemberOptions(
            users.map((u: any) => ({
              name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
              value: u.auth0_id,
              email: u.email,
              avatar: u.avatar_url,
            }))
          );
          setTeamMemberLoading(false);
        })
        .catch(() => {
          if (active) setTeamMemberLoading(false);
        });
    }, 500); // Wait 500ms after user stops typing

    return () => {
      active = false;
      clearTimeout(debounceTimer); // Clear timeout on cleanup
    };
  }, [teamMemberInput, currentUserId, watch("manager"), watch("teamMembers")]);

  const onSubmit = async (data: any) => {
    try {
      setSubmitLoading(true);
      setError(null); // reset error before submit
      // Get admin id from session
      const adminId = session?.user?.sub || "";
      const adminEmail = session?.user?.email || "";

      const payload = {
        name: data.name,
        description: data.description,
        created_by: adminEmail,
        project_users: [
          // ADMIN (creator)
          ...(adminId ? [{ user_auth0_id: adminId, role: "ADMIN" }] : []),
          // MANAGER
          ...(data.manager
            ? [{ user_auth0_id: data.manager, role: "MANAGER" }]
            : []),
          // MEMBERS
          ...((data.teamMembers || []).map((member: any) => ({
            user_auth0_id: member.value,
            role: "MEMBER",
          })) || []),
        ],
      };
      await projectService.createProject(payload);
      if (onSave) {
        onSave(data);
      }
      updateOnboardingProgress("CREATED_PROJECT");
      onClose();
    } catch (error: any) {
      // Show error message from API if available
      const apiMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create project";
      setError(apiMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Helper: get fields to validate for current step
  const getStepFields = (
    step: number
  ): ("name" | "description" | "manager" | "teamMembers")[] => {
    switch (step) {
      case 0:
        return ["name", "description", "manager"];
      case 1:
        return ["teamMembers"];
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {project ? "Edit Project" : "Create New Project"} - Step{" "}
        {activeStep + 1} of 2
      </DialogTitle>
      <DialogContent>
        {/* Show error if present */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {activeStep === 0
            ? "Enter the basic details of the project."
            : "Add team members to the project. You can add more members later."}
        </Typography>
        <form onSubmit={handleSubmit(onSubmit)}>
          {activeStep === 0 && (
            <Box display="flex" flexDirection="column" gap={2}>
              <Typography variant="subtitle2" sx={{ mb: "0.3 !important" }}>
                Project Name <span style={{ color: "#d32f2f" }}>*</span>
              </Typography>
              <CustomTextField
                {...register("name")}
                required
                fullWidth
                placeholder="Enter project name"
                error={!!errors.name}
                helperText={errors.name?.message}
              />
              <Typography variant="subtitle2" sx={{ mb: "0.3 !important" }}>
                Project Description <span style={{ color: "#d32f2f" }}>*</span>
              </Typography>
              <CustomTextField
                {...register("description")}
                required
                fullWidth
                multiline
                minRows={3}
                placeholder="Enter project description"
                error={!!errors.description}
                helperText={
                  errors.description?.message || ""
                  // "This is a hint text to help user."
                }
              />
              <Controller
                name="manager"
                control={control}
                render={({ field, fieldState }) => (
                  <CustomAutocomplete
                    options={managerOptions}
                    getOptionLabel={(option: {
                      name: string;
                      email?: string;
                    }) => option.name}
                    value={
                      managerOptions.find((m) => m.value === field.value) ||
                      null
                    }
                    inputValue={managerInput}
                    onInputChange={(_event: any, value: string) =>
                      setManagerInput(value)
                    }
                    onChange={(_event: any, value: any | null) =>
                      field.onChange(value ? value.value : "")
                    }
                    isOptionEqualToValue={(option: any, value: any) =>
                      option.value === value.value
                    }
                    fullWidth
                    customLabel="Project Manager"
                    loading={managerLoading}
                    noOptionsText={
                      managerInput && managerInput.trim().length > 0
                        ? "No members found"
                        : "Type to search members..."
                    }
                    renderOption={(
                      props: any,
                      option: { name: string; email?: string; avatar?: string }
                    ) => {
                      const { key, ...optionProps } = props;
                      return (
                        <UserAutocompleteOption
                          option={option}
                          key={key}
                          liProps={{ key, ...optionProps }}
                        />
                      );
                    }}
                  />
                )}
              />
            </Box>
          )}
          {activeStep === 1 && (
            <Box display="flex" flexDirection="column" gap={2}>
              <FormControl fullWidth>
                <Controller
                  name="teamMembers"
                  control={control}
                  render={({ field }) => (
                    <>
                      <CustomAutocomplete
                        options={teamMemberOptions}
                        getOptionLabel={(option: {
                          name: string;
                          email?: string;
                        }) => option?.name ?? ""}
                        value={null}
                        inputValue={teamMemberInput}
                        onInputChange={(_event: any, value: string) =>
                          setTeamMemberInput(value)
                        }
                        onChange={(_event: any, value: any | null) => {
                          if (value && typeof value !== "string") {
                            field.onChange([...(field.value || []), value]);
                            setTeamMemberInput("");
                          }
                        }}
                        isOptionEqualToValue={(
                          option: { value: string },
                          value: { value: string }
                        ) => option.value === value.value}
                        fullWidth
                        customLabel="Add Team Member"
                        clearOnBlur
                        clearOnEscape
                        loading={teamMemberLoading}
                        noOptionsText={
                          teamMemberInput && teamMemberInput.trim().length > 0
                            ? "No members found"
                            : "Type to search members..."
                        }
                        renderOption={(
                          props: any,
                          option: {
                            name: string;
                            email?: string;
                            avatar?: string;
                          }
                        ) => {
                          const { key, ...optionProps } = props;
                          return (
                            <UserAutocompleteOption
                              option={option}
                              key={key}
                              liProps={{ key, ...optionProps }}
                            />
                          );
                        }}
                      />
                      <Box mt={2}>
                        {(field.value || []).map((member: any) => (
                          <Box
                            key={member.value}
                            display="flex"
                            alignItems="center"
                            sx={{
                              background: "#fff",
                              borderRadius: 1,
                              mb: 1,
                              p: 1,
                              boxShadow: 1,
                            }}
                          >
                            <Avatar
                              src={member.avatar}
                              alt={member.name}
                              sx={{ width: 36, height: 36, mr: 2 }}
                            />
                            <Box flex={1}>
                              <Typography fontWeight={600}>
                                {member.name}
                              </Typography>
                              <Typography fontSize={14} color="#64748b">
                                {member.email}
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              aria-label="Remove member"
                              onClick={() => {
                                const updated = (field.value || []).filter(
                                  (m: any) => m.value !== member.value
                                );
                                field.onChange(updated);
                              }}
                            >
                              ×
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    </>
                  )}
                />
              </FormControl>
            </Box>
          )}
        </form>
      </DialogContent>
      <DialogActions sx={{ width: "100%", px: 3, pb: 3 }}>
        <Box width="100%" display="flex" justifyContent="space-between" gap={2}>
          {activeStep > 0 && (
            <Button
              variant="outlined"
              onClick={() => setActiveStep((prev) => prev - 1)}
              color="inherit"
              fullWidth
              disabled={submitLoading}
            >
              Previous
            </Button>
          )}
          {activeStep < steps.length - 1 ? (
            <>
              <Button
                variant="outlined"
                onClick={onClose}
                color="inherit"
                fullWidth
                disabled={submitLoading}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={async () => {
                  const valid = await trigger(getStepFields(activeStep));
                  if (valid) setActiveStep((prev) => prev + 1);
                }}
                disabled={submitLoading}
              >
                Next
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSubmit(onSubmit)}
              variant="contained"
              color="primary"
              fullWidth
              disabled={submitLoading}
            >
              {submitLoading
                ? "Saving..."
                : project
                ? "Update Project"
                : "Create Project"}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ProjectEditStepperModal;
