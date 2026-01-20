"use client"

import { Box, Typography } from "@mui/material"
import { BarChart } from "@mui/x-charts/BarChart"
import type { ChartDataPoint } from "./visualization.types"
import { CHART_COLORS } from "./visualization.utils"

interface CategoryBarChartProps {
  data: ChartDataPoint[]
  title?: string
  height?: number
  horizontal?: boolean
}

export function CategoryBarChart({
  data,
  title,
  height = 250,
  horizontal = false,
}: CategoryBarChartProps) {
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
  const labels = data.map((d) => d.label)
  const values = data.map((d) => d.value)
  const colors = data.map((d, i) => d.color || CHART_COLORS[i % CHART_COLORS.length])

  // Use horizontal layout for many categories
  const useHorizontal = horizontal || data.length > 6

  if (useHorizontal) {
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
          </Typography>
        )}
        <BarChart
          height={Math.max(height, data.length * 35 + 60)}
          series={[
            {
              data: values,
              label: "Count",
            },
          ]}
          yAxis={[
            {
              data: labels,
              scaleType: "band",
              tickLabelStyle: {
                fontSize: 11,
                fill: "#64748b",
              },
              colorMap: {
                type: "ordinal",
                colors: colors,
              },
            },
          ]}
          xAxis={[
            {
              tickLabelStyle: {
                fill: "#64748b",
                fontSize: 10,
              },
            },
          ]}
          layout="horizontal"
          margin={{
            left: 120,
            right: 20,
            top: 20,
            bottom: 40,
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
        </Typography>
      )}
      <BarChart
        height={height}
        series={[
          {
            data: values,
            label: "Count",
          },
        ]}
        xAxis={[
          {
            data: labels,
            scaleType: "band",
            tickLabelStyle: {
              angle: data.length > 4 ? -30 : 0,
              textAnchor: data.length > 4 ? "end" : "middle",
              fontSize: 11,
              fill: "#64748b",
            },
            colorMap: {
              type: "ordinal",
              colors: colors,
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
          bottom: data.length > 4 ? 70 : 40,
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
