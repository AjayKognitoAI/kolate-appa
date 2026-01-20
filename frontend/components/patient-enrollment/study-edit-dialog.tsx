"use client"

import { useState, useEffect } from "react"
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
} from "@mui/material"
import { Edit } from "@mui/icons-material"
import type { StudyStatus, StudyUpdateRequest, StudyWithCountsApi } from "@/types/cohort.types"

interface StudyEditDialogProps {
  open: boolean
  study: StudyWithCountsApi | null
  onClose: () => void
  onSubmit: (data: StudyUpdateRequest) => Promise<void>
  userId: string
  userName?: string
}

export function StudyEditDialog({
  open,
  study,
  onClose,
  onSubmit,
  userId,
  userName,
}: StudyEditDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<StudyStatus>("draft")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (study) {
      setName(study.name)
      setDescription(study.description || "")
      setStatus(study.status)
    }
  }, [study])

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Study name is required")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        status,
        user_id: userId,
        user_name: userName || null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update study")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Edit color="primary" />
          Edit Study
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
            label="Study Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="dense"
            required
            inputProps={{ maxLength: 255 }}
          />

          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="dense"
            multiline
            rows={3}
            inputProps={{ maxLength: 2000 }}
          />

          <FormControl fullWidth margin="dense">
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => setStatus(e.target.value as StudyStatus)}
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || !name.trim()}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : undefined}
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
