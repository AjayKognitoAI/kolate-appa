"use client"

import { Box, Paper, Typography, Grid, alpha } from "@mui/material"
import {
  Storage,
  Group,
  People,
} from "@mui/icons-material"

interface StudyStatsSummaryProps {
  masterDataCount: number
  cohortCount: number
  totalPatients: number
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

export function StudyStatsSummary({
  masterDataCount,
  cohortCount,
  totalPatients,
}: StudyStatsSummaryProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 4 }}>
        <StatCard
          icon={<Storage />}
          label="Master Data Files"
          value={masterDataCount}
          sublabel="uploaded datasets"
          color="#1976d2"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <StatCard
          icon={<Group />}
          label="Cohorts"
          value={cohortCount}
          sublabel="patient groups"
          color="#9c27b0"
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <StatCard
          icon={<People />}
          label="Total Patients"
          value={totalPatients.toLocaleString()}
          sublabel="across all datasets"
          color="#2e7d32"
        />
      </Grid>
    </Grid>
  )
}
