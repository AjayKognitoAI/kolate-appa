"use client"

import { useState } from "react"
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from "@mui/material"
import {
  Add,
  Delete,
  Group,
  Visibility,
  People,
  CalendarToday,
} from "@mui/icons-material"
import type { PatientData } from "@/lib/screening-logic"
import type { ColumnType, Cohort } from "@/types/cohort.types"

interface CohortManagerProps {
  cohorts: Cohort[]
  data: PatientData[]
  columns: Record<string, ColumnType>
  onDeleteCohort: (cohortId: string) => void
  onCreateCohort: (name: string, description: string) => void
}

export function CohortManager({
  cohorts,
  data,
  columns,
  onDeleteCohort,
  onCreateCohort,
}: CohortManagerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null)
  const [newCohortName, setNewCohortName] = useState("")
  const [newCohortDescription, setNewCohortDescription] = useState("")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const handleCreateCohort = () => {
    if (newCohortName.trim()) {
      onCreateCohort(newCohortName.trim(), newCohortDescription.trim())
      setCreateDialogOpen(false)
      setNewCohortName("")
      setNewCohortDescription("")
    }
  }

  const handleViewCohort = (cohort: Cohort) => {
    setSelectedCohort(cohort)
    setViewDialogOpen(true)
    setPage(0)
  }

  const getCohortPatients = (cohort: Cohort): PatientData[] => {
    return data.filter((patient, idx) => {
      const patientId = patient.patient_id?.toString() || `patient-${idx}`
      return cohort.patientIds.includes(patientId)
    })
  }

  const columnKeys = Object.keys(columns)

  if (cohorts.length === 0) {
    return (
      <Box>
        <Paper elevation={0} sx={{ p: 6, border: "1px solid #ececf1", textAlign: "center" }}>
          <Avatar sx={{ width: 80, height: 80, bgcolor: "info.light", color: "info.main", mx: "auto", mb: 3 }}>
            <Group sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            No Cohorts Created
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={4} maxWidth={500} mx="auto">
            Cohorts help you organize and group patients based on screening criteria.
            Create cohorts from filtered results in the Patient Enrollment tab.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Empty Cohort
          </Button>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Cohort Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {cohorts.length} cohort{cohorts.length !== 1 ? "s" : ""} created
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Cohort
        </Button>
      </Box>

      {/* Cohort Grid */}
      <Grid container spacing={3}>
        {cohorts.map((cohort) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cohort.id}>
            <Card elevation={0} sx={{ border: "1px solid #ececf1", height: "100%" }}>
              <CardContent>
                <Box display="flex" alignItems="flex-start" gap={2} mb={2}>
                  <Avatar sx={{ bgcolor: "info.light", color: "info.main" }}>
                    <Group />
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight={600} noWrap>
                      {cohort.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {cohort.description || "No description"}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" gap={2} mb={2}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <People fontSize="small" color="action" />
                    <Typography variant="body2">
                      {cohort.patientCount} patients
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <CalendarToday fontSize="small" color="action" />
                    <Typography variant="body2">
                      {new Date(cohort.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>

                {cohort.sourceFilterName && (
                  <Chip
                    label={`From: ${cohort.sourceFilterName}`}
                    size="small"
                    variant="outlined"
                    sx={{ mb: 1 }}
                  />
                )}
              </CardContent>
              <CardActions sx={{ borderTop: "1px solid #ececf1", px: 2 }}>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => handleViewCohort(cohort)}
                >
                  View
                </Button>
                <Box flex={1} />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDeleteCohort(cohort.id)}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Cohort</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Create an empty cohort. You can add patients later from the Patient Enrollment tab.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Cohort Name"
            value={newCohortName}
            onChange={(e) => setNewCohortName(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description (optional)"
            value={newCohortDescription}
            onChange={(e) => setNewCohortDescription(e.target.value)}
            margin="normal"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCohort} disabled={!newCohortName.trim()}>
            Create Cohort
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Cohort Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: "info.light", color: "info.main" }}>
              <Group />
            </Avatar>
            <Box>
              <Typography variant="h6">{selectedCohort?.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedCohort?.patientCount} patients
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCohort && (
            <>
              {selectedCohort.description && (
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {selectedCohort.description}
                </Typography>
              )}

              <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #ececf1" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#fafbfc" }}>
                      {columnKeys.slice(0, 6).map((col) => (
                        <TableCell key={col} sx={{ fontWeight: 600 }}>
                          {col}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getCohortPatients(selectedCohort)
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((patient, idx) => (
                        <TableRow key={idx} hover>
                          {columnKeys.slice(0, 6).map((col) => (
                            <TableCell key={col}>{String(patient[col] ?? "")}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={getCohortPatients(selectedCohort).length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10))
                  setPage(0)
                }}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
