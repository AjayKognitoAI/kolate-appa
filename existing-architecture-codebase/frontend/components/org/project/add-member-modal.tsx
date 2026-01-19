import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
  IconButton,
  Skeleton,
  Avatar,
} from "@mui/material";
import CustomTextField from "@/components/forms/theme-elements/CustomTextField";
import CustomSelect from "@/components/forms/theme-elements/CustomSelect";
import CustomAutocomplete from "@/components/forms/theme-elements/CustomAutocomplete";
import { IconSend, IconX } from "@tabler/icons-react";
import { toast } from "react-toastify";
import { userManagerService } from "@/services/org-admin/user-manager";
import { projectService } from "@/services/project/project-service";
import { useSession } from "next-auth/react";

interface AddMemberFormValues {
  email: string;
  role: string;
}

const schema = yup.object({
  email: yup.string().required("User is required"),
  role: yup.string().required("Role is required"),
});

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: () => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
  open,
  onClose,
  projectId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<{ value: string; label: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleOptions, setRoleOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  useEffect(() => {
    // Fetch project users
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const res = await userManagerService.getUsers(0, 100);
        const options = (res.data?.content || []).map((user: any) => ({
          value: user.auth0_id,
          label: `${user.first_name} ${user.last_name} (${user.email})`,
          avatar_url: user.avatar_url || "",
        }));
        setUsers(options);
      } catch (err) {
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (open && projectId) {
      setLoadingRoles(true);
      projectService
        .getProjectRoles(projectId)
        .then((res) => {
          const options = res.data.map((role: any) => ({
            value: role.id,
            label: role.name.charAt(0) + role.name.slice(1).toLowerCase(),
          }));
          setRoleOptions(options);
        })
        .catch(() => setRoleOptions([]))
        .finally(() => setLoadingRoles(false));
    }
  }, [open, projectId]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    control,
  } = useForm<AddMemberFormValues>({
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

  const onSubmit = async (data: AddMemberFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const role = roleOptions.find((r) => r.value === data.role);

      await projectService.addProjectUser(projectId, {
        user_auth0_id: data.email,
        role_id: data.role,
        role: role ? role.label : "",
      });
      toast.success("Member added successfully!");
      if (onSuccess) {
        onSuccess();
      }
      reset();
      onClose();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        "Failed to add member to project. Please try again.";
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
        Add Team Members
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
          Add members to collaborate on this project.
        </p>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={3}>
          <div>
            {usersLoading ? (
              <Skeleton variant="rounded" width="100%" height={40} />
            ) : (
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <CustomAutocomplete
                    {...field}
                    options={users}
                    getOptionLabel={(option: {
                      value: string;
                      label: string;
                      avatar_url?: string;
                    }) => option.label}
                    isOptionEqualToValue={(
                      option: { value: string; label: string },
                      value: { value: string; label: string }
                    ) => option.value === value.value}
                    loading={usersLoading}
                    value={users.find((u) => u.value === field.value) || null}
                    onChange={(
                      _event: React.SyntheticEvent<Element, Event>,
                      value: { value: string; label: string } | null
                    ) => field.onChange(value?.value || "")}
                    customLabel="Select User *"
                    renderOption={(
                      props: any,
                      option: {
                        value: string;
                        label: string;
                        avatar_url?: string;
                      }
                    ) => {
                      const { key, ...optionProps } = props;
                      return (
                        <li
                          key={key}
                          {...optionProps}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <Avatar
                            src={option.avatar_url}
                            alt={option.label}
                            sx={{ width: 32, height: 32 }}
                          />
                          <span
                            style={{
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>
                              {option.label.split("(")[0].trim()}
                            </span>
                            <span
                              style={{
                                color: "#888",
                                fontSize: 13,
                              }}
                            >
                              {option.label.split("(")[1]?.replace(")", "")}
                            </span>
                          </span>
                        </li>
                      );
                    }}
                  />
                )}
              />
            )}
          </div>

          <div>
            <Controller
              name="role"
              control={control}
              render={({ field }) =>
                loadingRoles ? (
                  <Skeleton variant="rounded" width="100%" height={40} />
                ) : (
                  <CustomSelect
                    {...field}
                    customLabel="Project Role *"
                    options={roleOptions}
                    defaultValue=""
                    displayEmpty
                    error={!!errors.role}
                    helperText={errors.role?.message}
                    placeholder="Select role"
                    onChange={(value: string) => field.onChange(value)}
                  />
                )
              }
            />
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
          Add Member
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddMemberModal;
