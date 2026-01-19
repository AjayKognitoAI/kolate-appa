"use client"

import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  LinearProgress,
} from "@mui/material"
import {
  CloudUpload,
  FilterList,
  Group,
  BookmarkBorder,
  ArrowForward,
  People,
  Assessment,
  TrendingUp,
  Storage,
} from "@mui/icons-material"
import type { PatientData } from "@/lib/screening-logic"
import type { ColumnType, Cohort, SavedFilter } from "@/types/cohort.types"

interface ScreeningDashboardProps {
  data: PatientData[]
  filteredData: PatientData[]
  columns: Record<string, ColumnType>
  cohorts: Cohort[]
  savedFilters: SavedFilter[]
  onNavigate: (tab: number) => void
}

export function ScreeningDashboard({
  data,
  filteredData,
  columns,
  cohorts,
  savedFilters,
  onNavigate,
}: ScreeningDashboardProps) {
  const hasData = data.length > 0
  const columnCount = Object.keys(columns).length
  const numericColumns = Object.values(columns).filter((t) => t === "number").length
  const stringColumns = Object.values(columns).filter((t) => t === "string").length
  const filterRate = hasData ? ((filteredData.length / data.length) * 100).toFixed(1) : "0"

  if (!hasData) {
    return (
      <Box>
        <Paper elevation={0} sx={{ p: 6, border: "1px solid #ececf1", textAlign: "center" }}>
          <Avatar sx={{ width: 80, height: 80, bgcolor: "primary.light", color: "primary.main", mx: "auto", mb: 3 }}>
            <CloudUpload sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Welcome to Patient Enrollment
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={4} maxWidth={500} mx="auto">
            Get started by uploading your patient data. You can upload CSV, JSON, or Excel files
            containing patient records for screening and cohort management.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<CloudUpload />}
            onClick={() => onNavigate(0)}
          >
            Upload Patient Data
          </Button>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      {/* Stats Grid */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 3, border: "1px solid #ececf1", height: "100%" }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>
                <People />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={600}>{data.length}</Typography>
                <Typography variant="body2" color="text.secondary">Total Patients</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 3, border: "1px solid #ececf1", height: "100%" }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: "success.light", color: "success.main" }}>
                <Assessment />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={600}>{filteredData.length}</Typography>
                <Typography variant="body2" color="text.secondary">Filtered Results</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 3, border: "1px solid #ececf1", height: "100%" }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: "info.light", color: "info.main" }}>
                <Group />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={600}>{cohorts.length}</Typography>
                <Typography variant="body2" color="text.secondary">Active Cohorts</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 3, border: "1px solid #ececf1", height: "100%" }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: "warning.light", color: "warning.main" }}>
                <BookmarkBorder />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={600}>{savedFilters.length}</Typography>
                <Typography variant="body2" color="text.secondary">Saved Filters</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Data Overview */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ border: "1px solid #ececf1", height: "100%" }}>
            <Box p={2} borderBottom="1px solid #ececf1" display="flex" alignItems="center" gap={2}>
              <Storage color="primary" />
              <Typography variant="h6" fontWeight={600}>Data Overview</Typography>
            </Box>
            <Box p={3}>
              <Box mb={3}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">Filter Match Rate</Typography>
                  <Typography variant="body2" fontWeight={600}>{filterRate}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={parseFloat(filterRate)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Total Columns</Typography>
                  <Typography variant="h6" fontWeight={600}>{columnCount}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Numeric Columns</Typography>
                  <Typography variant="h6" fontWeight={600}>{numericColumns}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Text Columns</Typography>
                  <Typography variant="h6" fontWeight={600}>{stringColumns}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary">Records Loaded</Typography>
                  <Typography variant="h6" fontWeight={600}>{data.length}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Button
                fullWidth
                variant="outlined"
                endIcon={<ArrowForward />}
                onClick={() => onNavigate(0)}
              >
                Upload New Data
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ border: "1px solid #ececf1", height: "100%" }}>
            <Box p={2} borderBottom="1px solid #ececf1" display="flex" alignItems="center" gap={2}>
              <TrendingUp color="primary" />
              <Typography variant="h6" fontWeight={600}>Quick Actions</Typography>
            </Box>
            <List>
              <ListItem
                component="button"
                onClick={() => onNavigate(1)}
                sx={{
                  border: "none",
                  bgcolor: "transparent",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: "primary.light", color: "primary.main", width: 40, height: 40 }}>
                    <FilterList />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary="Screen Patients"
                  secondary="Apply filters to find eligible patients"
                />
                <ArrowForward color="action" />
              </ListItem>

              <Divider variant="inset" component="li" />

              <ListItem
                component="button"
                onClick={() => onNavigate(2)}
                sx={{
                  border: "none",
                  bgcolor: "transparent",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: "info.light", color: "info.main", width: 40, height: 40 }}>
                    <Group />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary="Manage Cohorts"
                  secondary={`${cohorts.length} cohorts created`}
                />
                <ArrowForward color="action" />
              </ListItem>

              <Divider variant="inset" component="li" />

              <ListItem
                component="button"
                onClick={() => onNavigate(3)}
                sx={{
                  border: "none",
                  bgcolor: "transparent",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: "warning.light", color: "warning.main", width: 40, height: 40 }}>
                    <BookmarkBorder />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary="Saved Filters"
                  secondary={`${savedFilters.length} filters saved`}
                />
                <ArrowForward color="action" />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Recent Cohorts */}
        {cohorts.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ border: "1px solid #ececf1" }}>
              <Box p={2} borderBottom="1px solid #ececf1" display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight={600}>Recent Cohorts</Typography>
                <Button size="small" onClick={() => onNavigate(2)}>View All</Button>
              </Box>
              <List>
                {cohorts.slice(0, 3).map((cohort) => (
                  <ListItem key={cohort.id}>
                    <ListItemIcon>
                      <Group color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary={cohort.name}
                      secondary={cohort.description || "No description"}
                    />
                    <Chip label={`${cohort.patientCount} patients`} size="small" />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        )}

        {/* Saved Filters */}
        {savedFilters.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ border: "1px solid #ececf1" }}>
              <Box p={2} borderBottom="1px solid #ececf1" display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight={600}>Saved Filters</Typography>
                <Button size="small" onClick={() => onNavigate(3)}>View All</Button>
              </Box>
              <List>
                {savedFilters.slice(0, 3).map((filter) => (
                  <ListItem key={filter.id}>
                    <ListItemIcon>
                      <BookmarkBorder color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={filter.name}
                      secondary={filter.description || "No description"}
                    />
                    <Chip label={`${filter.filter.rules.length} rules`} size="small" variant="outlined" />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}
