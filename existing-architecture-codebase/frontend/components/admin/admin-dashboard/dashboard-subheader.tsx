"use client";

import { FC, useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { TrendingUp, TrendingDown } from "@mui/icons-material";
import { enterpriseService } from "@/services/admin/enterprises-service";

interface StatCardProps {
  title: string;
  value: string | number;
  trend: "up" | "down";
}

const StatCard: FC<StatCardProps> = ({ title, value, trend }) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        p: 0,
        position: "relative",
        boxShadow: "none",
        border: `1px solid ${theme.palette.divider}`,
        height: "100%",
        borderRadius: "8px", // Reduced border radius for sharper edges
      }}
    >
      <CardContent sx={{ p: "30px" }}>
        <Typography
          variant="subtitle2"
          sx={{
            color: "text.primary",
            fontSize: "14px",
            fontWeight: "500",
            mb: 1,
          }}
        >
          {title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography
            variant="h3"
            sx={{
              color: "text.primary",
              fontSize: "24px",
              fontWeight: "500",
            }}
          >
            {value}
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              ml: "auto",
            }}
          >
            {trend === "up" ? (
              <TrendingUp
                sx={{
                  color: "success.main",
                  width: 20,
                  height: 20,
                }}
              />
            ) : (
              <TrendingDown
                sx={{
                  color: "error.main",
                  width: 20,
                  height: 20,
                }}
              />
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const DashboardSubheader: FC = () => {
  const [stats, setStats] = useState<{
    total_enterprises: number;
    deactivated_enterprises: number;
  } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await enterpriseService.getEnterpriseStats();
        setStats(response.data);
      } catch (error) {
        console.error("Error fetching enterprise stats:", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <Box sx={{ mt: 3, mb: 5 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={3}
        sx={{ width: "100%" }}
      >
        <Box sx={{ width: { xs: "100%", sm: "33.33%" } }}>
          <StatCard
            title="Total enterprises"
            value={stats ? stats.total_enterprises : "-"}
            trend="up"
          />
        </Box>
        <Box sx={{ width: { xs: "100%", sm: "33.33%" } }}>
          <StatCard title="Projects" value={0} trend="up" />
        </Box>
        <Box sx={{ width: { xs: "100%", sm: "33.33%" } }}>
          <StatCard
            title="Inactive enterprises"
            value={stats ? stats.deactivated_enterprises : "-"}
            trend="down"
          />
        </Box>
      </Stack>
    </Box>
  );
};

export default DashboardSubheader;
