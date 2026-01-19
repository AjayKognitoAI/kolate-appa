"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  IconButton,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconChevronDown,
  IconGripVertical,
  IconHash,
  IconAbc,
  IconListDetails,
  IconUpload,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import { useStudyConfig } from "@/context/StudyConfigContext";
import { mlEvaluationAdminService } from "@/services/admin/ml-evaluation-admin-service";
import type { FieldDefinitionRequest, FieldValidation, FieldUIConfig } from "@/types/ml-evaluation-admin.types";
import { toast } from "react-toastify";
import { InfoTooltip } from "@/components/InfoTooltip";

// Field form state
interface FieldFormState {
  name: string;
  type: "number" | "string" | "categorical";
  description: string;
  category: "continuous" | "categorical";
  required: boolean;
  min_value: string;
  max_value: string;
  allowed_values: string;
  group: string;
  display_order: number;
}

const initialFieldForm: FieldFormState = {
  name: "",
  type: "number",
  description: "",
  category: "continuous",
  required: false,
  min_value: "",
  max_value: "",
  allowed_values: "",
  group: "General",
  display_order: 1,
};

// Get icon for field type
const getFieldTypeIcon = (type: string) => {
  switch (type) {
    case "number":
      return <IconHash size={16} />;
    case "string":
      return <IconAbc size={16} />;
    case "categorical":
      return <IconListDetails size={16} />;
    default:
      return <IconHash size={16} />;
  }
};

export default function FieldMetadataStep() {
  const { state, setFieldMetadata, setFieldMetadataId, nextStep, previousStep, markStepCompleted } = useStudyConfig();

  const [fields, setFields] = useState<FieldDefinitionRequest[]>(
    state.fieldMetadata?.fields || []
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formState, setFormState] = useState<FieldFormState>(initialFieldForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Group fields by group
  const groupedFields = fields.reduce((acc, field) => {
    const group = field.ui_config?.group || "General";
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {} as Record<string, FieldDefinitionRequest[]>);

  const handleInputChange = (field: keyof FieldFormState, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const openAddModal = () => {
    setFormState({
      ...initialFieldForm,
      display_order: fields.length + 1,
    });
    setEditingIndex(null);
    setModalOpen(true);
  };

  const openEditModal = (index: number) => {
    const field = fields[index];
    setFormState({
      name: field.name,
      type: field.type,
      description: field.description,
      category: field.category,
      required: field.validation?.required || false,
      min_value: field.validation?.min_value?.toString() || "",
      max_value: field.validation?.max_value?.toString() || "",
      allowed_values: field.validation?.allowed_values?.join(", ") || "",
      group: field.ui_config?.group || "General",
      display_order: field.ui_config?.display_order || index + 1,
    });
    setEditingIndex(index);
    setModalOpen(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formState.name.trim()) {
      newErrors.name = "Field name is required";
    }
    if (!formState.description.trim()) {
      newErrors.description = "Description is required";
    }
    if (formState.type === "categorical" && !formState.allowed_values.trim()) {
      newErrors.allowed_values = "Allowed values are required for categorical fields";
    }

    // Check for duplicate names
    const existingIndex = fields.findIndex(
      (f) => f.name.toLowerCase() === formState.name.toLowerCase()
    );
    if (existingIndex !== -1 && existingIndex !== editingIndex) {
      newErrors.name = "A field with this name already exists";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveField = () => {
    if (!validateForm()) return;

    // Build validation object
    const validation: FieldValidation = {
      required: formState.required,
    };

    if (formState.type === "number") {
      if (formState.min_value) validation.min_value = parseFloat(formState.min_value);
      if (formState.max_value) validation.max_value = parseFloat(formState.max_value);
    }

    if (formState.type === "categorical" && formState.allowed_values) {
      validation.allowed_values = formState.allowed_values
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v);
    }

    // Build UI config
    const ui_config: FieldUIConfig = {
      display_order: formState.display_order,
      group: formState.group,
    };

    const newField: FieldDefinitionRequest = {
      name: formState.name,
      type: formState.type,
      description: formState.description,
      category: formState.category,
      validation,
      ui_config,
    };

    if (editingIndex !== null) {
      // Update existing
      const newFields = [...fields];
      newFields[editingIndex] = newField;
      setFields(newFields);
      toast.success("Field updated");
    } else {
      // Add new
      setFields([...fields, newField]);
      toast.success("Field added");
    }

    setModalOpen(false);
    setFormState(initialFieldForm);
    setEditingIndex(null);
  };

  const handleDeleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
    toast.success("Field deleted");
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n");
      if (lines.length === 0) return;

      // Get headers from first line
      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

      // Create fields from headers
      const newFields: FieldDefinitionRequest[] = headers.map((header, index) => ({
        name: header,
        type: "string" as const,
        description: `Field: ${header}`,
        category: "categorical" as const,
        validation: { required: false },
        ui_config: { display_order: index + 1, group: "General" },
      }));

      setFields((prev) => [...prev, ...newFields]);
      toast.success(`Imported ${newFields.length} fields from CSV headers`);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    }

    // Reset input
    e.target.value = "";
  };

  const handleSaveChanges = async () => {
    if (fields.length === 0) {
      toast.error("Please add at least one field before saving");
      return;
    }

    setIsSaving(true);

    try {
      // Build field metadata request
      const fieldMetadataRequest = {
        trial_slug: state.studySlug,
        module_id: state.moduleId,
        version: 1,
        fields,
      };

      // Call API to save field metadata (backend handles upsert)
      const response = await mlEvaluationAdminService.createFieldMetadata(fieldMetadataRequest);

      // Update context with saved data
      setFieldMetadata(fieldMetadataRequest);
      setFieldMetadataId(response.metadata_id);
      markStepCompleted(2);

      toast.success("Field metadata saved successfully!");
    } catch (error: any) {
      console.error("Failed to save field metadata:", error);
      const errorMessage = error.response?.data?.message || "Failed to save field metadata";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (fields.length === 0) {
      toast.error("Please add at least one field before proceeding");
      return;
    }

    // Save to context (will be persisted when activating configuration)
    setFieldMetadata({
      trial_slug: state.studySlug,
      module_id: state.moduleId,
      version: 1,
      fields,
    });

    markStepCompleted(2);
    nextStep();
  };

  return (
    <Box>
      {/* Header with actions */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" fontWeight="600">
                Input Fields ({fields.length})
              </Typography>
              <InfoTooltip
                title="Prediction Input Fields"
                description="These are the data points users will provide to get predictions. Each field should match exactly what your model was trained on (same names, types, and ranges)."
                variant="inline"
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Define what information users enter for predictions
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <input
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              id="csv-import-input"
              onChange={handleImportCSV}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <label htmlFor="csv-import-input">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<IconUpload size={18} />}
                >
                  Import from CSV
                </Button>
              </label>
              <InfoTooltip
                title="Quick Import"
                description="Upload a CSV file to automatically create fields from column headers. You'll still need to configure types and validation afterward."
                variant="inline"
                size="small"
              />
            </Box>
            <Button
              variant="contained"
              startIcon={<IconPlus size={18} />}
              onClick={openAddModal}
            >
              Add Field
            </Button>
          </Box>
        </Box>

        {/* Fields list grouped */}
        {fields.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              py: 6,
              bgcolor: "grey.50",
              borderRadius: 2,
              border: "2px dashed",
              borderColor: "grey.300",
            }}
          >
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No fields defined yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add fields manually or import from a CSV file
            </Typography>
          </Box>
        ) : (
          Object.entries(groupedFields).map(([group, groupFields]) => (
            <Accordion key={group} defaultExpanded sx={{ mb: 1, "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<IconChevronDown />}>
                <Typography fontWeight="600">{group}</Typography>
                <Chip label={groupFields.length} size="small" sx={{ ml: 2 }} />
              </AccordionSummary>
              <AccordionDetails>
                {groupFields.map((field) => {
                  const fieldIndex = fields.findIndex((f) => f.name === field.name);
                  return (
                    <Card
                      key={field.name}
                      sx={{
                        mb: 1,
                        border: 1,
                        borderColor: "divider",
                        "&:last-child": { mb: 0 },
                      }}
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          py: 1.5,
                          "&:last-child": { pb: 1.5 },
                        }}
                      >
                        <IconGripVertical size={18} style={{ color: "#9e9e9e", cursor: "grab" }} />
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor:
                              field.type === "number"
                                ? "info.lighter"
                                : field.type === "categorical"
                                ? "warning.lighter"
                                : "grey.200",
                            color:
                              field.type === "number"
                                ? "info.main"
                                : field.type === "categorical"
                                ? "warning.main"
                                : "grey.700",
                          }}
                        >
                          {getFieldTypeIcon(field.type)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="body2" fontWeight="600">
                              {field.name}
                            </Typography>
                            {field.validation?.required && (
                              <Chip label="Required" size="small" color="error" variant="outlined" />
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {field.description}
                          </Typography>
                        </Box>
                        <Chip label={field.type} size="small" variant="outlined" />
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEditModal(fieldIndex)}>
                            <IconEdit size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteField(fieldIndex)}
                          >
                            <IconTrash size={16} />
                          </IconButton>
                        </Tooltip>
                      </CardContent>
                    </Card>
                  );
                })}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Paper>

      {/* Navigation */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 3 }}>
        <Button variant="outlined" size="large" onClick={previousStep}>
          Back
        </Button>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <IconDeviceFloppy size={18} />}
            onClick={handleSaveChanges}
            disabled={fields.length === 0 || isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={handleNext}
            disabled={fields.length === 0}
          >
            Next: Link Models
          </Button>
        </Box>
      </Box>

      {/* Add/Edit Field Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {editingIndex !== null ? "Edit Field" : "Add New Field"}
            <InfoTooltip
              title="Field Configuration"
              description="Set up a data field for predictions. The field name must exactly match your model's training data."
              variant="inline"
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                <Typography variant="body2" fontWeight="500">
                  Field Name <Typography component="span" color="error.main">*</Typography>
                </Typography>
                <InfoTooltip
                  title="Exact Field Name"
                  description="CRITICAL: Must match the exact feature name from your model's training data (including capitalization, underscores, etc.). Example: 'Age', 'ECOG_Score', 'LDH_Level'"
                  variant="inline"
                  size="small"
                />
              </Box>
              <TextField
                fullWidth
                placeholder="e.g., Age, ECOG_Score, LDH_Level"
                value={formState.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                error={!!errors.name}
                helperText={errors.name || "Must match training data exactly"}
                required
              />
            </Box>

            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                <Typography variant="body2" fontWeight="500">
                  Description <Typography component="span" color="error.main">*</Typography>
                </Typography>
                <InfoTooltip
                  title="Field Description"
                  description="Clear explanation for users. Include units (years, mg/dL), range, and what the field represents. Example: 'Patient age at diagnosis in years'"
                  variant="inline"
                  size="small"
                />
              </Box>
              <TextField
                fullWidth
                placeholder="e.g., Patient age at diagnosis in years (0-120)"
                value={formState.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                error={!!errors.description}
                helperText={errors.description || "Include units and expected range"}
                required
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                  <Typography variant="body2" fontWeight="500">Type</Typography>
                  <InfoTooltip
                    title="Data Type"
                    description="Number: Numerical values (age, lab results). String: Text (IDs, notes). Categorical: Fixed options (gender, stage)"
                    variant="inline"
                    size="small"
                  />
                </Box>
                <FormControl fullWidth>
                  <Select
                    value={formState.type}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      handleInputChange("type", newType);
                      handleInputChange(
                        "category",
                        newType === "number" ? "continuous" : "categorical"
                      );
                    }}
                  >
                    <MenuItem value="number">Number</MenuItem>
                    <MenuItem value="string">String</MenuItem>
                    <MenuItem value="categorical">Categorical</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                  <Typography variant="body2" fontWeight="500">Category</Typography>
                  <InfoTooltip
                    title="Statistical Category"
                    description="Continuous: Can be any value in a range (age, weight). Categorical: Distinct groups (gender, stage, yes/no)"
                    variant="inline"
                    size="small"
                  />
                </Box>
                <FormControl fullWidth>
                  <Select
                    value={formState.category}
                    onChange={(e) => handleInputChange("category", e.target.value)}
                  >
                    <MenuItem value="continuous">Continuous</MenuItem>
                    <MenuItem value="categorical">Categorical</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {formState.type === "number" && (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                  <Typography variant="body2" fontWeight="500">Validation Range</Typography>
                  <InfoTooltip
                    title="Number Validation"
                    description="Set acceptable range for this number. Example: Age 0-120, ECOG Score 0-5. Helps catch data entry errors."
                    variant="inline"
                    size="small"
                  />
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Min Value"
                    type="number"
                    placeholder="0"
                    value={formState.min_value}
                    onChange={(e) => handleInputChange("min_value", e.target.value)}
                    helperText="Minimum allowed"
                  />
                  <TextField
                    fullWidth
                    label="Max Value"
                    type="number"
                    placeholder="120"
                    value={formState.max_value}
                    onChange={(e) => handleInputChange("max_value", e.target.value)}
                    helperText="Maximum allowed"
                  />
                </Box>
              </Box>
            )}

            {formState.type === "categorical" && (
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                  <Typography variant="body2" fontWeight="500">
                    Allowed Values <Typography component="span" color="error.main">*</Typography>
                  </Typography>
                  <InfoTooltip
                    title="Category Options"
                    description="All possible values users can select. Must match training data exactly. Example: 'Male, Female, Other' or 'CR, PR, SD, PD'"
                    variant="inline"
                    size="small"
                  />
                </Box>
                <TextField
                  fullWidth
                  placeholder="Male, Female, Other"
                  value={formState.allowed_values}
                  onChange={(e) => handleInputChange("allowed_values", e.target.value)}
                  error={!!errors.allowed_values}
                  helperText={errors.allowed_values || "Comma-separated (e.g., Male, Female, Other)"}
                />
              </Box>
            )}

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                  <Typography variant="body2" fontWeight="500">Group</Typography>
                  <InfoTooltip
                    title="Field Grouping"
                    description="Organize related fields (e.g., 'Demographics', 'Clinical', 'Laboratory'). Makes forms easier to fill out."
                    variant="inline"
                    size="small"
                  />
                </Box>
                <TextField
                  fullWidth
                  placeholder="Demographics"
                  value={formState.group}
                  onChange={(e) => handleInputChange("group", e.target.value)}
                  helperText="e.g., Demographics, Clinical"
                />
              </Box>

              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                  <Typography variant="body2" fontWeight="500">Display Order</Typography>
                  <InfoTooltip
                    title="Field Order"
                    description="Controls where this field appears in forms. Lower numbers appear first. Use gaps (10, 20, 30) for easy reordering."
                    variant="inline"
                    size="small"
                  />
                </Box>
                <TextField
                  fullWidth
                  type="number"
                  placeholder="1"
                  value={formState.display_order}
                  onChange={(e) => handleInputChange("display_order", parseInt(e.target.value) || 1)}
                  helperText="Lower numbers appear first"
                />
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formState.required}
                    onChange={(e) => handleInputChange("required", e.target.checked)}
                  />
                }
                label="Required field"
              />
              <InfoTooltip
                title="Required Field"
                description="Enable if users MUST provide this field for predictions. Only mark truly essential fields as required."
                variant="inline"
                size="small"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveField}>
            {editingIndex !== null ? "Save Changes" : "Add Field"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
