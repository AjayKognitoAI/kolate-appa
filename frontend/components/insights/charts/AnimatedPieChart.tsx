"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from "recharts";
import { Box, Paper, Typography, IconButton, Stack } from "@mui/material";
import { IconRefresh } from "@tabler/icons-react";
import { PieChartDataPoint, PIE_CHART_COLORS } from "../types";

interface AnimatedPieChartProps {
  data: PieChartDataPoint[];
  title: string;
  subtitle?: string;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLabels?: boolean;
  onSliceClick?: (data: PieChartDataPoint) => void;
}

const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props;

  return (
    <g>
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fill="var(--gray-800)"
        fontSize={14}
        fontWeight={600}
      >
        {payload.name}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fill="var(--gray-600)"
        fontSize={12}
      >
        {value.toFixed(1)}% ({(percent * 100).toFixed(0)}%)
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))",
          transition: "all 0.3s ease-out",
        }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 14}
        fill={fill}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <Paper
        sx={{
          p: 1.5,
          boxShadow: "var(--shadow-md)",
          border: "1px solid var(--gray-200)",
          borderRadius: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              bgcolor: data.payload.color || data.color,
            }}
          />
          <Typography variant="body2" fontWeight={600}>
            {data.name}
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          Value: {data.value.toFixed(1)}%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Share: {((data.payload.percent || (data.value / payload.reduce((acc: number, p: any) => acc + p.value, 0))) * 100).toFixed(1)}%
        </Typography>
      </Paper>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="var(--gray-700)"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={500}
    >
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
};

const AnimatedPieChart: React.FC<AnimatedPieChartProps> = ({
  data,
  title,
  subtitle,
  height = 320,
  innerRadius = 60,
  outerRadius = 100,
  showLabels = true,
  onSliceClick,
}) => {
  const [animationKey, setAnimationKey] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  useEffect(() => {
    setAnimationKey((prev) => prev + 1);
  }, [data]);

  const handleRefresh = useCallback(() => {
    setAnimationKey((prev) => prev + 1);
    setActiveIndex(undefined);
  }, []);

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);

  const onPieLeave = useCallback(() => {
    setActiveIndex(undefined);
  }, []);

  const handleClick = useCallback(
    (data: PieChartDataPoint, index: number) => {
      if (onSliceClick) {
        onSliceClick(data);
      }
    },
    [onSliceClick]
  );

  const coloredData = data.map((item, index) => ({
    ...item,
    color: item.color || PIE_CHART_COLORS[index % PIE_CHART_COLORS.length],
  }));

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
      </Box>

      <Box sx={{ height, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart key={animationKey}>
            <defs>
              {coloredData.map((entry, index) => (
                <linearGradient
                  key={`gradient-${index}`}
                  id={`pieGradient-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={0.8} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={coloredData}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              onClick={handleClick}
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              animationDuration={1000}
              animationEasing="ease-out"
              animationBegin={0}
              label={showLabels && activeIndex === undefined ? renderCustomLabel : false}
              labelLine={showLabels && activeIndex === undefined}
              style={{ cursor: "pointer" }}
            >
              {coloredData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#pieGradient-${index})`}
                  stroke={entry.color}
                  strokeWidth={1}
                  style={{
                    filter:
                      activeIndex === index
                        ? "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))"
                        : "none",
                    transition: "filter 0.2s ease",
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </Box>

      {/* Custom Legend */}
      <Stack
        direction="row"
        flexWrap="wrap"
        justifyContent="center"
        gap={1.5}
        mt={2}
      >
        {coloredData.map((entry, index) => (
          <Stack
            key={index}
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{
              cursor: "pointer",
              opacity: activeIndex !== undefined && activeIndex !== index ? 0.5 : 1,
              transition: "opacity 0.2s ease",
              "&:hover": {
                opacity: 1,
              },
            }}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(undefined)}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: entry.color,
              }}
            />
            <Typography variant="caption" color="var(--gray-600)">
              {entry.name}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
};

export default AnimatedPieChart;
