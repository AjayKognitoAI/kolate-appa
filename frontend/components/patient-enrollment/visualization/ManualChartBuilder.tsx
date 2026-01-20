"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Paper,
  Divider,
} from "@mui/material"
import type { PatientData } from "@/lib/screening-logic"
import type { ColumnType, EnhancedColumnSchema } from "@/types/cohort.types"
import type { ManualChartConfig, ChartType, ChartDataPoint, HistogramDataPoint } from "./visualization.types"
import { CategoryBarChart } from "./CategoryBarChart"
import { PieChartWrapper } from "./PieChartWrapper"
import { HistogramChart } from "./HistogramChart"
import {
  getValueDistribution,
  createHistogramData,
  transformDataForManualChart,
  formatColumnTitle,
} from "./visualization.utils"

interface ManualChartBuilderProps {
  open: boolean
  onClose: () => void
  onSave: (config: ManualChartConfig) => void
  data: PatientData[]
  columns: Record<string, ColumnType>
  columnMetadata?: EnhancedColumnSchema | null
  existingConfig?: ManualChartConfig
}

const CHART_TYPE_OPTIONS: { value: ChartType; label: string; description: string }[] = [
  { value: "bar", label: "Bar Chart", description: "Compare categories" },
  { value: "pie", label: "Pie Chart", description: "Show proportions" },
  { value: "histogram", label: "Histogram", description: "Distribution of values" },
]

const AGGREGATION_OPTIONS: { value: ManualChartConfig["aggregation"]; label: string }[] = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
]

export function ManualChartBuilder({
  open,
  onClose,
  onSave,
  data,
  columns,
  columnMetadata,
  existingConfig,
}: ManualChartBuilderProps) {
  const [title, setTitle] = useState("")
  const [chartType, setChartType] = useState<ChartType>("bar")
  const [columnName, setColumnName] = useState("")
  const [aggregation, setAggregation] = useState<ManualChartConfig["aggregation"]>("count")
  const [groupBy, setGroupBy] = useState("")

  // Initialize from existing config if editing
  useEffect(() => {
    if (existingConfig) {
      setTitle(existingConfig.title)
      setChartType(existingConfig.chartType)
      setColumnName(existingConfig.columnName)
      setAggregation(existingConfig.aggregation)
      setGroupBy(existingConfig.groupBy || "")
    } else {
      setTitle("")
      setChartType("bar")
      setColumnName("")
      setAggregation("count")
      setGroupBy("")
    }
  }, [existingConfig, open])

  // Get sorted column options
  const columnOptions = useMemo(() => {
    return Object.entries(columns)
      .map(([name, type]) => ({
        name,
        type,
        label: formatColumnTitle(name, columnMetadata),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [columns, columnMetadata])

  // Get numeric columns for aggregation
  const numericColumns = useMemo(() => {
    return columnOptions.filter((col) => col.type === "number")
  }, [columnOptions])

  // Get categorical columns for groupBy
  const categoricalColumns = useMemo(() => {
    return columnOptions.filter((col) => col.type === "categorical" || col.type === "string")
  }, [columnOptions])

  // Preview data
  const previewData = useMemo<ChartDataPoint[] | HistogramDataPoint[]>(() => {
    if (!columnName || data.length === 0) return []

    try {
      if (chartType === "histogram") {
        return createHistogramData(data, columnName)
      } else if (groupBy) {
        return transformDataForManualChart(data, columnName, aggregation, groupBy)
      } else {
        return getValueDistribution(data, columnName)
      }
    } catch {
      return []
    }
  }, [data, columnName, chartType, aggregation, groupBy])

  const handleSave = () => {
    if (!title.trim() || !columnName) return

    const config: ManualChartConfig = {
      id: existingConfig?.id || `manual-${Date.now()}`,
      title: title.trim(),
      chartType,
      columnName,
      aggregation,
      groupBy: groupBy || undefined,
    }

    onSave(config)
  }

  const isValid = title.trim() && columnName

  // Render preview chart
  const renderPreview = () => {
    if (previewData.length === 0) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            minHeight: 240,
            bgcolor: "#fff",
            borderRadius: 2,
            border: "2px dashed #e2e8f0",
            p: 3,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <Box
              component="svg"
              sx={{ width: 24, height: 24, color: "#94a3b8" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </Box>
          </Box>
          <Typography
            sx={{
              color: "#64748b",
              fontSize: "0.875rem",
              fontWeight: 500,
              textAlign: "center",
            }}
          >
            Select a column to preview
          </Typography>
          <Typography
            sx={{
              color: "#94a3b8",
              fontSize: "0.75rem",
              textAlign: "center",
              mt: 0.5,
            }}
          >
            Your chart will appear here
          </Typography>
        </Box>
      )
    }

    switch (chartType) {
      case "histogram":
        return <HistogramChart data={previewData as HistogramDataPoint[]} height={240} />
      case "pie":
        return <PieChartWrapper data={previewData as ChartDataPoint[]} height={240} />
      default:
        return <CategoryBarChart data={previewData as ChartDataPoint[]} height={240} />
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: 1,
          pt: 3,
          px: 3,
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "text.primary",
        }}
      >
        {existingConfig ? "Edit Chart" : "Create Custom Chart"}
      </DialogTitle>
      <DialogContent sx={{ px: 3, py: 2 }}>
        <Box
          sx={{
            display: "flex",
            gap: 4,
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          {/* Left side - Configuration */}
          <Box
            sx={{
              flex: { xs: "1 1 auto", md: "0 0 280px" },
              display: "flex",
              flexDirection: "column",
              gap: 2.5,
            }}
          >
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  mb: 1.5,
                  display: "block",
                }}
              >
                Chart Settings
              </Typography>
              <TextField
                label="Chart Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                size="small"
                placeholder="e.g., Age Distribution"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                  },
                }}
              />
            </Box>

            <FormControl fullWidth size="small">
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={chartType}
                label="Chart Type"
                onChange={(e) => setChartType(e.target.value as ChartType)}
                sx={{ borderRadius: 1.5 }}
              >
                {CHART_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {option.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Data Column</InputLabel>
              <Select
                value={columnName}
                label="Data Column"
                onChange={(e) => setColumnName(e.target.value)}
                sx={{ borderRadius: 1.5 }}
              >
                {(chartType === "histogram" ? numericColumns : columnOptions).map((col) => (
                  <MenuItem key={col.name} value={col.name}>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {col.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {col.type} • {col.name}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {chartType !== "histogram" && chartType !== "pie" && (
              <>
                <Divider sx={{ my: 0.5 }} />
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Advanced Options
                </Typography>

                <FormControl fullWidth size="small">
                  <InputLabel>Aggregation</InputLabel>
                  <Select
                    value={aggregation}
                    label="Aggregation"
                    onChange={(e) => setAggregation(e.target.value as ManualChartConfig["aggregation"])}
                    sx={{ borderRadius: 1.5 }}
                  >
                    {AGGREGATION_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Group By (Optional)</InputLabel>
                  <Select
                    value={groupBy}
                    label="Group By (Optional)"
                    onChange={(e) => setGroupBy(e.target.value)}
                    sx={{ borderRadius: 1.5 }}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {categoricalColumns
                      .filter((col) => col.name !== columnName)
                      .map((col) => (
                        <MenuItem key={col.name} value={col.name}>
                          {col.label}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>

          {/* Right side - Preview */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                bgcolor: "#f8fafc",
                border: "1px solid",
                borderColor: "#e2e8f0",
                borderRadius: 2,
                height: "100%",
                minHeight: 320,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  mb: 2,
                }}
              >
                Preview
              </Typography>
              <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {renderPreview()}
              </Box>
            </Paper>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          py: 2.5,
          borderTop: "1px solid",
          borderColor: "divider",
          gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            color: "primary.main",
            fontWeight: 500,
            "&:hover": {
              bgcolor: "primary.50",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!isValid}
          sx={{
            borderRadius: 1.5,
            px: 3,
            fontWeight: 500,
            textTransform: "none",
            boxShadow: "none",
            "&:hover": {
              boxShadow: "none",
            },
          }}
        >
          {existingConfig ? "Update Chart" : "Create Chart"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
