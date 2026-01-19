"use client"

import { Box, Paper, Typography, Grid, alpha } from "@mui/material"
import {
  People,
  FilterList,
  TrendingUp,
  ViewColumn,
  Storage,
} from "@mui/icons-material"

interface CohortStatsSummaryProps {
  masterPatientCount: number
  screenedPatientCount: number
  matchRate: number
  filterCount: number
  columnCount: number
  createdAt: string
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sublabel?: string
  color?: string
}

function StatCard({ icon, label, value, sublabel, color = "#1976d2" }: StatCardProps) {
  const backgroundColor = alpha(color, 0.04)
  const iconBgColor = alpha(color, 0.12)
  const borderColor = alpha(color, 0.2)

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        px: 2,
        height: "100%",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        background: `linear-gradient(135deg, ${backgroundColor} 0%, ${alpha(color, 0.02)} 100%)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 1.5,
        border: `1px solid ${borderColor}`,
        borderLeftWidth: 3,
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          transform: "translateY(-1px)",
          boxShadow: `0 2px 8px ${alpha(color, 0.12)}`,
        },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "8px",
          backgroundColor: iconBgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box flex={1} minWidth={0}>
        <Typography variant="body2" color="text.secondary" fontWeight={500} noWrap>
          {label}
        </Typography>
        <Box display="flex" alignItems="baseline" gap={1}>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{
              color: color,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            {value}
          </Typography>
          {sublabel && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {sublabel}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  )
}

export function CohortStatsSummary({
  masterPatientCount,
  screenedPatientCount,
  matchRate,
  filterCount,
  columnCount,
}: CohortStatsSummaryProps) {
  // Determine match rate color
  const getMatchRateColor = () => {
    if (matchRate >= 50) return "#2e7d32" // green
    if (matchRate >= 25) return "#ed6c02" // orange
    return "#d32f2f" // red
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <StatCard
          icon={<People />}
          label="Screened Patients"
          value={screenedPatientCount.toLocaleString()}
          sublabel={`of ${masterPatientCount.toLocaleString()} total`}
          color="#2e7d32"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <StatCard
          icon={<Storage />}
          label="Master Data"
          value={masterPatientCount.toLocaleString()}
          sublabel="total records"
          color="#1976d2"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <StatCard
          icon={<TrendingUp />}
          label="Match Rate"
          value={`${matchRate}%`}
          sublabel="patients match"
          color={getMatchRateColor()}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <StatCard
          icon={<FilterList />}
          label="Total Criteria"
          value={filterCount}
          sublabel="inclusion + exclusion"
          color="#9c27b0"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <StatCard
          icon={<ViewColumn />}
          label="Data Columns"
          value={columnCount}
          sublabel="fields tracked"
          color="#0288d1"
        />
      </Grid>
    </Grid>
  )
}
