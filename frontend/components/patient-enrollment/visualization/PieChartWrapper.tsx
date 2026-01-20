"use client"

import { Box, Typography } from "@mui/material"
import { PieChart } from "@mui/x-charts/PieChart"
import type { ChartDataPoint } from "./visualization.types"
import { CHART_COLORS } from "./visualization.utils"

interface PieChartWrapperProps {
  data: ChartDataPoint[]
  title?: string
  height?: number
}

export function PieChartWrapper({ data, title, height = 250 }: PieChartWrapperProps) {
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

  // Prepare data for MUI X Charts PieChart
  const pieData = data.map((d, index) => ({
    id: index,
    value: d.value,
    label: d.label,
    color: d.color || CHART_COLORS[index % CHART_COLORS.length],
  }))

  // Calculate responsive radius based on height
  const outerRadius = Math.min(Math.floor((height - 60) / 2), 90)
  const innerRadius = Math.floor(outerRadius * 0.4)

  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", justifyContent: "center" }}>
      {title && (
        <Typography
          variant="subtitle2"
          fontWeight={600}
          gutterBottom
          sx={{ mb: 1, color: "#374151" }}
        >
          {title}
        </Typography>
      )}
      <PieChart
        height={height}
        series={[
          {
            data: pieData,
            highlightScope: { fade: "global", highlight: "item" },
            faded: { innerRadius: innerRadius + 10, additionalRadius: -5, color: "gray" },
            arcLabel: (item) => `${((item.value / data.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(0)}%`,
            arcLabelMinAngle: 25,
            innerRadius: innerRadius,
            outerRadius: outerRadius,
            paddingAngle: 3,
            cornerRadius: 4,
          },
        ]}
        margin={{
          left: 20,
          right: 20,
          top: 30,
          bottom: 30,
        }}
        slotProps={{
          legend: {
            direction: "row",
            position: { vertical: "bottom", horizontal: "middle" },
            padding: { top: 10 },
            itemMarkWidth: 12,
            itemMarkHeight: 12,
            markGap: 5,
            itemGap: 14,
            labelStyle: {
              fontSize: 11,
              fill: "#475569",
            },
          },
        }}
        tooltip={{
          trigger: "item",
        }}
        sx={{
          "& .MuiChartsLegend-mark": {
            rx: 3,
          },
        }}
      />
    </Box>
  )
}
