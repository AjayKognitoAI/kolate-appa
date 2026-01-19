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
} from "@mui/material"
import { Science } from "@mui/icons-material"
import type { StudyStatus, StudyCreateRequest } from "@/types/cohort.types"

interface StudyCreateDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: StudyCreateRequest) => Promise<void>
  enterpriseId: string
  userId: string
  userName?: string
}

export function StudyCreateDialog({
  open,
  onClose,
  onSubmit,
  enterpriseId,
  userId,
  userName,
}: StudyCreateDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<StudyStatus>("draft")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        enterprise_id: enterpriseId,
        user_id: userId,
        user_name: userName || null,
      })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create study")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setName("")
    setDescription("")
    setStatus("draft")
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Science color="primary" />
          Create New Study
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
            placeholder="e.g., Phase 2 Clinical Trial - Atopic Dermatitis"
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
            placeholder="Describe the purpose and scope of this study..."
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
          {isSubmitting ? "Creating..." : "Create Study"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
