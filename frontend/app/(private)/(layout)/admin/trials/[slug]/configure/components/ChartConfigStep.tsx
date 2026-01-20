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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
} from "@mui/material";
import {
  IconChartBar,
  IconChartPie,
  IconChartDonut,
  IconChartLine,
  IconChartArea,
  IconPlus,
  IconTrash,
  IconEdit,
} from "@tabler/icons-react";
import { useStudyConfig } from "@/context/StudyConfigContext";
import type { ChartConfigRequest, ChartTypeRequest } from "@/types/ml-evaluation-admin.types";
import { toast } from "react-toastify";
import { InfoTooltip } from "@/components/InfoTooltip";

// Chart type icons
const chartTypeIcons: Record<string, React.ReactNode> = {
  bar: <IconChartBar size={18} />,
  pie: <IconChartPie size={18} />,
  donut: <IconChartDonut size={18} />,
  line: <IconChartLine size={18} />,
  area: <IconChartArea size={18} />,
  stacked_bar: <IconChartBar size={18} />,
  horizontal_bar: <IconChartBar size={18} style={{ transform: "rotate(90deg)" }} />,
};

// Chart form state
interface ChartFormState {
  name: string;
  field: string;
  order: string;
  chart_type: string;
  is_distribution: boolean;
  custom_grouping: boolean;
  grouping_type: string;
}

const initialChartForm: ChartFormState = {
  name: "",
  field: "",
  order: "",
  chart_type: "bar",
  is_distribution: false,
  custom_grouping: false,
  grouping_type: "",
};

export default function ChartConfigStep() {
  const { state, setChartConfig, nextStep, previousStep, markStepCompleted } = useStudyConfig();

  const [chartsEnabled, setChartsEnabled] = useState(state.chartConfig?.enabled ?? false);
  const [mongoCollection, setMongoCollection] = useState(
    state.chartConfig?.mongo_collection || ""
  );
  const [responseField, setResponseField] = useState(state.chartConfig?.response_field || "");
  const [chartTypes, setChartTypes] = useState<ChartTypeRequest[]>(
    state.chartConfig?.chart_types || []
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formState, setFormState] = useState<ChartFormState>(initialChartForm);

  const handleInputChange = (field: keyof ChartFormState, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const openAddModal = () => {
    setFormState(initialChartForm);
    setEditingIndex(null);
    setModalOpen(true);
  };

  const openEditModal = (index: number) => {
    const chart = chartTypes[index];
    setFormState({
      name: chart.name,
      field: chart.field,
      order: chart.order.join(", "),
      chart_type: chart.chart_type || "bar",
      is_distribution: chart.is_distribution || false,
      custom_grouping: chart.custom_grouping || false,
      grouping_type: chart.grouping_type || "",
    });
    setEditingIndex(index);
    setModalOpen(true);
  };

  const handleSaveChart = () => {
    if (!formState.name.trim() || !formState.field.trim()) {
      toast.error("Name and field are required");
      return;
    }

    const newChart: ChartTypeRequest = {
      name: formState.name,
      field: formState.field,
      order: formState.order
        .split(",")
        .map((o) => o.trim())
        .filter((o) => o),
      chart_type: formState.chart_type as any,
      is_distribution: formState.is_distribution,
      custom_grouping: formState.custom_grouping,
      grouping_type: formState.grouping_type || undefined,
    };

    if (editingIndex !== null) {
      const newChartTypes = [...chartTypes];
      newChartTypes[editingIndex] = newChart;
      setChartTypes(newChartTypes);
      toast.success("Chart updated");
    } else {
      setChartTypes([...chartTypes, newChart]);
      toast.success("Chart added");
    }

    setModalOpen(false);
    setFormState(initialChartForm);
    setEditingIndex(null);
  };

  const handleDeleteChart = (index: number) => {
    setChartTypes(chartTypes.filter((_, i) => i !== index));
    toast.success("Chart removed");
  };

  const handleNext = () => {
    // Save chart config
    if (chartsEnabled) {
      if (!mongoCollection.trim()) {
        toast.error("MongoDB collection is required when charts are enabled");
        return;
      }

      const config: ChartConfigRequest = {
        enabled: true,
        mongo_collection: mongoCollection,
        response_field: responseField,
        chart_types: chartTypes,
      };
      setChartConfig(config);
    } else {
      setChartConfig({ enabled: false });
    }

    markStepCompleted(4);
    nextStep();
  };

  return (
    <Box>
      {/* Enable/Disable Charts */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" fontWeight="600">
                Charts & Analytics
              </Typography>
              <InfoTooltip
                title="Data Visualizations"
                description="Enable charts to visualize patient outcomes and study data. Useful for showing response rates, demographics, and trends. Requires historical patient data in MongoDB."
                variant="inline"
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Visualize study outcomes and patient data
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={chartsEnabled}
                onChange={(e) => setChartsEnabled(e.target.checked)}
              />
            }
            label={chartsEnabled ? "Enabled" : "Disabled"}
          />
        </Box>
      </Paper>

      {chartsEnabled && (
        <>
          {/* Chart Data Configuration */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Typography variant="h6" fontWeight="600">
                Data Configuration
              </Typography>
              <InfoTooltip
                title="Chart Data Source"
                description="Specify where chart data is stored and which field contains patient outcomes."
                variant="inline"
              />
            </Box>

            <Box
              sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}
            >
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                  <Typography variant="body2" fontWeight="500">
                    MongoDB Collection <Typography component="span" color="error.main">*</Typography>
                  </Typography>
                  <InfoTooltip
                    title="Database Collection"
                    description="Name of the MongoDB collection containing patient outcome data. Ask your database administrator if you're unsure. Example: 'cart_therapy_patients'"
                    variant="inline"
                    size="small"
                  />
                </Box>
                <TextField
                  fullWidth
                  placeholder="study_chart_patients"
                  value={mongoCollection}
                  onChange={(e) => setMongoCollection(e.target.value)}
                  helperText="Example: cart_therapy_patients"
                  required
                />
              </Box>

              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                  <Typography variant="body2" fontWeight="500">Response Field</Typography>
                  <InfoTooltip
                    title="Outcome Field Name"
                    description="Database field containing patient response/outcome (e.g., 'bestrespg', 'outcome', 'response_status'). Used to calculate response rates."
                    variant="inline"
                    size="small"
                  />
                </Box>
                <TextField
                  fullWidth
                  placeholder="bestrespg"
                  value={responseField}
                  onChange={(e) => setResponseField(e.target.value)}
                  helperText="Field with CR/PR/SD/PD values"
                />
              </Box>
            </Box>
          </Paper>

          {/* Chart Types */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}
            >
              <Typography variant="h6" fontWeight="600">
                Chart Types ({chartTypes.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<IconPlus size={18} />}
                onClick={openAddModal}
              >
                Add Chart
              </Button>
            </Box>

            {chartTypes.length === 0 ? (
              <Alert severity="info">
                No chart types configured. Add charts to visualize your study data.
              </Alert>
            ) : (
              <Box>
                {chartTypes.map((chart, index) => (
                  <Card
                    key={index}
                    sx={{
                      mb: 2,
                      border: 1,
                      borderColor: "divider",
                      "&:last-child": { mb: 0 },
                    }}
                  >
                    <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          bgcolor: "primary.lighter",
                          color: "primary.main",
                          display: "flex",
                        }}
                      >
                        {chartTypeIcons[chart.chart_type || "bar"]}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight="600">
                          {chart.name}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                          <Chip label={`Field: ${chart.field}`} size="small" variant="outlined" />
                          <Chip
                            label={chart.chart_type || "bar"}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          {chart.is_distribution && (
                            <Chip label="Distribution" size="small" variant="outlined" />
                          )}
                        </Box>
                      </Box>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEditModal(index)}>
                          <IconEdit size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteChart(index)}
                        >
                          <IconTrash size={16} />
                        </IconButton>
                      </Tooltip>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>
        </>
      )}

      {!chartsEnabled && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Charts are disabled. You can enable them later from the study configuration.
        </Alert>
      )}

      {/* Navigation */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
        <Button variant="outlined" size="large" onClick={previousStep}>
          Back
        </Button>
        <Button variant="contained" size="large" onClick={handleNext}>
          Next: Preview & Test
        </Button>
      </Box>

      {/* Add/Edit Chart Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingIndex !== null ? "Edit Chart" : "Add New Chart"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Chart Name"
              placeholder="e.g., Age Distribution, Gender Analysis"
              value={formState.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Data Field"
              placeholder="e.g., ptage, sex_id, ldh_ipi"
              value={formState.field}
              onChange={(e) => handleInputChange("field", e.target.value)}
              helperText="MongoDB field to aggregate"
              required
            />
            <FormControl fullWidth>
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={formState.chart_type}
                label="Chart Type"
                onChange={(e) => handleInputChange("chart_type", e.target.value)}
              >
                <MenuItem value="bar">Bar Chart</MenuItem>
                <MenuItem value="horizontal_bar">Horizontal Bar</MenuItem>
                <MenuItem value="stacked_bar">Stacked Bar</MenuItem>
                <MenuItem value="pie">Pie Chart</MenuItem>
                <MenuItem value="donut">Donut Chart</MenuItem>
                <MenuItem value="line">Line Chart</MenuItem>
                <MenuItem value="area">Area Chart</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Category Order"
              placeholder="Normal, Elevated, High"
              value={formState.order}
              onChange={(e) => handleInputChange("order", e.target.value)}
              helperText="Comma-separated order of categories"
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formState.is_distribution}
                    onChange={(e) => handleInputChange("is_distribution", e.target.checked)}
                  />
                }
                label="Distribution Chart"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formState.custom_grouping}
                    onChange={(e) => handleInputChange("custom_grouping", e.target.checked)}
                  />
                }
                label="Custom Grouping"
              />
            </Box>
            {formState.custom_grouping && (
              <TextField
                fullWidth
                label="Grouping Type"
                placeholder="age, range"
                value={formState.grouping_type}
                onChange={(e) => handleInputChange("grouping_type", e.target.value)}
                helperText="Type of grouping to apply"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveChart}>
            {editingIndex !== null ? "Save Changes" : "Add Chart"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
