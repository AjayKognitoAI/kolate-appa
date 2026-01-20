"use client"

import { useMemo } from "react"
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Alert,
} from "@mui/material"
import { BarChart, AutoAwesome, Download, QueryStats } from "@mui/icons-material"
import type { PatientData } from "@/lib/screening-logic"
import type { ColumnType, EnhancedColumnSchema } from "@/types/cohort.types"
import type { AutoChartConfig } from "./visualization.types"
import { generateAutoCharts } from "./AutoChartGenerator"
import { ChartCard } from "./ChartCard"
import { QuickChartBuilder } from "./QuickChartBuilder"

interface DataVisualizationProps {
  /** Patient data records */
  data: PatientData[]
  /** Column type mapping */
  columns: Record<string, ColumnType>
  /** Optional enhanced column metadata with descriptions, unique counts, etc. */
  columnMetadata?: EnhancedColumnSchema | null
  /** Optional null detection info */
  nullDetection?: {
    null_count_by_column: Record<string, number>
    rows_with_nulls_percentage: number
  } | null
  /** Title for the visualization section */
  title?: string
  /** Maximum number of auto-generated charts to show */
  maxAutoCharts?: number
  /** Whether to show the quick chart builder */
  showQuickBuilder?: boolean
  /** Callback when a chart is downloaded */
  onDownload?: (chartId: string, format: "png" | "svg") => void
  /** Height for individual charts */
  chartHeight?: number
  /** Whether component is in read-only mode */
  readOnly?: boolean
}

export function DataVisualization({
  data,
  columns,
  columnMetadata,
  nullDetection,
  title = "Data Visualizations",
  maxAutoCharts = 8,
  showQuickBuilder = true,
  onDownload,
  chartHeight = 280,
  readOnly = false,
}: DataVisualizationProps) {
  // Generate auto charts based on data characteristics
  const autoCharts = useMemo<AutoChartConfig[]>(() => {
    if (data.length === 0) return []
    return generateAutoCharts(data, columns, columnMetadata, nullDetection, maxAutoCharts)
  }, [data, columns, columnMetadata, nullDetection, maxAutoCharts])

  // Handle empty data
  if (data.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          border: "1px solid",
          borderColor: "divider",
          textAlign: "center",
          borderRadius: 2,
        }}
      >
        <BarChart sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No Data Available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload patient data to generate visualizations
        </Typography>
      </Paper>
    )
  }

  // Handle no suitable columns
  if (autoCharts.length === 0 && !showQuickBuilder) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        No suitable columns found for automatic visualization. The data may contain too many unique values or too many missing values.
      </Alert>
    )
  }

  return (
    <Box>
      {/* Header - Simple exploration focused */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: "#f0f9ff",
              border: "1px solid #bae6fd",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <QueryStats sx={{ color: "#0284c7", fontSize: 18 }} />
          </Box>
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                color: "#1e293b",
                fontSize: "0.95rem",
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#64748b", display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <Download sx={{ fontSize: 12 }} />
              View & download charts
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Data summary - Compact inline */}
      <Box
        sx={{
          mb: 2.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Chip
          icon={<AutoAwesome sx={{ fontSize: 14 }} />}
          label={`${data.length.toLocaleString()} records`}
          size="small"
          sx={{
            bgcolor: "#f8fafc",
            color: "#475569",
            fontWeight: 500,
            fontSize: "0.7rem",
            height: 24,
            border: "1px solid #e2e8f0",
            "& .MuiChip-icon": { color: "#64748b" },
          }}
        />
        <Chip
          label={`${Object.keys(columns).length} columns`}
          size="small"
          sx={{
            bgcolor: "#f8fafc",
            color: "#475569",
            fontWeight: 500,
            fontSize: "0.7rem",
            height: 24,
            border: "1px solid #e2e8f0",
          }}
        />
        {autoCharts.length > 0 && (
          <Chip
            label={`${autoCharts.length} visualizations`}
            size="small"
            sx={{
              bgcolor: "#ecfdf5",
              color: "#047857",
              fontWeight: 500,
              fontSize: "0.7rem",
              height: 24,
              border: "1px solid #a7f3d0",
            }}
          />
        )}
      </Box>

      {/* Quick Chart Builder - Inline card at top */}
      {showQuickBuilder && !readOnly && (
        <QuickChartBuilder
          data={data}
          columns={columns}
          columnMetadata={columnMetadata}
          chartHeight={220}
        />
      )}

      {/* Chart Grid */}
      {autoCharts.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            border: "1px dashed #e2e8f0",
            textAlign: "center",
            borderRadius: 2,
            bgcolor: "#fafbfc",
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
              mx: "auto",
              mb: 2,
            }}
          >
            <BarChart sx={{ fontSize: 24, color: "#94a3b8" }} />
          </Box>
          <Typography variant="body1" sx={{ color: "#475569", fontWeight: 500, mb: 0.5 }}>
            No auto-generated visualizations
          </Typography>
          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
            Use the Quick Chart Builder above to explore your data
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {autoCharts.map((chart) => (
            <Grid key={chart.id} size={{ xs: 12, sm: 6, lg: 6 }}>
              <ChartCard
                chart={chart}
                data={data}
                height={chartHeight}
                onDownload={(format) => onDownload?.(chart.id, format)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}
