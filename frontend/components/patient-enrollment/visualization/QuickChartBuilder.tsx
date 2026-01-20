"use client"

import { useState, useMemo, useRef } from "react"
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
} from "@mui/material"
import {
  ExpandMore,
  ExpandLess,
  Download,
  BarChart as BarChartIcon,
  PieChartOutlined,
  ShowChart,
} from "@mui/icons-material"
import type { PatientData } from "@/lib/screening-logic"
import type { ColumnType, EnhancedColumnSchema } from "@/types/cohort.types"
import type { ChartType, ChartDataPoint, HistogramDataPoint } from "./visualization.types"
import { CategoryBarChart } from "./CategoryBarChart"
import { PieChartWrapper } from "./PieChartWrapper"
import { HistogramChart } from "./HistogramChart"
import { ChartDownloadButton } from "./ChartDownloadButton"
import {
  getValueDistribution,
  createHistogramData,
  formatColumnTitle,
  transformDataForManualChart,
} from "./visualization.utils"

interface QuickChartBuilderProps {
  data: PatientData[]
  columns: Record<string, ColumnType>
  columnMetadata?: EnhancedColumnSchema | null
  chartHeight?: number
}

const CHART_TYPES: { value: ChartType; label: string; icon: typeof BarChartIcon }[] = [
  { value: "bar", label: "Bar", icon: BarChartIcon },
  { value: "pie", label: "Pie", icon: PieChartOutlined },
  { value: "histogram", label: "Distribution", icon: ShowChart },
]

export function QuickChartBuilder({
  data,
  columns,
  columnMetadata,
  chartHeight = 220,
}: QuickChartBuilderProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState("")
  const [groupByColumn, setGroupByColumn] = useState("")
  const [chartType, setChartType] = useState<ChartType>("bar")
  const chartRef = useRef<HTMLDivElement>(null)

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

  // Filter columns based on chart type
  const filteredColumns = useMemo(() => {
    if (chartType === "histogram") {
      return columnOptions.filter((col) => col.type === "number")
    }
    return columnOptions
  }, [columnOptions, chartType])

  // Get categorical columns for groupBy (only for bar charts)
  const groupByColumns = useMemo(() => {
    return columnOptions.filter(
      (col) =>
        (col.type === "categorical" || col.type === "string") &&
        col.name !== selectedColumn
    )
  }, [columnOptions, selectedColumn])

  // Generate chart data
  const chartData = useMemo<ChartDataPoint[] | HistogramDataPoint[]>(() => {
    if (!selectedColumn || data.length === 0) return []

    try {
      if (chartType === "histogram") {
        return createHistogramData(data, selectedColumn)
      } else if (chartType === "bar" && groupByColumn) {
        // Use grouped data for bar charts with groupBy
        return transformDataForManualChart(data, selectedColumn, "count", groupByColumn)
      } else {
        return getValueDistribution(data, selectedColumn)
      }
    } catch {
      return []
    }
  }, [data, selectedColumn, groupByColumn, chartType])

  // Reset column when chart type changes and current column is invalid
  const handleChartTypeChange = (newType: ChartType) => {
    setChartType(newType)
    // Clear groupBy when switching away from bar chart
    if (newType !== "bar") {
      setGroupByColumn("")
    }
    if (newType === "histogram") {
      const numericColumns = columnOptions.filter((col) => col.type === "number")
      if (!numericColumns.find((col) => col.name === selectedColumn)) {
        setSelectedColumn(numericColumns[0]?.name || "")
      }
    }
  }

  // Clear groupBy when primary column changes to same value
  const handleColumnChange = (newColumn: string) => {
    setSelectedColumn(newColumn)
    if (newColumn === groupByColumn) {
      setGroupByColumn("")
    }
  }

  // Render the chart
  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: chartHeight,
            color: "#94a3b8",
            fontSize: "0.85rem",
            gap: 0.5,
          }}
        >
          <Typography variant="body2" sx={{ color: "#64748b" }}>
            Select columns to visualize
          </Typography>
          <Typography variant="caption" sx={{ color: "#94a3b8" }}>
            {chartType === "bar"
              ? "Choose values and optionally group by another column"
              : chartType === "histogram"
                ? "Select a numeric column to see distribution"
                : "Select a column to see proportions"
            }
          </Typography>
        </Box>
      )
    }

    switch (chartType) {
      case "histogram":
        return <HistogramChart data={chartData as HistogramDataPoint[]} height={chartHeight} />
      case "pie":
        return <PieChartWrapper data={chartData as ChartDataPoint[]} height={chartHeight} />
      default:
        return <CategoryBarChart data={chartData as ChartDataPoint[]} height={chartHeight} />
    }
  }

  const filename = selectedColumn
    ? `quick-chart-${selectedColumn.toLowerCase().replace(/\s+/g, "-")}${groupByColumn ? `-by-${groupByColumn.toLowerCase().replace(/\s+/g, "-")}` : ""}-${Date.now()}`
    : "quick-chart"

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2.5,
        border: "1px solid #e5e7eb",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      {/* Header - Always visible */}
      <Box
        onClick={() => setIsExpanded(!isExpanded)}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          cursor: "pointer",
          bgcolor: isExpanded ? "#f8fafc" : "transparent",
          borderBottom: isExpanded ? "1px solid #e5e7eb" : "none",
          transition: "all 0.2s",
          "&:hover": {
            bgcolor: "#f8fafc",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <BarChartIcon sx={{ fontSize: 18, color: "#6366f1" }} />
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: "#374151" }}
          >
            Quick Chart Builder
          </Typography>
          <Chip
            label="Explore any column"
            size="small"
            sx={{
              height: 20,
              fontSize: "0.65rem",
              bgcolor: "#f3f4f6",
              color: "#6b7280",
            }}
          />
        </Box>
        <IconButton size="small" sx={{ color: "#9ca3af" }}>
          {isExpanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      {/* Expandable Content */}
      <Collapse in={isExpanded}>
        <Box sx={{ p: 2 }}>
          {/* Controls Row */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              mb: 2,
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            {/* Chart Type Selector */}
            <Box sx={{ display: "flex", gap: 0.5 }}>
              {CHART_TYPES.map((type) => {
                const Icon = type.icon
                const isSelected = chartType === type.value
                return (
                  <Tooltip key={type.value} title={type.label} arrow>
                    <IconButton
                      size="small"
                      onClick={() => handleChartTypeChange(type.value)}
                      sx={{
                        borderRadius: 1,
                        bgcolor: isSelected ? "#6366f1" : "#f3f4f6",
                        color: isSelected ? "#fff" : "#6b7280",
                        "&:hover": {
                          bgcolor: isSelected ? "#4f46e5" : "#e5e7eb",
                        },
                      }}
                    >
                      <Icon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                )
              })}
            </Box>

            {/* Column Selector */}
            <FormControl size="small" sx={{ minWidth: 180, flex: 1, maxWidth: 240 }}>
              <InputLabel>{chartType === "bar" ? "Values (Y-Axis)" : "Column"}</InputLabel>
              <Select
                value={selectedColumn}
                label={chartType === "bar" ? "Values (Y-Axis)" : "Column"}
                onChange={(e) => handleColumnChange(e.target.value)}
                sx={{
                  borderRadius: 1.5,
                  "& .MuiSelect-select": {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                }}
                renderValue={(value) => {
                  const col = filteredColumns.find((c) => c.name === value)
                  return col?.label || value
                }}
              >
                {filteredColumns.map((col) => (
                  <MenuItem key={col.name} value={col.name}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, width: "100%" }}>
                      <Tooltip title={col.label} arrow placement="left">
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: "0.85rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {col.label}
                        </Typography>
                      </Tooltip>
                      <Chip
                        label={col.type}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: "0.55rem",
                          bgcolor: "#f3f4f6",
                          flexShrink: 0,
                        }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Group By Selector - Only for bar charts */}
            {chartType === "bar" && groupByColumns.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 180, flex: 1, maxWidth: 240 }}>
                <InputLabel>Group By (X-Axis)</InputLabel>
                <Select
                  value={groupByColumn}
                  label="Group By (X-Axis)"
                  onChange={(e) => setGroupByColumn(e.target.value)}
                  sx={{
                    borderRadius: 1.5,
                    "& .MuiSelect-select": {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  }}
                  renderValue={(value) => {
                    if (!value) return "None (count values)"
                    const col = groupByColumns.find((c) => c.name === value)
                    return col?.label || value
                  }}
                >
                  <MenuItem value="">
                    <em>None (count values)</em>
                  </MenuItem>
                  {groupByColumns.map((col) => (
                    <MenuItem key={col.name} value={col.name}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, width: "100%" }}>
                        <Tooltip title={col.label} arrow placement="left">
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: "0.85rem",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            {col.label}
                          </Typography>
                        </Tooltip>
                        <Chip
                          label={col.type}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: "0.55rem",
                            bgcolor: "#f3f4f6",
                            flexShrink: 0,
                          }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Download Button */}
            {chartData.length > 0 && (
              <ChartDownloadButton
                chartRef={chartRef}
                filename={filename}
              />
            )}
          </Box>

          {/* Chart Preview */}
          <Box
            ref={chartRef}
            sx={{
              bgcolor: "#fafafa",
              borderRadius: 1.5,
              overflow: "hidden",
              height: chartHeight,
              "& > div": {
                width: "100%",
                height: "100%",
              },
            }}
          >
            {renderChart()}
          </Box>

          {/* Hint */}
          {chartData.length > 0 && (
            <Typography
              variant="caption"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                mt: 1.5,
                color: "#9ca3af",
              }}
            >
              <Download sx={{ fontSize: 12 }} />
              Click download to save this chart as PNG or SVG
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  )
}
