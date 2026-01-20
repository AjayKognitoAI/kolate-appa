"use client"

import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  alpha,
} from "@mui/material"
import {
  People,
  CompareArrows,
  TrendingUp,
  Difference,
} from "@mui/icons-material"
import type { CohortCompareData, CohortComparisonItem, CohortOverlap } from "@/types/cohort.types"

interface CohortComparisonResultsProps {
  results: CohortCompareData
  currentCohortId: string
}

// Stat card component - compact version
function StatCard({
  icon,
  label,
  value,
  sublabel,
  color = "#1976d2",
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sublabel?: string
  color?: string
}) {
  const iconBgColor = alpha(color, 0.1)
  const borderColor = alpha(color, 0.15)

  return (
    <Paper
      elevation={0}
      sx={{
        py: 1,
        px: 1.5,
        height: "100%",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 1.5,
        bgcolor: "background.paper",
        borderRadius: 1.5,
        border: `1px solid ${borderColor}`,
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1,
          backgroundColor: iconBgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color,
          flexShrink: 0,
          "& .MuiSvgIcon-root": {
            fontSize: 18,
          },
        }}
      >
        {icon}
      </Box>
      <Box flex={1} minWidth={0}>
        <Typography variant="caption" color="text.secondary" fontWeight={500} noWrap sx={{ lineHeight: 1.2 }}>
          {label}
        </Typography>
        <Box display="flex" alignItems="baseline" gap={0.75}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{
              color: color,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            {value}
          </Typography>
          {sublabel && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: "0.7rem" }}>
              {sublabel}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  )
}

export function CohortComparisonResults({
  results,
  currentCohortId,
}: CohortComparisonResultsProps) {
  const { cohorts, overlaps, total_unique_patients, common_to_all } = results

  // Find current cohort
  const currentCohort = cohorts.find((c) => c.cohort_id === currentCohortId)
  const otherCohorts = cohorts.filter((c) => c.cohort_id !== currentCohortId)

  // Get overlaps involving current cohort
  const currentOverlaps = overlaps.filter((o) =>
    o.cohort_ids.includes(currentCohortId)
  )

  return (
    <Box>
      {/* Summary Stats */}
      <Grid container spacing={1.5} mb={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<People />}
            label="Total Unique Patients"
            value={total_unique_patients.toLocaleString()}
            sublabel="across all cohorts"
            color="#1976d2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<Difference />}
            label="Common to All"
            value={common_to_all.toLocaleString()}
            sublabel="patients in every cohort"
            color="#2e7d32"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<CompareArrows />}
            label="Cohorts Compared"
            value={cohorts.length}
            sublabel="including current"
            color="#9c27b0"
          />
        </Grid>
        {currentCohort && (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<TrendingUp />}
              label="Current Cohort Match Rate"
              value={`${currentCohort.match_rate.toFixed(1)}%`}
              sublabel={`${currentCohort.patient_count} patients`}
              color="#0288d1"
            />
          </Grid>
        )}
      </Grid>

      {/* Cohort Details Table */}
      <Paper elevation={0} sx={{ border: "1px solid #ececf1", mb: 3 }}>
        <Box p={2} borderBottom="1px solid #ececf1">
          <Typography variant="h6" fontWeight={600}>
            Cohort Breakdown
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#fafbfc" }}>
                <TableCell sx={{ fontWeight: 600 }}>Cohort</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Screened
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Master
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Match Rate
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Filters
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cohorts.map((cohort) => {
                const isCurrent = cohort.cohort_id === currentCohortId
                return (
                  <TableRow
                    key={cohort.cohort_id}
                    sx={{
                      bgcolor: isCurrent ? "primary.50" : "inherit",
                      "& td": { fontWeight: isCurrent ? 600 : 400 },
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {cohort.cohort_name}
                        {isCurrent && (
                          <Chip label="Current" size="small" color="primary" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {cohort.patient_count.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      {cohort.master_patient_count.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                        <LinearProgress
                          variant="determinate"
                          value={cohort.match_rate}
                          sx={{ width: 60, height: 6, borderRadius: 1 }}
                          color={
                            cohort.match_rate >= 50
                              ? "success"
                              : cohort.match_rate >= 25
                              ? "warning"
                              : "error"
                          }
                        />
                        {cohort.match_rate.toFixed(1)}%
                      </Box>
                    </TableCell>
                    <TableCell align="right">{cohort.filter_count}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Overlap Analysis */}
      <Paper elevation={0} sx={{ border: "1px solid #ececf1" }}>
        <Box p={2} borderBottom="1px solid #ececf1">
          <Typography variant="h6" fontWeight={600}>
            Overlap Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pairwise comparison between cohorts
          </Typography>
        </Box>

        {currentOverlaps.length === 0 ? (
          <Box p={3} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              No overlaps to display
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#fafbfc" }}>
                  <TableCell sx={{ fontWeight: 600 }}>Compared With</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Overlap
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Overlap %
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Unique to Current
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Unique to Other
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentOverlaps.map((overlap, idx) => {
                  const otherCohortId = overlap.cohort_ids.find(
                    (id) => id !== currentCohortId
                  )
                  const otherCohort = cohorts.find(
                    (c) => c.cohort_id === otherCohortId
                  )

                  // Determine which is first/second based on the order in cohort_ids
                  const isCurrentFirst = overlap.cohort_ids[0] === currentCohortId
                  const uniqueToCurrent = isCurrentFirst
                    ? overlap.unique_to_first
                    : overlap.unique_to_second
                  const uniqueToOther = isCurrentFirst
                    ? overlap.unique_to_second
                    : overlap.unique_to_first

                  return (
                    <TableRow key={idx} hover>
                      <TableCell>{otherCohort?.cohort_name || "Unknown"}</TableCell>
                      <TableCell align="right">
                        {overlap.overlap_count.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={overlap.overlap_percentage}
                            sx={{ width: 60, height: 6, borderRadius: 1 }}
                            color="secondary"
                          />
                          {overlap.overlap_percentage.toFixed(1)}%
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ color: "primary.main" }}>
                        {uniqueToCurrent.toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "secondary.main" }}>
                        {uniqueToOther.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  )
}
