"use client"

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
  Tooltip,
} from "@mui/material"
import {
  Delete,
  BookmarkBorder,
  PlayArrow,
  CalendarToday,
  FilterList,
  Code,
} from "@mui/icons-material"
import type { SavedFilter, FilterGroup, FilterRule, OperatorType } from "@/types/cohort.types"

interface SavedFiltersManagerProps {
  savedFilters: SavedFilter[]
  onLoadFilter: (filter: SavedFilter) => void
  onDeleteFilter: (filterId: string) => void
}

const OPERATOR_SYMBOLS: Record<OperatorType, string> = {
  equals: "=",
  not_equals: "≠",
  contains: "∋",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  between: "∈",
  is_empty: "∅",
  is_not_empty: "≠∅",
  in_cohort: "∈C",
  not_in_cohort: "∉C",
  // Date operators
  on_date: "=",
  before: "<",
  after: ">",
  on_or_before: "≤",
  on_or_after: "≥",
  between_dates: "∈",
}

export function SavedFiltersManager({
  savedFilters,
  onLoadFilter,
  onDeleteFilter,
}: SavedFiltersManagerProps) {
  const countRules = (group: FilterGroup): number => {
    return group.rules.reduce((count, rule) => {
      if ("logic" in rule) {
        return count + countRules(rule as FilterGroup)
      }
      return count + 1
    }, 0)
  }

  const getFilterSummary = (group: FilterGroup): string => {
    const rules: string[] = []

    const extractRules = (g: FilterGroup) => {
      g.rules.forEach((rule) => {
        if ("logic" in rule) {
          extractRules(rule as FilterGroup)
        } else {
          const r = rule as FilterRule
          const symbol = OPERATOR_SYMBOLS[r.operator]
          if (r.operator === "is_empty" || r.operator === "is_not_empty") {
            rules.push(`${r.field} ${symbol}`)
          } else if (r.operator === "between") {
            rules.push(`${r.value} ≤ ${r.field} ≤ ${r.value2}`)
          } else {
            rules.push(`${r.field} ${symbol} ${r.value}`)
          }
        }
      })
    }

    extractRules(group)
    return rules.slice(0, 3).join(" • ") + (rules.length > 3 ? ` +${rules.length - 3} more` : "")
  }

  const getFilterFormula = (group: FilterGroup): string => {
    if (group.rules.length === 0) return "∀ patients"

    const logic = group.logic === "AND" ? " ∧ " : " ∨ "
    const parts = group.rules.map((rule) => {
      if ("logic" in rule) {
        return `(${getFilterFormula(rule as FilterGroup)})`
      }
      const r = rule as FilterRule
      const symbol = OPERATOR_SYMBOLS[r.operator]
      if (r.operator === "is_empty") return `${r.field} = ∅`
      if (r.operator === "is_not_empty") return `${r.field} ≠ ∅`
      if (r.operator === "between") return `${r.value} ≤ ${r.field} ≤ ${r.value2}`
      return `${r.field} ${symbol} ${r.value}`
    })

    return parts.join(logic)
  }

  if (savedFilters.length === 0) {
    return (
      <Box>
        <Paper elevation={0} sx={{ p: 6, border: "1px solid #ececf1", textAlign: "center" }}>
          <Avatar sx={{ width: 80, height: 80, bgcolor: "warning.light", color: "warning.main", mx: "auto", mb: 3 }}>
            <BookmarkBorder sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            No Saved Filters
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={4} maxWidth={500} mx="auto">
            Save your filter configurations to quickly apply them later.
            Create filters in the Patient Enrollment tab and click Save.
          </Typography>
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
            Saved Filters
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {savedFilters.length} filter{savedFilters.length !== 1 ? "s" : ""} saved
          </Typography>
        </Box>
      </Box>

      {/* Filters Grid */}
      <Grid container spacing={3}>
        {savedFilters.map((filter) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={filter.id}>
            <Card elevation={0} sx={{ border: "1px solid #ececf1", height: "100%" }}>
              <CardContent>
                <Box display="flex" alignItems="flex-start" gap={2} mb={2}>
                  <Avatar sx={{ bgcolor: "warning.light", color: "warning.main" }}>
                    <BookmarkBorder />
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight={600} noWrap>
                      {filter.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {filter.description || "No description"}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" gap={2} mb={2}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <FilterList fontSize="small" color="action" />
                    <Typography variant="body2">
                      {countRules(filter.filter)} rule{countRules(filter.filter) !== 1 ? "s" : ""}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <CalendarToday fontSize="small" color="action" />
                    <Typography variant="body2">
                      {new Date(filter.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>

                {/* Filter Summary */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    bgcolor: "#fafbfc",
                    borderRadius: 1,
                    mb: 2,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                    Filter Criteria:
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem" noWrap>
                    {getFilterSummary(filter.filter)}
                  </Typography>
                </Paper>

                {/* Mathematical Formula */}
                <Tooltip title="Mathematical representation" arrow>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      bgcolor: "#1e1e1e",
                      borderRadius: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Code sx={{ color: "#569cd6", fontSize: 16 }} />
                    <Typography
                      variant="body2"
                      fontFamily="monospace"
                      fontSize="0.7rem"
                      sx={{ color: "#ce9178" }}
                      noWrap
                    >
                      {getFilterFormula(filter.filter)}
                    </Typography>
                  </Paper>
                </Tooltip>

                <Box mt={2}>
                  <Chip
                    label={filter.filter.logic}
                    size="small"
                    color={filter.filter.logic === "AND" ? "primary" : "secondary"}
                    variant="outlined"
                  />
                </Box>
              </CardContent>
              <CardActions sx={{ borderTop: "1px solid #ececf1", px: 2 }}>
                <Button
                  size="small"
                  startIcon={<PlayArrow />}
                  onClick={() => onLoadFilter(filter)}
                  color="primary"
                >
                  Load & Apply
                </Button>
                <Box flex={1} />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDeleteFilter(filter.id)}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
