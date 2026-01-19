"use client"

import {
  Card,
  CardContent,
  CardActions,
  Box,
  Avatar,
  Typography,
  Button,
  IconButton,
  Chip,
} from "@mui/material"
import {
  Science,
  Visibility,
  Delete,
  Edit,
  Storage,
  Group,
  People,
  CalendarToday,
} from "@mui/icons-material"
import { OverflowTooltip } from "@/components/common/OverflowTooltip"
import type { StudyApi, StudyWithCountsApi, StudyStatus } from "@/types/cohort.types"

interface StudyCardProps {
  study: StudyApi | StudyWithCountsApi
  onView: (study: StudyApi | StudyWithCountsApi) => void
  onEdit?: (study: StudyApi | StudyWithCountsApi) => void
  onDelete?: (study: StudyApi | StudyWithCountsApi) => void
}

const STATUS_COLORS: Record<StudyStatus, { bg: string; color: string; label: string }> = {
  draft: { bg: "#fef3c7", color: "#92400e", label: "Draft" },
  active: { bg: "#d1fae5", color: "#065f46", label: "Active" },
  completed: { bg: "#dbeafe", color: "#1e40af", label: "Completed" },
  archived: { bg: "#f3f4f6", color: "#4b5563", label: "Archived" },
}

function isStudyWithCounts(study: StudyApi | StudyWithCountsApi): study is StudyWithCountsApi {
  return "master_data_count" in study
}

export function StudyCard({ study, onView, onEdit, onDelete }: StudyCardProps) {
  const statusConfig = STATUS_COLORS[study.status]
  const hasCounts = isStudyWithCounts(study)

  return (
    <Card elevation={0} sx={{ border: "1px solid #ececf1", height: "100%", minHeight: 160 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box display="flex" alignItems="flex-start" gap={1.5} mb={1}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.light", color: "primary.main" }}>
            <Science sx={{ fontSize: 18 }} />
          </Avatar>
          <Box flex={1} minWidth={0}>
            <Box display="flex" alignItems="center" gap={0.5} mb={0.25}>
              <OverflowTooltip title={study.name}>
                <Typography variant="subtitle2" fontWeight={600} noWrap>
                  {study.name}
                </Typography>
              </OverflowTooltip>
              <Chip
                label={statusConfig.label}
                size="small"
                sx={{
                  bgcolor: statusConfig.bg,
                  color: statusConfig.color,
                  fontWeight: 500,
                  fontSize: "0.65rem",
                  height: 18,
                }}
              />
            </Box>
            <OverflowTooltip title={study.description || "No description"}>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                {study.description || "No description"}
              </Typography>
            </OverflowTooltip>
          </Box>
        </Box>

        <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="center">
          {hasCounts && (
            <>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Storage sx={{ fontSize: 14 }} color="action" />
                <Typography variant="caption" color="text.secondary">
                  {study.master_data_count} file{study.master_data_count !== 1 ? "s" : ""}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Group sx={{ fontSize: 14 }} color="action" />
                <Typography variant="caption" color="text.secondary">
                  {study.cohort_count} cohort{study.cohort_count !== 1 ? "s" : ""}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <People sx={{ fontSize: 14 }} color="action" />
                <Typography variant="caption" color="text.secondary">
                  {study.total_patients.toLocaleString()}
                </Typography>
              </Box>
            </>
          )}
          <Box display="flex" alignItems="center" gap={0.5}>
            <CalendarToday sx={{ fontSize: 14 }} color="action" />
            <Typography variant="caption" color="text.secondary">
              {new Date(study.created_at).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>
      </CardContent>

      <CardActions sx={{ borderTop: "1px solid #ececf1", px: 1.5, py: 0.75 }}>
        <Button
          size="small"
          startIcon={<Visibility sx={{ fontSize: 16 }} />}
          onClick={() => onView(study)}
          sx={{
            px: 1.5,
            py: 0.25,
            fontSize: "0.75rem",
            borderRadius: "6px !important",
            color: "primary.main",
            border: "1px solid transparent",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              borderColor: "primary.main",
            },
          }}
        >
          View
        </Button>
        {onEdit && (
          <IconButton
            size="small"
            onClick={() => onEdit(study)}
            sx={{ p: 0.5 }}
          >
            <Edit sx={{ fontSize: 16 }} />
          </IconButton>
        )}
        <Box flex={1} />
        {onDelete && (
          <IconButton
            size="small"
            color="error"
            onClick={() => onDelete(study)}
            sx={{ p: 0.5 }}
          >
            <Delete sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </CardActions>
    </Card>
  )
}
