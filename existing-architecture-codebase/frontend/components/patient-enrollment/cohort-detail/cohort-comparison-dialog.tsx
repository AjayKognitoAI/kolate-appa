"use client"

import { useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material"
import { CompareArrows, Group, People } from "@mui/icons-material"
import type { CohortApi } from "@/types/cohort.types"

interface CohortComparisonDialogProps {
  open: boolean
  allCohorts: CohortApi[]
  onClose: () => void
  onCompare: (selectedCohortIds: string[]) => Promise<void>
}

export function CohortComparisonDialog({
  open,
  allCohorts,
  onClose,
  onCompare,
}: CohortComparisonDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isComparing, setIsComparing] = useState(false)

  const handleToggle = (cohortId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(cohortId)) {
      newSelected.delete(cohortId)
    } else {
      // Max 4 cohorts for comparison (plus current = 5 total)
      if (newSelected.size < 4) {
        newSelected.add(cohortId)
      }
    }
    setSelectedIds(newSelected)
  }

  const handleCompare = async () => {
    if (selectedIds.size === 0) return

    setIsComparing(true)
    try {
      await onCompare(Array.from(selectedIds))
    } finally {
      setIsComparing(false)
    }
  }

  const handleClose = () => {
    setSelectedIds(new Set())
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: "primary.main", color: "white" }}>
            <CompareArrows />
          </Avatar>
          <Box>
            <Typography variant="h6">Compare Cohorts</Typography>
            <Typography variant="body2" color="text.secondary">
              Select cohorts to compare with the current one
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {allCohorts.length === 0 ? (
          <Alert severity="info">
            No other cohorts available for comparison. Create more cohorts to enable comparison.
          </Alert>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Select up to 4 cohorts to compare. Comparison will show overlapping patients
              and unique patients in each cohort.
            </Alert>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Available Cohorts ({allCohorts.length})
            </Typography>

            <List sx={{ border: "1px solid #ececf1", borderRadius: 1 }}>
              {allCohorts.map((cohort) => {
                const isSelected = selectedIds.has(cohort.id)
                return (
                  <ListItem
                    key={cohort.id}
                    disablePadding
                    secondaryAction={
                      <Chip
                        size="small"
                        icon={<People />}
                        label={cohort.patient_count.toLocaleString()}
                        variant="outlined"
                      />
                    }
                  >
                    <ListItemButton
                      onClick={() => handleToggle(cohort.id)}
                      disabled={!isSelected && selectedIds.size >= 4}
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={isSelected}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={cohort.name}
                        secondary={
                          cohort.description ||
                          `Created ${new Date(cohort.created_at).toLocaleDateString()}`
                        }
                        primaryTypographyProps={{ fontWeight: isSelected ? 600 : 400 }}
                      />
                    </ListItemButton>
                  </ListItem>
                )
              })}
            </List>

            {selectedIds.size > 0 && (
              <Box mt={2} p={2} bgcolor="#fafbfc" borderRadius={1}>
                <Typography variant="body2" color="text.secondary">
                  <strong>{selectedIds.size}</strong> cohort{selectedIds.size !== 1 ? "s" : ""} selected for comparison
                </Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isComparing}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCompare}
          disabled={selectedIds.size === 0 || isComparing}
          startIcon={isComparing ? <CircularProgress size={16} /> : <CompareArrows />}
        >
          {isComparing ? "Comparing..." : `Compare ${selectedIds.size > 0 ? `(${selectedIds.size + 1})` : ""}`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
