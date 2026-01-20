import React, { useState } from "react";
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
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  projectService,
  UpdateProjectRequest,
  ProjectResponse,
} from "@/services/project/project-service";

interface ProjectUpdateModalProps {
  open: boolean;
  onClose: () => void;
  project: ProjectResponse;
  onUpdated: (project: ProjectResponse) => void;
  currentUserEmail: string;
}

type UpdateProjectForm = {
  name: string;
  description: string;
  updated_by: string;
};

const schema = yup.object({
  name: yup.string().required("Project name is required"),
  description: yup.string().required("Project description is required"),
  updated_by: yup.string().required("Updated by is required"),
});

const ProjectUpdateModal: React.FC<ProjectUpdateModalProps> = ({
  open,
  onClose,
  project,
  onUpdated,
  currentUserEmail,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateProjectForm>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: project.name,
      description: project.description,
      updated_by: currentUserEmail,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        name: project.name,
        description: project.description,
        updated_by: currentUserEmail,
      });
      setError(null);
    }
  }, [open, project, currentUserEmail, reset]);

  const onSubmit = async (data: UpdateProjectForm) => {
    setLoading(true);
    setError(null);
    try {
      // Compose the update payload, keeping status unchanged
      const payload = {
        ...data,
        status: project.status || "ACTIVE",
      };
      const res = await projectService.updateProject(project.id, payload);
      onUpdated(res.data);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Update Project</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {error && <Alert severity="error">{error}</Alert>}
          <CustomTextField
            customLabel="Project Name"
            {...register("name")}
            error={!!errors.name}
            helperText={errors.name?.message}
            fullWidth
          />
          <CustomTextField
            customLabel="Description"
            {...register("description")}
            error={!!errors.description}
            helperText={errors.description?.message}
            fullWidth
            multiline
            minRows={3}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          color="primary"
          disabled={loading}
        >
          Update
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProjectUpdateModal;
