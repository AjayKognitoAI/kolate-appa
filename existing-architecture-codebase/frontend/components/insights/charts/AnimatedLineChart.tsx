"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from "recharts";
import { Box, Paper, Typography, IconButton, Chip, Stack } from "@mui/material";
import { IconZoomIn, IconZoomOut, IconRefresh } from "@tabler/icons-react";
import { LineChartDataPoint, CHART_COLORS } from "../types";

interface AnimatedLineChartProps {
  data: LineChartDataPoint[];
  title: string;
  subtitle?: string;
  height?: number;
  showZoom?: boolean;
  onDataPointClick?: (data: LineChartDataPoint) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Paper
        sx={{
          p: 1.5,
          boxShadow: "var(--shadow-md)",
          border: "1px solid var(--gray-200)",
          borderRadius: 1,
        }}
      >
        <Typography variant="body2" fontWeight={600} mb={0.5}>
          Month {label}
        </Typography>
        {payload.map((entry: any, index: number) => (
          <Typography
            key={index}
            variant="caption"
            sx={{ color: entry.color, display: "block" }}
          >
            {entry.name}: {entry.value.toFixed(1)}%
          </Typography>
        ))}
      </Paper>
    );
  }
  return null;
};

const AnimatedLineChart: React.FC<AnimatedLineChartProps> = ({
  data,
  title,
  subtitle,
  height = 320,
  showZoom = true,
  onDataPointClick,
}) => {
  const [animationKey, setAnimationKey] = useState(0);
  const [visibleSeries, setVisibleSeries] = useState({
    responders: true,
    nonResponders: true,
    predicted: true,
  });
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);

  useEffect(() => {
    setAnimationKey((prev) => prev + 1);
  }, [data]);

  const handleLegendClick = useCallback((dataKey: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey as keyof typeof prev],
    }));
  }, []);

  const handleRefresh = useCallback(() => {
    setAnimationKey((prev) => prev + 1);
    setZoomDomain(null);
  }, []);

  const handleZoomIn = useCallback(() => {
    const dataLength = data.length;
    if (dataLength > 4) {
      const mid = Math.floor(dataLength / 2);
      const range = Math.floor(dataLength / 4);
      setZoomDomain([mid - range, mid + range]);
    }
  }, [data.length]);

  const handleZoomOut = useCallback(() => {
    setZoomDomain(null);
  }, []);

  const renderCustomLegend = () => (
    <Stack direction="row" spacing={1} justifyContent="center" mt={1}>
      <Chip
        size="small"
        label="Responders"
        onClick={() => handleLegendClick("responders")}
        sx={{
          bgcolor: visibleSeries.responders ? CHART_COLORS.primary : "var(--gray-200)",
          color: visibleSeries.responders ? "#fff" : "var(--gray-600)",
          cursor: "pointer",
          transition: "all 0.2s ease",
          "&:hover": {
            transform: "scale(1.02)",
          },
        }}
      />
      <Chip
        size="small"
        label="Non-Responders"
        onClick={() => handleLegendClick("nonResponders")}
        sx={{
          bgcolor: visibleSeries.nonResponders ? CHART_COLORS.warning : "var(--gray-200)",
          color: visibleSeries.nonResponders ? "#fff" : "var(--gray-600)",
          cursor: "pointer",
          transition: "all 0.2s ease",
          "&:hover": {
            transform: "scale(1.02)",
          },
        }}
      />
      {data.some((d) => d.predicted !== undefined) && (
        <Chip
          size="small"
          label="Predicted"
          onClick={() => handleLegendClick("predicted")}
          sx={{
            bgcolor: visibleSeries.predicted ? CHART_COLORS.success : "var(--gray-200)",
            color: visibleSeries.predicted ? "#fff" : "var(--gray-600)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": {
              transform: "scale(1.02)",
            },
          }}
        />
      )}
    </Stack>
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: "1px solid var(--gray-200)",
        transition: "box-shadow 0.2s ease",
        "&:hover": {
          boxShadow: "var(--shadow-md)",
        },
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={2}
      >
        <Box>
          <Typography variant="h6" fontWeight={600} color="var(--gray-800)">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {showZoom && (
          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              onClick={handleZoomIn}
              sx={{
                color: "var(--gray-500)",
                "&:hover": { color: "var(--primary-600)" },
              }}
            >
              <IconZoomIn size={18} />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleZoomOut}
              sx={{
                color: "var(--gray-500)",
                "&:hover": { color: "var(--primary-600)" },
              }}
            >
              <IconZoomOut size={18} />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleRefresh}
              sx={{
                color: "var(--gray-500)",
                "&:hover": { color: "var(--primary-600)" },
              }}
            >
              <IconRefresh size={18} />
            </IconButton>
          </Stack>
        )}
      </Box>

      <Box sx={{ height, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            key={animationKey}
            data={zoomDomain ? data.slice(zoomDomain[0], zoomDomain[1]) : data}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            onClick={(e) => {
              if (e?.activePayload && onDataPointClick) {
                onDataPointClick(e.activePayload[0].payload);
              }
            }}
          >
            <defs>
              <linearGradient id="lineGradientResponders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="lineGradientNonResponders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.warning} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.warning} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--gray-200)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "var(--gray-600)" }}
              axisLine={{ stroke: "var(--gray-300)" }}
              tickLine={false}
              label={{
                value: "Months",
                position: "insideBottom",
                offset: -5,
                fontSize: 12,
                fill: "var(--gray-500)",
              }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--gray-600)" }}
              axisLine={{ stroke: "var(--gray-300)" }}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={50}
              stroke="var(--gray-300)"
              strokeDasharray="5 5"
              label={{
                value: "50%",
                position: "right",
                fontSize: 10,
                fill: "var(--gray-400)",
              }}
            />
            {visibleSeries.responders && (
              <Line
                type="monotone"
                dataKey="responders"
                name="Responders"
                stroke={CHART_COLORS.primary}
                strokeWidth={2.5}
                dot={{
                  fill: CHART_COLORS.primary,
                  strokeWidth: 2,
                  r: 3,
                }}
                activeDot={{
                  r: 6,
                  fill: CHART_COLORS.primary,
                  stroke: "#fff",
                  strokeWidth: 2,
                  style: { cursor: "pointer" },
                }}
                animationDuration={1500}
                animationEasing="ease-in-out"
                animationBegin={0}
              />
            )}
            {visibleSeries.nonResponders && (
              <Line
                type="monotone"
                dataKey="nonResponders"
                name="Non-Responders"
                stroke={CHART_COLORS.warning}
                strokeWidth={2.5}
                dot={{
                  fill: CHART_COLORS.warning,
                  strokeWidth: 2,
                  r: 3,
                }}
                activeDot={{
                  r: 6,
                  fill: CHART_COLORS.warning,
                  stroke: "#fff",
                  strokeWidth: 2,
                  style: { cursor: "pointer" },
                }}
                animationDuration={1500}
                animationEasing="ease-in-out"
                animationBegin={300}
              />
            )}
            {visibleSeries.predicted && data.some((d) => d.predicted !== undefined) && (
              <Line
                type="monotone"
                dataKey="predicted"
                name="Predicted"
                stroke={CHART_COLORS.success}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                animationDuration={1500}
                animationEasing="ease-in-out"
                animationBegin={600}
              />
            )}
            <Brush
              dataKey="month"
              height={20}
              stroke={CHART_COLORS.primary}
              fill="var(--gray-50)"
              tickFormatter={(value) => `M${value}`}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      {renderCustomLegend()}
    </Paper>
  );
};

export default AnimatedLineChart;
