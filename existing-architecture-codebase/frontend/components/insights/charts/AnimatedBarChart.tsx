"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Box, Paper, Typography, IconButton, Chip, Stack } from "@mui/material";
import { IconRefresh, IconArrowsSort } from "@tabler/icons-react";
import { BarChartDataPoint, CHART_COLORS } from "../types";

interface AnimatedBarChartProps {
  data: BarChartDataPoint[];
  title: string;
  subtitle?: string;
  height?: number;
  showLegend?: boolean;
  onBarClick?: (data: BarChartDataPoint) => void;
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
          {label}
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

const AnimatedBarChart: React.FC<AnimatedBarChartProps> = ({
  data,
  title,
  subtitle,
  height = 320,
  showLegend = true,
  onBarClick,
}) => {
  const [animationKey, setAnimationKey] = useState(0);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [visibleSeries, setVisibleSeries] = useState({
    responders: true,
    nonResponders: true,
  });
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "default">("default");

  useEffect(() => {
    setAnimationKey((prev) => prev + 1);
  }, [data]);

  const handleRefresh = useCallback(() => {
    setAnimationKey((prev) => prev + 1);
  }, []);

  const handleSort = useCallback(() => {
    setSortOrder((prev) => {
      if (prev === "default") return "desc";
      if (prev === "desc") return "asc";
      return "default";
    });
  }, []);

  const handleLegendClick = useCallback((dataKey: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey as keyof typeof prev],
    }));
  }, []);

  const sortedData = React.useMemo(() => {
    if (sortOrder === "default") return data;
    return [...data].sort((a, b) => {
      const diff = a.responders - b.responders;
      return sortOrder === "asc" ? diff : -diff;
    });
  }, [data, sortOrder]);

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
        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            onClick={handleSort}
            sx={{
              color: sortOrder !== "default" ? "var(--primary-600)" : "var(--gray-500)",
              "&:hover": { color: "var(--primary-600)" },
            }}
          >
            <IconArrowsSort size={18} />
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
      </Box>

      <Box sx={{ height, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            key={animationKey}
            data={sortedData}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            onClick={(e) => {
              if (e?.activePayload && onBarClick) {
                onBarClick(e.activePayload[0].payload);
              }
            }}
          >
            <defs>
              <linearGradient id="barGradientPrimary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.primaryLight} stopOpacity={1} />
                <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={1} />
              </linearGradient>
              <linearGradient id="barGradientWarning" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.warningLight} stopOpacity={1} />
                <stop offset="100%" stopColor={CHART_COLORS.warning} stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--gray-200)"
              vertical={false}
            />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11, fill: "var(--gray-600)" }}
              axisLine={{ stroke: "var(--gray-300)" }}
              tickLine={false}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--gray-600)" }}
              axisLine={{ stroke: "var(--gray-300)" }}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--gray-100)" }} />
            <ReferenceLine
              y={50}
              stroke="var(--gray-300)"
              strokeDasharray="5 5"
            />
            {visibleSeries.responders && (
              <Bar
                dataKey="responders"
                name="Responders"
                fill="url(#barGradientPrimary)"
                radius={[4, 4, 0, 0]}
                animationDuration={1200}
                animationEasing="ease-out"
                animationBegin={0}
                onMouseEnter={(data) => setHoveredBar(data.category)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {sortedData.map((entry, index) => (
                  <Cell
                    key={`cell-responders-${index}`}
                    fill={
                      hoveredBar === entry.category
                        ? CHART_COLORS.primaryLight
                        : "url(#barGradientPrimary)"
                    }
                    style={{
                      filter:
                        hoveredBar === entry.category
                          ? "brightness(1.1)"
                          : "brightness(1)",
                      transition: "filter 0.2s ease",
                    }}
                  />
                ))}
              </Bar>
            )}
            {visibleSeries.nonResponders && (
              <Bar
                dataKey="nonResponders"
                name="Non-Responders"
                fill="url(#barGradientWarning)"
                radius={[4, 4, 0, 0]}
                animationDuration={1200}
                animationEasing="ease-out"
                animationBegin={200}
                onMouseEnter={(data) => setHoveredBar(data.category)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {sortedData.map((entry, index) => (
                  <Cell
                    key={`cell-nonResponders-${index}`}
                    fill={
                      hoveredBar === entry.category
                        ? CHART_COLORS.warningLight
                        : "url(#barGradientWarning)"
                    }
                    style={{
                      filter:
                        hoveredBar === entry.category
                          ? "brightness(1.1)"
                          : "brightness(1)",
                      transition: "filter 0.2s ease",
                    }}
                  />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </Box>
      {showLegend && renderCustomLegend()}
    </Paper>
  );
};

export default AnimatedBarChart;
