"use client"

import { useState } from "react"
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  Avatar,
  Grid,
  Button,
  Collapse,
  IconButton,
  Alert,
} from "@mui/material"
import {
  CheckCircle,
  People,
  FilterList,
  Assessment,
  Download,
  Warning,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material"
import * as XLSX from "xlsx"
import type { PatientData } from "@/lib/screening-logic"
import type { ColumnType, FilterGroup, FilterRule } from "@/types/cohort.types"

interface ResultsPreviewStepProps {
  data: PatientData[]
  columns: Record<string, ColumnType>
  totalCount: number
  cohortName: string
  filter: FilterGroup
  // Dirty data preview props
  excludeDirtyData?: boolean
  excludedDirtyData?: PatientData[]
}

type SortDirection = "asc" | "desc"

// Type guard
const isFilterRule = (rule: FilterRule | FilterGroup): rule is FilterRule => {
  return !("logic" in rule)
}

const OPERATOR_SYMBOLS: Record<string, string> = {
  equals: "=",
  not_equals: "≠",
  contains: "∋",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  between: "∈",
  is_empty: "= ∅",
  is_not_empty: "≠ ∅",
  in_cohort: "∈ C",
  not_in_cohort: "∉ C",
}

// Format cell value, showing "To Be Obtained" for empty/null values
const formatCellValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === "" ||
      (typeof value === "string" && value.trim() === "")) {
    return (
      <Chip
        label="To Be Obtained"
        size="small"
        sx={{
          bgcolor: "#fff3e0",
          color: "#e65100",
          fontSize: "0.7rem",
          height: 20,
          "& .MuiChip-label": { px: 1 },
        }}
      />
    )
  }
  return String(value)
}

export function ResultsPreviewStep({
  data,
  columns,
  totalCount,
  cohortName,
  filter,
  excludeDirtyData = true,
  excludedDirtyData = [],
}: ResultsPreviewStepProps) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [showExcludedData, setShowExcludedData] = useState(false)
  const [excludedPage, setExcludedPage] = useState(0)
  const [excludedRowsPerPage, setExcludedRowsPerPage] = useState(10)

  const columnKeys = Object.keys(columns)
  const matchRate = totalCount > 0 ? ((data.length / totalCount) * 100).toFixed(1) : "0"

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0

    const aVal = a[sortColumn]
    const bVal = b[sortColumn]

    if (aVal === null || aVal === undefined) return 1
    if (bVal === null || bVal === undefined) return -1

    const comparison = columns[sortColumn] === "number"
      ? Number(aVal) - Number(bVal)
      : String(aVal).localeCompare(String(bVal))

    return sortDirection === "asc" ? comparison : -comparison
  })

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Cohort Data")
    XLSX.writeFile(wb, `${cohortName.replace(/\s+/g, "_")}_cohort.xlsx`)
  }

  const handleExportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(data)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${cohortName.replace(/\s+/g, "_")}_cohort.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Get filter rules for display
  const getFilterRules = (group: FilterGroup): FilterRule[] => {
    const rules: FilterRule[] = []
    group.rules.forEach((rule) => {
      if (isFilterRule(rule)) {
        rules.push(rule)
      } else {
        rules.push(...getFilterRules(rule as FilterGroup))
      }
    })
    return rules
  }

  const filterRules = getFilterRules(filter)

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Preview & Save Cohort
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={4}>
        Review your filtered results before saving the cohort.
      </Typography>

      {/* Summary Stats */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 3, border: "1px solid #ececf1", textAlign: "center" }}>
            <Avatar sx={{ bgcolor: "success.light", color: "success.main", mx: "auto", mb: 2, width: 56, height: 56 }}>
              <CheckCircle />
            </Avatar>
            <Typography variant="h4" fontWeight={700}>
              {data.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Matching Patients
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 3, border: "1px solid #ececf1", textAlign: "center" }}>
            <Avatar sx={{ bgcolor: "primary.light", color: "primary.main", mx: "auto", mb: 2, width: 56, height: 56 }}>
              <People />
            </Avatar>
            <Typography variant="h4" fontWeight={700}>
              {totalCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Patients
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 3, border: "1px solid #ececf1", textAlign: "center" }}>
            <Avatar sx={{ bgcolor: "info.light", color: "info.main", mx: "auto", mb: 2, width: 56, height: 56 }}>
              <Assessment />
            </Avatar>
            <Typography variant="h4" fontWeight={700}>
              {matchRate}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Match Rate
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper elevation={0} sx={{ p: 3, border: "1px solid #ececf1", textAlign: "center" }}>
            <Avatar sx={{ bgcolor: "warning.light", color: "warning.main", mx: "auto", mb: 2, width: 56, height: 56 }}>
              <FilterList />
            </Avatar>
            <Typography variant="h4" fontWeight={700}>
              {filterRules.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Filters
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Applied Filters Summary */}
      {filterRules.length > 0 && (
        <Paper elevation={0} sx={{ p: 3, border: "1px solid #ececf1", mb: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Applied Filters ({filter.logic})
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {filterRules.map((rule) => (
              <Chip
                key={rule.id}
                label={
                  rule.operator === "between"
                    ? `${rule.field}: ${rule.value} - ${rule.value2}`
                    : ["is_empty", "is_not_empty"].includes(rule.operator)
                      ? `${rule.field} ${OPERATOR_SYMBOLS[rule.operator]}`
                      : `${rule.field} ${OPERATOR_SYMBOLS[rule.operator]} ${rule.value}`
                }
                variant="outlined"
                size="small"
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Data Preview */}
      <Paper elevation={0} sx={{ border: "1px solid #ececf1" }}>
        <Box
          px={2}
          py={1.5}
          borderBottom="1px solid #ececf1"
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Cohort: {cohortName}
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportCSV}
            >
              CSV
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportExcel}
            >
              Excel
            </Button>
          </Box>
        </Box>

        {data.length === 0 ? (
          <Box p={6} textAlign="center">
            <Typography variant="h6" color="text.secondary">
              No patients match your filter criteria
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Go back and adjust your filters to include more patients
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {columnKeys.map((col) => (
                      <TableCell
                        key={col}
                        sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}
                        sortDirection={sortColumn === col ? sortDirection : false}
                      >
                        <TableSortLabel
                          active={sortColumn === col}
                          direction={sortColumn === col ? sortDirection : "asc"}
                          onClick={() => handleSort(col)}
                        >
                          {col}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, idx) => (
                      <TableRow key={idx} hover>
                        {columnKeys.map((col) => (
                          <TableCell key={col}>
                            {formatCellValue(row[col])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={data.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10))
                setPage(0)
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </Paper>

      {/* Excluded Dirty Data Preview */}
      {excludeDirtyData && excludedDirtyData.length > 0 && (
        <Paper elevation={0} sx={{ border: "1px solid #ececf1", mt: 3 }}>
          <Box
            px={2}
            py={1.5}
            borderBottom="1px solid #ececf1"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            bgcolor="#fff8e1"
            sx={{ cursor: "pointer" }}
            onClick={() => setShowExcludedData(!showExcludedData)}
          >
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: "warning.light", color: "warning.main", width: 36, height: 36 }}>
                <Warning fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Excluded Records (Missing Data)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {excludedDirtyData.length} records with missing/empty values were excluded
                </Typography>
              </Box>
            </Box>
            <IconButton size="small">
              {showExcludedData ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={showExcludedData}>
            <Alert severity="warning" sx={{ m: 2 }}>
              These records contain empty or missing values and have been excluded from the cohort.
              Values marked as &quot;To Be Obtained&quot; indicate missing data.
            </Alert>

            <TableContainer sx={{ maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {columnKeys.map((col) => (
                      <TableCell
                        key={col}
                        sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}
                      >
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {excludedDirtyData
                    .slice(excludedPage * excludedRowsPerPage, excludedPage * excludedRowsPerPage + excludedRowsPerPage)
                    .map((row, idx) => (
                      <TableRow key={idx} hover sx={{ bgcolor: "#fffbf0" }}>
                        {columnKeys.map((col) => (
                          <TableCell key={col}>
                            {formatCellValue(row[col])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={excludedDirtyData.length}
              page={excludedPage}
              onPageChange={(_, newPage) => setExcludedPage(newPage)}
              rowsPerPage={excludedRowsPerPage}
              onRowsPerPageChange={(e) => {
                setExcludedRowsPerPage(parseInt(e.target.value, 10))
                setExcludedPage(0)
              }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </Collapse>
        </Paper>
      )}
    </Box>
  )
}
