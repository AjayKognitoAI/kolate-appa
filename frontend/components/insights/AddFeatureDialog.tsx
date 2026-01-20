"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Stack,
  InputAdornment,
  Alert,
  IconButton,
} from "@mui/material";
import { IconX, IconPlus } from "@tabler/icons-react";
import { Characteristic } from "./types";

interface AddFeatureDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (characteristic: Characteristic) => void;
  existingIds: string[];
}

const AddFeatureDialog: React.FC<AddFeatureDialogProps> = ({
  open,
  onClose,
  onAdd,
  existingIds,
}) => {
  const [name, setName] = useState("");
  const [minValue, setMinValue] = useState<number>(0);
  const [maxValue, setMaxValue] = useState<number>(100);
  const [defaultValue, setDefaultValue] = useState<number>(50);
  const [unit, setUnit] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setName("");
    setMinValue(0);
    setMaxValue(100);
    setDefaultValue(50);
    setUnit("");
    setDescription("");
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const validateForm = useCallback((): boolean => {
    if (!name.trim()) {
      setError("Feature name is required");
      return false;
    }

    const id = name.toLowerCase().replace(/\s+/g, "_");
    if (existingIds.includes(id)) {
      setError("A feature with this name already exists");
      return false;
    }

    if (minValue >= maxValue) {
      setError("Minimum value must be less than maximum value");
      return false;
    }

    if (defaultValue < minValue || defaultValue > maxValue) {
      setError("Default value must be between min and max values");
      return false;
    }

    setError(null);
    return true;
  }, [name, minValue, maxValue, defaultValue, existingIds]);

  const handleSubmit = useCallback(() => {
    if (!validateForm()) return;

    const newCharacteristic: Characteristic = {
      id: name.toLowerCase().replace(/\s+/g, "_"),
      name: name.trim(),
      value: defaultValue,
      min: minValue,
      max: maxValue,
      unit: unit.trim() || undefined,
      description: description.trim() || undefined,
      isUserDefined: true,
    };

    onAdd(newCharacteristic);
    handleClose();
  }, [
    name,
    defaultValue,
    minValue,
    maxValue,
    unit,
    description,
    validateForm,
    onAdd,
    handleClose,
  ]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: "var(--shadow-lg)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={600} color="var(--gray-800)">
            Add Custom Feature
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Define a new characteristic to analyze
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ color: "var(--gray-500)" }}
        >
          <IconX size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2.5}>
          <TextField
            label="Feature Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            placeholder="e.g., Hemoglobin Level"
            helperText="Enter a descriptive name for this characteristic"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.5,
              },
            }}
          />

          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              fontWeight={500}
              mb={1}
            >
              Value Range
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Min"
                type="number"
                value={minValue}
                onChange={(e) => setMinValue(Number(e.target.value))}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                  },
                }}
              />
              <TextField
                label="Max"
                type="number"
                value={maxValue}
                onChange={(e) => setMaxValue(Number(e.target.value))}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                  },
                }}
              />
              <TextField
                label="Default"
                type="number"
                value={defaultValue}
                onChange={(e) => setDefaultValue(Number(e.target.value))}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                  },
                }}
              />
            </Stack>
          </Box>

          <TextField
            label="Unit (optional)"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            fullWidth
            placeholder="e.g., g/dL, %, mg/L"
            helperText="Measurement unit for this feature"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.5,
              },
            }}
          />

          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="Brief description of what this feature represents"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.5,
              },
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{
            borderRadius: 1.5,
            borderColor: "var(--gray-300)",
            color: "var(--gray-700)",
            "&:hover": {
              borderColor: "var(--gray-400)",
              bgcolor: "var(--gray-50)",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<IconPlus size={18} />}
          sx={{
            borderRadius: 1.5,
            bgcolor: "var(--primary-600)",
            "&:hover": {
              bgcolor: "var(--primary-700)",
            },
          }}
        >
          Add Feature
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddFeatureDialog;
