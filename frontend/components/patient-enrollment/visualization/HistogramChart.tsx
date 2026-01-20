"use client"

import { Box, Typography } from "@mui/material"
import { BarChart } from "@mui/x-charts/BarChart"
import type { HistogramDataPoint } from "./visualization.types"

interface HistogramChartProps {
  data: HistogramDataPoint[]
  title?: string
  height?: number
  unit?: string | null
}

export function HistogramChart({ data, title, height = 250, unit }: HistogramChartProps) {
  if (data.length === 0) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height={height}
        sx={{ bgcolor: "#fafbfc", borderRadius: 2 }}
      >
        <Typography color="text.secondary" sx={{ fontSize: "0.875rem" }}>
          No data available
        </Typography>
      </Box>
    )
  }

  // Prepare data for MUI X Charts
  const labels = data.map((d) => d.bin)
  const values = data.map((d) => d.count)

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      {title && (
        <Typography
          variant="subtitle2"
          fontWeight={600}
          gutterBottom
          sx={{ mb: 1, color: "#374151" }}
        >
          {title}
          {unit && (
            <Typography
              component="span"
              variant="caption"
              sx={{ ml: 1, color: "#64748b" }}
            >
              ({unit})
            </Typography>
          )}
        </Typography>
      )}
      <BarChart
        height={height}
        series={[
          {
            data: values,
            color: "#8b5cf6",
            label: "Frequency",
          },
        ]}
        xAxis={[
          {
            data: labels,
            scaleType: "band",
            tickLabelStyle: {
              angle: data.length > 8 ? -45 : 0,
              textAnchor: data.length > 8 ? "end" : "middle",
              fontSize: 10,
              fill: "#64748b",
            },
          },
        ]}
        yAxis={[
          {
            tickLabelStyle: {
              fill: "#64748b",
              fontSize: 10,
            },
          },
        ]}
        margin={{
          left: 50,
          right: 20,
          top: 20,
          bottom: data.length > 8 ? 80 : 40,
        }}
        slotProps={{
          legend: {
            hidden: true,
          },
        }}
        tooltip={{
          trigger: "item",
        }}
        sx={{
          "& .MuiChartsAxis-line": {
            stroke: "#e2e8f0",
          },
          "& .MuiChartsAxis-tick": {
            stroke: "#e2e8f0",
          },
        }}
      />
    </Box>
  )
}
