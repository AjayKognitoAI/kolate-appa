"use client"

import { useRef } from "react"
import {
  Paper,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material"
import { Delete, Edit, BarChart, PieChartOutlined, ShowChart, InfoOutlined } from "@mui/icons-material"
import type { PatientData } from "@/lib/screening-logic"
import type {
  AutoChartConfig,
  ManualChartConfig,
  ChartDataPoint,
  HistogramDataPoint,
} from "./visualization.types"
import { HistogramChart } from "./HistogramChart"
import { CategoryBarChart } from "./CategoryBarChart"
import { PieChartWrapper } from "./PieChartWrapper"
import { ChartDownloadButton } from "./ChartDownloadButton"
import {
  getValueDistribution,
  createHistogramData,
  transformDataForManualChart,
} from "./visualization.utils"

interface ChartCardProps {
  chart: AutoChartConfig | ManualChartConfig
  data: PatientData[]
  height?: number
  onDownload?: (format: "png" | "svg") => void
  onRemove?: () => void
  onEdit?: () => void
}

function isAutoChart(chart: AutoChartConfig | ManualChartConfig): chart is AutoChartConfig {
  return "metadata" in chart
}

export function ChartCard({
  chart,
  data,
  height = 250,
  onDownload,
  onRemove,
  onEdit,
}: ChartCardProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const filename = `chart-${chart.title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`

  // Get chart data
  let chartData: ChartDataPoint[] | HistogramDataPoint[]

  if (isAutoChart(chart)) {
    chartData = chart.data
  } else {
    // Manual chart - compute data
    if (chart.chartType === "histogram") {
      chartData = createHistogramData(data, chart.columnName)
    } else if (chart.groupBy) {
      chartData = transformDataForManualChart(
        data,
        chart.columnName,
        chart.aggregation,
        chart.groupBy
      )
    } else {
      chartData = getValueDistribution(data, chart.columnName)
    }
  }

  // Get chart type info
  const getChartTypeInfo = () => {
    switch (chart.chartType) {
      case "histogram":
        return { icon: ShowChart, color: "#8b5cf6", label: "Distribution" }
      case "pie":
        return { icon: PieChartOutlined, color: "#ec4899", label: "Proportion" }
      case "bar":
      default:
        return { icon: BarChart, color: "#6366f1", label: "Comparison" }
    }
  }

  const chartTypeInfo = getChartTypeInfo()
  const ChartIcon = chartTypeInfo.icon

  // Render the appropriate chart component
  const renderChart = () => {
    switch (chart.chartType) {
      case "histogram":
        return (
          <HistogramChart
            data={chartData as HistogramDataPoint[]}
            height={height}
            unit={isAutoChart(chart) ? chart.metadata.unitOfMeasure : undefined}
          />
        )
      case "pie":
        return (
          <PieChartWrapper
            data={chartData as ChartDataPoint[]}
            height={height}
          />
        )
      case "bar":
      default:
        return (
          <CategoryBarChart
            data={chartData as ChartDataPoint[]}
            height={height}
          />
        )
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #e5e7eb",
        borderRadius: 2.5,
        bgcolor: "#ffffff",
        overflow: "hidden",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          borderColor: "#d1d5db",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
        },
      }}
    >
      {/* Header - Compact stacked layout */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: "1px solid #f3f4f6",
        }}
      >
        {/* Top row: Icon + Title + Download button */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: 0.5,
              bgcolor: `${chartTypeInfo.color}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ChartIcon sx={{ fontSize: 12, color: chartTypeInfo.color }} />
          </Box>
          <Tooltip title={chart.title} arrow placement="top">
            <Typography
              variant="subtitle2"
              sx={{
                flex: 1,
                fontWeight: 600,
                fontSize: "0.8rem",
                color: "#1f2937",
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {chart.title}
            </Typography>
          </Tooltip>
          {/* Info icon with description tooltip */}
          {isAutoChart(chart) && chart.description && (
            <Tooltip
              title={chart.description}
              arrow
              placement="top"
              slotProps={{
                tooltip: {
                  sx: {
                    maxWidth: 280,
                    fontSize: "0.75rem",
                    lineHeight: 1.4,
                  }
                }
              }}
            >
              <InfoOutlined
                sx={{
                  fontSize: 14,
                  color: "#9ca3af",
                  flexShrink: 0,
                  cursor: "help",
                  "&:hover": {
                    color: "#6366f1",
                  }
                }}
              />
            </Tooltip>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
            <ChartDownloadButton
              chartRef={chartRef}
              filename={filename}
              onDownload={onDownload}
            />
            {onEdit && (
              <Tooltip title="Edit chart" arrow>
                <IconButton
                  size="small"
                  onClick={onEdit}
                  sx={{
                    padding: 0.5,
                    color: "#9ca3af",
                    "&:hover": {
                      bgcolor: "#f3f4f6",
                      color: "#6366f1",
                    },
                  }}
                >
                  <Edit sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
            {onRemove && (
              <Tooltip title="Remove chart" arrow>
                <IconButton
                  size="small"
                  onClick={onRemove}
                  sx={{
                    padding: 0.5,
                    color: "#9ca3af",
                    "&:hover": {
                      bgcolor: "#fef2f2",
                      color: "#ef4444",
                    },
                  }}
                >
                  <Delete sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        {/* Bottom row: Metadata chips */}
        {isAutoChart(chart) && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, pl: 3.5 }}>
            <Chip
              label={chartTypeInfo.label}
              size="small"
              sx={{
                fontSize: "0.6rem",
                height: 18,
                bgcolor: `${chartTypeInfo.color}10`,
                color: chartTypeInfo.color,
                fontWeight: 600,
                border: "none",
                borderRadius: 0.5,
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
            <Chip
              label={`${(chart.metadata.totalRecords - chart.metadata.nullCount).toLocaleString()} records`}
              size="small"
              sx={{
                fontSize: "0.6rem",
                height: 18,
                bgcolor: "#ecfdf5",
                color: "#059669",
                fontWeight: 500,
                border: "none",
                borderRadius: 0.5,
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
          </Box>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ p: 2 }}>
        {/* Chart */}
        <Box
          ref={chartRef}
          sx={{
            height: `${height}px`,
            width: "100%",
            bgcolor: "#fafafa",
            borderRadius: 1.5,
            overflow: "hidden",
            "& > div": {
              width: "100%",
              height: "100%",
            },
          }}
        >
          {renderChart()}
        </Box>
      </Box>
    </Paper>
  )
}
