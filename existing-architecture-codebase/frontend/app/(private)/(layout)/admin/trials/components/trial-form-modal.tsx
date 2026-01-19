"use client";
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
  Box,
  Typography,
  MenuItem,
  Select,
  FormControl,
  FormHelperText,
  InputLabel,
  Chip,
} from "@mui/material";
import CustomTextField from "@/components/forms/theme-elements/CustomTextField";
import {
  trialsService,
  Trial,
  Module,
  generateSlug,
} from "@/services/admin/trials-service";
import { IconFlask, IconCheck } from "@tabler/icons-react";
import { toast } from "react-toastify";

interface TrialFormValues {
  name: string;
  description: string;
  icon_url: string;
  module_id: number;
}

const schema = yup.object({
  name: yup.string().required("Study name is required").min(3, "Name must be at least 3 characters"),
  description: yup.string().default(""),
  icon_url: yup.string().url("Enter a valid URL").default(""),
  module_id: yup.number().required("Module is required").min(1, "Please select a module"),
});

interface TrialFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode: "create" | "edit";
  trial?: Trial;
}

const TrialFormModal: React.FC<TrialFormModalProps> = ({
  open,
  onClose,
  onSuccess,
  mode,
  trial,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [previewSlug, setPreviewSlug] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<TrialFormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      icon_url: "",
      module_id: 0,
    },
  });

  const watchName = watch("name");

  useEffect(() => {
    if (watchName) {
      setPreviewSlug(generateSlug(watchName));
    } else {
      setPreviewSlug("");
    }
  }, [watchName]);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const response = await trialsService.getModules();
        setModules(response.data?.modules || []);
      } catch (err) {
        console.error("Failed to fetch modules:", err);
      }
    };

    if (open) {
      fetchModules();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setError(null);
      if (mode === "edit" && trial) {
        reset({
          name: trial.name,
          description: trial.description || "",
          icon_url: trial.icon_url || "",
          module_id: trial.module_id,
        });
        setPreviewSlug(trial.slug);
      } else {
        reset({
          name: "",
          description: "",
          icon_url: "",
          module_id: 0,
        });
        setPreviewSlug("");
      }
    }
  }, [open, mode, trial, reset]);

  const onSubmit = async (data: TrialFormValues) => {
    setLoading(true);
    setError(null);

    try {
      if (mode === "create") {
        await trialsService.createTrial({
          name: data.name,
          slug: generateSlug(data.name),
          description: data.description || undefined,
          icon_url: data.icon_url || undefined,
          module_id: data.module_id,
        });
        toast.success("Trial created successfully", {
          icon: <IconCheck size={18} color="var(--primary-700)" />,
        });
      } else if (mode === "edit" && trial) {
        await trialsService.updateTrial({
          id: trial.id,
          name: data.name,
          description: data.description || undefined,
          icon_url: data.icon_url || undefined,
          module_id: data.module_id,
        });
        toast.success("Study updated successfully", {
          icon: <IconCheck size={18} color="var(--primary-700)" />,
        });
      }

      reset();
      onSuccess?.();
    } catch (err: any) {
      console.error("Study operation failed:", err);
      const errorMessage =
        err.response?.data?.message || `Failed to ${mode} trial. Please try again.`;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{ textAlign: "center", fontWeight: 600, fontSize: 18, pt: 3 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
          <IconFlask size={24} />
          {mode === "create" ? "Add New Study" : "Edit Study"}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={2.5}>
          <CustomTextField
            customLabel="Study Name"
            {...register("name")}
            error={!!errors.name}
            helperText={errors.name?.message}
            placeholder="e.g., Lung Cancer Therapy"
            autoFocus
            fullWidth
          />

          {/* Slug Preview */}
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Generated Slug {mode === "edit" && "(not editable)"}
            </Typography>
            <Box
              sx={{
                bgcolor: "grey.100",
                p: 1.5,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{ fontFamily: "monospace", color: "text.secondary" }}
              >
                {mode === "edit" ? trial?.slug : previewSlug || "slug-will-appear-here"}
              </Typography>
              {(mode === "edit" || previewSlug) && (
                <Chip label="auto-generated" size="small" variant="outlined" />
              )}
            </Box>
          </Box>

          <CustomTextField
            customLabel="Description"
            {...register("description")}
            error={!!errors.description}
            helperText={errors.description?.message}
            placeholder="Enter a brief description of the Study"
            multiline
            rows={3}
            fullWidth
          />

          <CustomTextField
            customLabel="Icon URL"
            {...register("icon_url")}
            error={!!errors.icon_url}
            helperText={errors.icon_url?.message || "Optional: URL for the trial icon"}
            placeholder="https://example.com/icon.png"
            fullWidth
          />

          <FormControl fullWidth error={!!errors.module_id}>
            <Typography
              variant="body2"
              fontWeight={500}
              sx={{ mb: 0.5, color: "text.primary" }}
            >
              Module
            </Typography>
            <Controller
              name="module_id"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  displayEmpty
                  size="small"
                  sx={{ minHeight: 44 }}
                >
                  <MenuItem value={0} disabled>
                    Select a module
                  </MenuItem>
                  {modules.map((module) => (
                    <MenuItem key={module.id} value={module.id}>
                      {module.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
            {errors.module_id && (
              <FormHelperText>{errors.module_id.message}</FormHelperText>
            )}
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", pb: 3, px: 3 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          fullWidth
          size="large"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          disabled={loading}
          loading={loading}
        >
          {mode === "create" ? "Create Study" : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TrialFormModal;
