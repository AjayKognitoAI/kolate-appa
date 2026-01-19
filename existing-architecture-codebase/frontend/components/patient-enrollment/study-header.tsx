"use client"

import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
} from "@mui/material"
import {
  ArrowBack,
  Edit,
  CalendarToday,
  Update,
} from "@mui/icons-material"
import type { StudyWithCountsApi, StudyStatus } from "@/types/cohort.types"

interface StudyHeaderProps {
  study: StudyWithCountsApi
  onBack: () => void
  onEdit: () => void
}

const STATUS_COLORS: Record<StudyStatus, { bg: string; color: string; label: string }> = {
  draft: { bg: "#fef3c7", color: "#92400e", label: "Draft" },
  active: { bg: "#d1fae5", color: "#065f46", label: "Active" },
  completed: { bg: "#dbeafe", color: "#1e40af", label: "Completed" },
  archived: { bg: "#f3f4f6", color: "#4b5563", label: "Archived" },
}

export function StudyHeader({ study, onBack, onEdit }: StudyHeaderProps) {
  const statusConfig = STATUS_COLORS[study.status]
  const showUpdatedDate = study.updated_at !== study.created_at

  return (
    <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={3}>
      <Box display="flex" alignItems="flex-start" gap={2} flex={1} minWidth={0}>
        <IconButton onClick={onBack} sx={{ mt: 0.5, flexShrink: 0 }}>
          <ArrowBack />
        </IconButton>
        <Box minWidth={0} flex={1}>
          <Box display="flex" alignItems="center" gap={2} mb={0.5} flexWrap="wrap">
            <Typography variant="h5" fontWeight={600} sx={{ wordBreak: "break-word" }}>
              {study.name}
            </Typography>
            <Chip
              label={statusConfig.label}
              size="small"
              sx={{
                bgcolor: statusConfig.bg,
                color: statusConfig.color,
                fontWeight: 500,
                flexShrink: 0,
              }}
            />
          </Box>
          {study.description && (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {study.description}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Right side - Dates and Edit button */}
      <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1.5} flexShrink={0}>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={onEdit}
          sx={{ whiteSpace: "nowrap" }}
        >
          Edit Study
        </Button>

        {/* Dates */}
        <Box display="flex" alignItems="center" gap={2}>
          <Box display="flex" alignItems="center" gap={0.75}>
            <CalendarToday sx={{ fontSize: 14, color: "text.disabled" }} />
            <Typography variant="caption" color="text.secondary">
              Created {new Date(study.created_at).toLocaleDateString()}
            </Typography>
          </Box>
          {showUpdatedDate && (
            <Box display="flex" alignItems="center" gap={0.75}>
              <Update sx={{ fontSize: 14, color: "text.disabled" }} />
              <Typography variant="caption" color="text.secondary">
                Updated {new Date(study.updated_at).toLocaleDateString()}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
