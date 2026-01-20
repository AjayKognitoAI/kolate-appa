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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
} from "@mui/material";
import { IconUsers, IconPlus, IconTrash, IconInfoCircle } from "@tabler/icons-react";

import CustomTextField from "@/components/forms/theme-elements/CustomTextField";
import { useOnboarding, InvitedUser } from "@/context/OnboardingContext";

const schema = yup.object({
  email: yup.string().email("Enter a valid email").required("Email is required"),
  name: yup.string().default(""),
  role: yup.string().required("Role is required"),
});

interface InviteUsersStepProps {
  onComplete: (data?: Record<string, any>) => void;
}

const roles = [
  { value: "org:admin", label: "Organization Admin", description: "Full admin access" },
  { value: "org:member", label: "Member", description: "Standard member access" },
];

export default function InviteUsersStep({ onComplete }: InviteUsersStepProps) {
  const { state, addInvitedUser, removeInvitedUser } = useOnboarding();
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<{ email: string; name: string; role: string }>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: "",
      name: "",
      role: "org:member",
    },
  });

  const onAddUser = (data: { email: string; name: string; role: string }) => {
    // Check for duplicate email
    if (state.invitedUsers.some((u) => u.email === data.email)) {
      return;
    }

    addInvitedUser({
      email: data.email,
      name: data.name,
      role: data.role,
    });
    reset();
    setShowForm(false);
  };

  const handleComplete = () => {
    onComplete({
      invited_users: state.invitedUsers.map((u) => ({
        email: u.email,
        name: u.name,
        role: u.role,
      })),
    });
  };

  const handleSkip = () => {
    onComplete({ invited_users: [] });
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <IconUsers size={28} />
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Invite Team Members
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Invite your team to join {state.enterpriseName}
          </Typography>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }} icon={<IconInfoCircle size={20} />}>
        You can invite team members now or add them later from the admin dashboard.
        Invitations will be sent once the setup is complete.
      </Alert>

      {state.invitedUsers.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell width={60}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.invitedUsers.map((user) => (
                <TableRow key={user.email}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.name || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={roles.find((r) => r.value === user.role)?.label || user.role}
                      size="small"
                      color={user.role === "org:admin" ? "primary" : "default"}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => removeInvitedUser(user.email)}
                      color="error"
                    >
                      <IconTrash size={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {showForm ? (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Stack component="form" onSubmit={handleSubmit(onAddUser)} spacing={2}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <CustomTextField
                customLabel="Email *"
                {...register("email")}
                error={!!errors.email}
                helperText={errors.email?.message}
                placeholder="colleague@company.com"
                fullWidth
              />

              <CustomTextField
                customLabel="Name"
                {...register("name")}
                error={!!errors.name}
                helperText={errors.name?.message}
                placeholder="Jane Smith"
                fullWidth
              />
            </Box>

            <FormControl fullWidth error={!!errors.role}>
              <InputLabel id="role-label" size="small">
                Role *
              </InputLabel>
              <Select
                labelId="role-label"
                label="Role *"
                size="small"
                value={watch("role") || "org:member"}
                onChange={(e) => setValue("role", e.target.value)}
              >
                {roles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    <Box>
                      <Typography variant="body2">{role.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {role.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button variant="text" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Add User
              </Button>
            </Box>
          </Stack>
        </Paper>
      ) : (
        <Button
          variant="outlined"
          startIcon={<IconPlus size={18} />}
          onClick={() => setShowForm(true)}
          sx={{ mb: 3 }}
        >
          Add Team Member
        </Button>
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
          variant="contained"
          size="large"
          onClick={handleComplete}
          disabled={state.isLoading}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
}
