"use client"

import { Box, Paper, Typography, Button } from "@mui/material"
import { FilterList } from "@mui/icons-material"
import { ReadModeView } from "@/components/patient-enrollment/full-screen-filter-builder"
import type { FilterGroup, ColumnType, Cohort } from "@/types/cohort.types"

interface CohortFilterDisplayProps {
  filter: FilterGroup
  columns: Record<string, ColumnType>
  onEditFilters: () => void
  cohorts?: Cohort[]
}

export function CohortFilterDisplay({
  filter,
  columns,
  onEditFilters,
  cohorts = [],
}: CohortFilterDisplayProps) {
  const hasFilters = filter.rules && filter.rules.length > 0

  // If no filters, show empty state
  if (!hasFilters) {
    return (
      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          p: 4,
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: "grey.100",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
          }}
        >
          <FilterList sx={{ color: "grey.500", fontSize: 24 }} />
        </Box>
        <Typography variant="body1" fontWeight={500} gutterBottom>
          No filters applied
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          All patients from master data are included in this cohort.
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<FilterList />}
          onClick={onEditFilters}
          sx={{ textTransform: "none" }}
        >
          Add Filters
        </Button>
      </Paper>
    )
  }

  // Use ReadModeView from FullScreenFilterBuilder for consistent display
  return (
    <ReadModeView
      filter={filter}
      cohorts={cohorts}
      excludeDirtyData={filter.excludeDirtyData ?? false}
      onEditClick={onEditFilters}
      columns={columns}
    />
  )
}
