"use client"

import {
  Box,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material"
import {
  ArrowBack,
  EditOutlined,
  Groups2Outlined,
  CalendarTodayOutlined,
} from "@mui/icons-material"
import type { CohortApi } from "@/types/cohort.types"

interface CohortHeaderProps {
  cohort: CohortApi
  onBack: () => void
  onEdit: () => void
}

export function CohortHeader({ cohort, onBack, onEdit }: CohortHeaderProps) {
  const formattedDate = new Date(cohort.created_at).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  })

  return (
    <Box display="flex" alignItems="flex-start" gap={2}>
      {/* Back Button */}
      <Tooltip title="Back to Study">
        <IconButton
          onClick={onBack}
          sx={{
            mt: 0.5,
            color: "text.secondary",
            "&:hover": {
              bgcolor: "action.hover",
            }
          }}
        >
          <ArrowBack />
        </IconButton>
      </Tooltip>

      {/* Icon */}
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
          boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
          flexShrink: 0,
        }}
      >
        <Groups2Outlined sx={{ fontSize: 24, color: "#fff" }} />
      </Box>

      {/* Info */}
      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography
            variant="h5"
            fontWeight={600}
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "400px",
            }}
          >
            {cohort.name}
          </Typography>
          <Tooltip title="Edit cohort details">
            <IconButton
              size="small"
              onClick={onEdit}
              sx={{
                color: "text.secondary",
                "&:hover": {
                  color: "primary.main",
                  bgcolor: "primary.50",
                }
              }}
            >
              <EditOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {cohort.description && (
          <Tooltip
            title={cohort.description}
            placement="bottom-start"
            enterDelay={500}
            slotProps={{
              tooltip: {
                sx: {
                  maxWidth: 400,
                  fontSize: "0.875rem",
                  lineHeight: 1.5,
                }
              }
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.5,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "600px",
                cursor: "default",
              }}
            >
              {cohort.description}
            </Typography>
          </Tooltip>
        )}
      </Box>

      {/* Created Date - Right Side */}
      <Box
        display="inline-flex"
        alignItems="center"
        gap={0.75}
        sx={{
          px: 1.5,
          py: 0.5,
          borderRadius: 1.5,
          bgcolor: "grey.50",
          border: "1px solid",
          borderColor: "grey.200",
          flexShrink: 0,
          alignSelf: "center",
        }}
      >
        <CalendarTodayOutlined sx={{ fontSize: 14, color: "text.secondary" }} />
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          Created: {formattedDate}
        </Typography>
      </Box>
    </Box>
  )
}
