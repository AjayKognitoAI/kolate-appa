/**
 * Stats Card Component
 *
 * Modern dashboard stat cards with trend indicators.
 */

"use client";

import React from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  Skeleton,
} from "@mui/material";
import { IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  loading?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  changeLabel = "vs last period",
  icon,
  iconBgColor = "primary.light",
  loading,
}) => {
  const trend = change === undefined ? null : change > 0 ? "up" : change < 0 ? "down" : "neutral";
  const TrendIcon = trend === "up" ? IconTrendingUp : trend === "down" ? IconTrendingDown : IconMinus;
  const trendColor = trend === "up" ? "success.main" : trend === "down" ? "error.main" : "text.secondary";

  if (loading) {
    return (
      <Card sx={{ height: "100%" }}>
        <CardContent>
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="60%" height={40} />
          <Skeleton variant="text" width="80%" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box sx={{ flex: 1 }}>
            <Typography color="text.secondary" variant="overline" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ my: 1, fontWeight: 600 }}>
              {value}
            </Typography>
            {change !== undefined && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <TrendIcon size={16} color={trendColor} />
                <Typography variant="body2" sx={{ color: trendColor, fontWeight: 500 }}>
                  {Math.abs(change)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {changeLabel}
                </Typography>
              </Box>
            )}
          </Box>
          {icon && (
            <Avatar sx={{ bgcolor: iconBgColor, width: 48, height: 48 }}>
              {icon}
            </Avatar>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// =============================================================================
// Mini Stat Card (Compact Version)
// =============================================================================

interface MiniStatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: "primary" | "success" | "warning" | "error" | "info";
  loading?: boolean;
}

export const MiniStatsCard: React.FC<MiniStatsCardProps> = ({
  title,
  value,
  icon,
  color = "primary",
  loading,
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="60%" />
              <Skeleton width="40%" height={28} />
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {icon && (
            <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, width: 40, height: 40 }}>
              {icon}
            </Avatar>
          )}
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {value}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
