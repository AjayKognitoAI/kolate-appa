"use client"

import { useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Typography,
} from "@mui/material"
import { Group } from "@mui/icons-material"
import type { MasterDataApi, CohortCreateRequest, FilterGroup, ColumnSchema } from "@/types/cohort.types"

interface CohortCreateDialogProps {
  open: boolean
  studyId: string
  masterDataList: MasterDataApi[]
  onClose: () => void
  onSubmit: (data: Omit<CohortCreateRequest, "enterprise_id" | "user_id" | "user_name">) => Promise<void>
}

export function CohortCreateDialog({
  open,
  studyId,
  masterDataList,
  onClose,
  onSubmit,
}: CohortCreateDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedMasterDataId, setSelectedMasterDataId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedMasterData = masterDataList.find(md => md.id === selectedMasterDataId)

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Cohort name is required")
      return
    }

    if (!selectedMasterDataId) {
      setError("Please select a master data file")
      return
    }

    if (!selectedMasterData) {
      setError("Selected master data not found")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const defaultFilter: FilterGroup = {
        id: "root",
        logic: "AND",
        rules: [],
      }

      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        study_id: studyId,
        master_data_id: selectedMasterDataId,
        columns: selectedMasterData.columns as ColumnSchema,
        filter: defaultFilter,
        filtered_patient_ids: [], // Will be populated when filter is applied
        patient_count: 0,
        master_data_patient_count: selectedMasterData.row_count,
      })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create cohort")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setName("")
    setDescription("")
    setSelectedMasterDataId("")
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Group color="primary" />
          Create New Cohort
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box pt={1}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Cohort Name"
            placeholder="e.g., Adult Patients with High EASI Score"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="dense"
            required
            autoFocus
            inputProps={{ maxLength: 255 }}
          />

          <TextField
            fullWidth
            label="Description"
            placeholder="Describe the criteria for this cohort..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="dense"
            multiline
            rows={2}
            inputProps={{ maxLength: 1000 }}
          />

          <FormControl fullWidth margin="dense" required>
            <InputLabel>Select Master Data</InputLabel>
            <Select
              value={selectedMasterDataId}
              label="Select Master Data"
              onChange={(e) => setSelectedMasterDataId(e.target.value)}
            >
              {masterDataList.map((md) => (
                <MenuItem key={md.id} value={md.id}>
                  {md.file_name} ({md.row_count.toLocaleString()} rows)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedMasterData && (
            <Box mt={2} p={2} bgcolor="#f5f5f5" borderRadius={1}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Dataset
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedMasterData.row_count.toLocaleString()} patients &bull;{" "}
                {Object.keys(selectedMasterData.columns).length} columns
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || !name.trim() || !selectedMasterDataId}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : undefined}
        >
          {isSubmitting ? "Creating..." : "Create Cohort"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
