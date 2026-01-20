"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Avatar,
  CircularProgress,
} from "@mui/material"
import { Edit, Group } from "@mui/icons-material"
import type { CohortApi } from "@/types/cohort.types"

interface CohortEditDialogProps {
  open: boolean
  cohort: CohortApi
  onClose: () => void
  onSave: (name: string, description: string) => Promise<void>
}

export function CohortEditDialog({
  open,
  cohort,
  onClose,
  onSave,
}: CohortEditDialogProps) {
  const [name, setName] = useState(cohort.name)
  const [description, setDescription] = useState(cohort.description || "")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(cohort.name)
      setDescription(cohort.description || "")
      setError(null)
    }
  }, [open, cohort])

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Cohort name is required")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave(name.trim(), description.trim())
    } catch (err) {
      setError("Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = name !== cohort.name || description !== (cohort.description || "")

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>
            <Edit />
          </Avatar>
          <Box>
            <Typography variant="h6">Edit Cohort Details</Typography>
            <Typography variant="body2" color="text.secondary">
              Update the name and description
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box mt={2}>
          <TextField
            fullWidth
            label="Cohort Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            error={Boolean(error)}
            helperText={error}
            required
            autoFocus
          />

          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            sx={{ mt: 2 }}
            placeholder="Add a description for this cohort..."
          />

          {/* Info */}
          <Box mt={3} p={2} bgcolor="#fafbfc" borderRadius={1}>
            <Typography variant="body2" color="text.secondary">
              <strong>Cohort ID:</strong> {cohort.id}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              <strong>Created:</strong> {new Date(cohort.created_at).toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              <strong>Patients:</strong> {cohort.patient_count.toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving || !hasChanges || !name.trim()}
          startIcon={isSaving ? <CircularProgress size={16} /> : null}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
