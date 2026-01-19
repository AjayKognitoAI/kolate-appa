"use client"

import { useState, useMemo } from "react"
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
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Chip,
  Collapse,
  Alert,
} from "@mui/material"
import {
  SearchOutlined,
  ViewColumnOutlined,
  TagOutlined,
  NumbersOutlined,
  TextFieldsOutlined,
  CalendarTodayOutlined,
  KeyboardArrowDown,
  KeyboardArrowUp,
  CheckCircle,
  Cancel,
  Info,
} from "@mui/icons-material"
import type { PatientData } from "@/lib/screening-logic"
import type { ColumnType, FilterGroup, FilterRule, CriteriaFormula } from "@/types/cohort.types"
import type { GroupedPatientRecords, GroupedPatientResult } from "@/utils/patient-id-utils"

// Common patient ID column patterns (in priority order)
const PATIENT_ID_PATTERNS = [
  /^patient_?id$/i,
  /^subject_?id$/i,
  /^participant_?id$/i,
  /^id$/i,
  /patient.*id/i,
  /subject.*id/i,
]

/**
 * Detect the patient ID column from column names
 */
function detectPatientIdColumn(columnNames: string[]): string | null {
  for (const pattern of PATIENT_ID_PATTERNS) {
    const match = columnNames.find((col) => pattern.test(col))
    if (match) return match
  }
  return null
}

/**
 * Reorder columns to put patient ID column first
 */
function reorderColumnsWithIdFirst(columnNames: string[]): string[] {
  const patientIdCol = detectPatientIdColumn(columnNames)
  if (!patientIdCol) {
    // If no patient ID column detected, return first column at front (it's likely the main identifier)
    return columnNames
  }

  // Move patient ID column to front
  return [patientIdCol, ...columnNames.filter((col) => col !== patientIdCol)]
}

interface CohortDataTableProps {
  data: PatientData[]
  columns: Record<string, ColumnType>
  title?: string
  // Props for grouped view with matched/unmatched records
  groupedData?: GroupedPatientResult
  showGroupedView?: boolean
  // Props for applied criteria display
  /** The applied filter criteria for display in summary */
  appliedFilter?: FilterGroup
  /** Per-column null overrides from UI settings */
  columnNullOverrides?: Record<string, boolean | undefined>
  /** Criteria formulas for richer display (sentences with formulas) */
  criteriaFormulas?: CriteriaFormula[]
}

type SortDirection = "asc" | "desc"

// Data type configuration for consistent styling
const dataTypeConfig: Record<ColumnType, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  number: {
    label: "number",
    color: "#1976d2",
    bgColor: "#e3f2fd",
    icon: <NumbersOutlined sx={{ fontSize: 11 }} />,
  },
  categorical: {
    label: "categorical",
    color: "#7b1fa2",
    bgColor: "#f3e5f5",
    icon: <TagOutlined sx={{ fontSize: 11 }} />,
  },
  string: {
    label: "string",
    color: "#616161",
    bgColor: "#f5f5f5",
    icon: <TextFieldsOutlined sx={{ fontSize: 11 }} />,
  },
  date: {
    label: "date",
    color: "#0288d1",
    bgColor: "#e1f5fe",
    icon: <CalendarTodayOutlined sx={{ fontSize: 11 }} />,
  },
}

// Data type badge component
function DataTypeBadge({ type }: { type: ColumnType }) {
  const config = dataTypeConfig[type] || dataTypeConfig.string

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 0.75,
        py: 0.25,
        borderRadius: 0.75,
        bgcolor: config.bgColor,
        color: config.color,
        fontSize: "0.65rem",
        fontWeight: 600,
        textTransform: "lowercase",
        letterSpacing: "0.02em",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {config.icon}
      {config.label}
    </Box>
  )
}

// Component to render a grouped patient row with expandable unmatched records
interface GroupedPatientRowProps {
  patient: GroupedPatientRecords
  visibleColumnKeys: string[]
  columns: Record<string, ColumnType>
  formatCellValue: (value: unknown, type: ColumnType, columnName?: string) => React.ReactNode
}

function GroupedPatientRow({
  patient,
  visibleColumnKeys,
  columns,
  formatCellValue,
}: GroupedPatientRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      {/* Matched records */}
      {patient.matchedRecords.map((row, recordIdx) => (
        <TableRow
          key={`matched-${recordIdx}`}
          sx={{
            bgcolor: "#f0fdf4",
            "&:hover": {
              bgcolor: "#dcfce7",
            },
          }}
        >
          {/* Expand button on first matched record only */}
          {recordIdx === 0 && patient.hasUnmatchedRecords ? (
            <TableCell
              rowSpan={patient.matchedRecords.length}
              sx={{
                py: 0.5,
                px: 1,
                width: 40,
                borderRight: "1px solid",
                borderColor: "divider",
                verticalAlign: "top",
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => setIsExpanded(!isExpanded)}
                  sx={{
                    p: 0.5,
                    bgcolor: "#fef3c7",
                    "&:hover": { bgcolor: "#fde68a" },
                  }}
                >
                  {isExpanded ? (
                    <KeyboardArrowUp sx={{ fontSize: 18 }} />
                  ) : (
                    <KeyboardArrowDown sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
                <Tooltip title={`${patient.unmatchedRecords.length} unmatched record(s)`}>
                  <Chip
                    label={patient.unmatchedRecords.length}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      bgcolor: "#fef3c7",
                      color: "#92400e",
                      fontWeight: 600,
                    }}
                  />
                </Tooltip>
              </Box>
            </TableCell>
          ) : recordIdx === 0 ? (
            <TableCell
              rowSpan={patient.matchedRecords.length}
              sx={{
                py: 0.5,
                px: 1,
                width: 40,
                borderRight: "1px solid",
                borderColor: "divider",
              }}
            >
              <Tooltip title="All records matched">
                <CheckCircle sx={{ fontSize: 16, color: "#22c55e" }} />
              </Tooltip>
            </TableCell>
          ) : null}

          {/* Status indicator */}
          <TableCell
            sx={{
              py: 1,
              px: 1,
              width: 80,
              borderRight: "1px solid",
              borderColor: "divider",
            }}
          >
            <Chip
              icon={<CheckCircle sx={{ fontSize: 12 }} />}
              label="Matched"
              size="small"
              sx={{
                height: 20,
                fontSize: "0.65rem",
                bgcolor: "#dcfce7",
                color: "#166534",
                "& .MuiChip-icon": { color: "#22c55e" },
              }}
            />
          </TableCell>

          {/* Data columns */}
          {visibleColumnKeys.map((col) => (
            <TableCell
              key={col}
              sx={{
                py: 1,
                px: 2,
                fontSize: "0.8125rem",
                color: "text.primary",
                borderColor: "divider",
              }}
            >
              {formatCellValue(row[col], columns[col], col)}
            </TableCell>
          ))}
        </TableRow>
      ))}

      {/* Collapsible unmatched records */}
      {patient.hasUnmatchedRecords && (
        <TableRow>
          <TableCell
            colSpan={visibleColumnKeys.length + 2}
            sx={{ p: 0, border: 0, bgcolor: isExpanded ? "#fefce8" : "transparent" }}
          >
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <Box sx={{ py: 1 }}>
                <Table size="small">
                  <TableBody>
                    {patient.unmatchedRecords.map((row, recordIdx) => (
                      <TableRow
                        key={`unmatched-${recordIdx}`}
                        sx={{
                          bgcolor: "#fef9c3",
                          "&:hover": {
                            bgcolor: "#fef08a",
                          },
                        }}
                      >
                        {/* Empty cell for expand column */}
                        <TableCell
                          sx={{
                            py: 0.5,
                            px: 1,
                            width: 40,
                            borderRight: "1px solid",
                            borderColor: "divider",
                          }}
                        />

                        {/* Status indicator */}
                        <TableCell
                          sx={{
                            py: 1,
                            px: 1,
                            width: 80,
                            borderRight: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Chip
                            icon={<Cancel sx={{ fontSize: 12 }} />}
                            label="Unmatched"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.65rem",
                              bgcolor: "#fef3c7",
                              color: "#92400e",
                              "& .MuiChip-icon": { color: "#f59e0b" },
                            }}
                          />
                        </TableCell>

                        {/* Data columns */}
                        {visibleColumnKeys.map((col) => (
                          <TableCell
                            key={col}
                            sx={{
                              py: 1,
                              px: 2,
                              fontSize: "0.8125rem",
                              color: "text.secondary",
                              borderColor: "divider",
                              fontStyle: "italic",
                            }}
                          >
                            {formatCellValue(row[col], columns[col], col)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export function CohortDataTable({
  data,
  columns,
  title,
  groupedData,
  showGroupedView,
  appliedFilter,
  columnNullOverrides,
  criteriaFormulas,
}: CohortDataTableProps) {
  // Reorder columns to put patient ID column first
  const columnKeys = useMemo(() => {
    return reorderColumnsWithIdFirst(Object.keys(columns))
  }, [columns])

  // Pagination
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Sorting
  const [orderBy, setOrderBy] = useState<string>("")
  const [order, setOrder] = useState<SortDirection>("asc")

  // Search
  const [searchTerm, setSearchTerm] = useState("")

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(columnKeys))
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null)

  // Handle sort
  const handleSort = (column: string) => {
    const isAsc = orderBy === column && order === "asc"
    setOrder(isAsc ? "desc" : "asc")
    setOrderBy(column)
  }

  // Toggle column visibility
  const toggleColumn = (column: string) => {
    const newVisible = new Set(visibleColumns)
    if (newVisible.has(column)) {
      newVisible.delete(column)
    } else {
      newVisible.add(column)
    }
    setVisibleColumns(newVisible)
  }

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(term)
        )
      )
    }

    // Sort
    if (orderBy) {
      result.sort((a, b) => {
        const aVal = a[orderBy]
        const bVal = b[orderBy]

        if (aVal === undefined || aVal === null) return 1
        if (bVal === undefined || bVal === null) return -1

        const columnType = columns[orderBy]
        if (columnType === "number") {
          return order === "asc"
            ? Number(aVal) - Number(bVal)
            : Number(bVal) - Number(aVal)
        }

        return order === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal))
      })
    }

    return result
  }, [data, searchTerm, orderBy, order, columns])

  // Paginated data
  const paginatedData = processedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  // Get visible column keys
  const visibleColumnKeys = columnKeys.filter((col) => visibleColumns.has(col))

  // Compute columns with includeMissingData enabled (for "To Be Obtained" display)
  const includeMissingDataColumns = useMemo(() => {
    const cols = new Set<string>()

    // Extract from filter rules (if appliedFilter is provided)
    if (appliedFilter) {
      const extractFromRules = (rules: FilterGroup["rules"]) => {
        for (const rule of rules) {
          if ("logic" in rule && "rules" in rule) {
            // Nested group - recurse
            extractFromRules((rule as FilterGroup).rules)
          } else {
            // It's a FilterRule
            const r = rule as FilterRule
            if (r.field && r.includeMissingData === true) {
              cols.add(r.field)
            }
          }
        }
      }
      extractFromRules(appliedFilter.rules)
    }

    // Merge column null overrides (UI settings take precedence)
    if (columnNullOverrides) {
      Object.entries(columnNullOverrides).forEach(([col, value]) => {
        if (value === true) {
          cols.add(col)
        } else if (value === false) {
          cols.delete(col) // Explicitly excluded
        }
      })
    }

    return cols
  }, [appliedFilter, columnNullOverrides])

  // Get array of missing data column names for the summary component
  const missingDataColumnsList = useMemo(() => {
    return Array.from(includeMissingDataColumns)
  }, [includeMissingDataColumns])

  // Format cell value
  const formatCellValue = (value: unknown, type: ColumnType, columnName?: string): React.ReactNode => {
    if (value === null || value === undefined || value === "" ||
        (typeof value === "string" && value.trim() === "")) {
      // Check if this column has includeMissingData enabled
      if (columnName && includeMissingDataColumns.has(columnName)) {
        return (
          <Typography
            component="span"
            sx={{
              color: "#f59e0b",
              fontSize: "0.8125rem",
              fontWeight: 500,
              fontStyle: "italic",
            }}
          >
            To Be Obtained
          </Typography>
        )
      }
      // Default empty cell display
      return (
        <Typography
          component="span"
          sx={{
            color: "text.disabled",
            fontSize: "0.8125rem",
            fontStyle: "italic",
          }}
        >
          —
        </Typography>
      )
    }

    // Format numbers with locale formatting
    if (type === "number" && typeof value === "number") {
      return value.toLocaleString()
    }

    return String(value)
  }

  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="subtitle1" fontWeight={600} color="text.primary">
          {title || `Patient Data (${data.length})`}
        </Typography>

        <Box display="flex" alignItems="center" gap={1.5}>
          {/* Search */}
          <TextField
            size="small"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(0)
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined sx={{ fontSize: 18, color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              minWidth: 220,
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.5,
                bgcolor: "grey.50",
                "& fieldset": {
                  borderColor: "transparent",
                },
                "&:hover fieldset": {
                  borderColor: "grey.300",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "primary.main",
                  borderWidth: 1,
                },
              },
              "& .MuiInputBase-input": {
                py: 1,
                fontSize: "0.875rem",
              },
            }}
          />

          {/* Column selector */}
          <Tooltip title="Manage columns">
            <IconButton
              onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
              sx={{
                bgcolor: "grey.50",
                borderRadius: 1.5,
                "&:hover": {
                  bgcolor: "grey.100",
                },
              }}
            >
              <ViewColumnOutlined sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Results info */}
      {searchTerm && (
        <Box
          px={2.5}
          py={1}
          sx={{
            bgcolor: "primary.50",
            borderBottom: "1px solid",
            borderColor: "primary.100",
          }}
        >
          <Typography variant="body2" color="primary.main" fontWeight={500}>
            Found {processedData.length} of {data.length} records
          </Typography>
        </Box>
      )}

      {/* Grouped view info banner */}
      {showGroupedView && groupedData && groupedData.patientsWithUnmatchedRecords > 0 && (
        <Alert
          severity="info"
          icon={<Info sx={{ fontSize: 18 }} />}
          sx={{
            borderRadius: 0,
            borderBottom: "1px solid",
            borderColor: "divider",
            py: 0.5,
            "& .MuiAlert-message": { fontSize: "0.8125rem" },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="body2" component="span">
              <strong>{groupedData.patientsWithUnmatchedRecords}</strong> patient(s) have unmatched records.
            </Typography>
            <Chip
              label={`${groupedData.totalMatchedRecords} matched`}
              size="small"
              sx={{ height: 20, fontSize: "0.65rem", bgcolor: "#dcfce7", color: "#166534" }}
            />
            <Chip
              label={`${groupedData.totalUnmatchedRecords} unmatched`}
              size="small"
              sx={{ height: 20, fontSize: "0.65rem", bgcolor: "#fef3c7", color: "#92400e" }}
            />
            <Typography variant="body2" component="span" color="text.secondary">
              Click the arrow to expand and view unmatched records.
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Missing Data Info Banner */}
      {missingDataColumnsList.length > 0 && (
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            bgcolor: "#fffbeb",
            borderBottom: "1px solid #fcd34d",
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Info sx={{ fontSize: 18, color: "#f59e0b" }} />
          <Typography variant="body2" sx={{ color: "#92400e", fontWeight: 500 }}>
            {missingDataColumnsList.length} column{missingDataColumnsList.length > 1 ? "s" : ""} allow missing data:
          </Typography>
          {missingDataColumnsList.map((col) => (
            <Chip
              key={col}
              label={col}
              size="small"
              sx={{
                height: 22,
                fontSize: "0.7rem",
                bgcolor: "#fef3c7",
                color: "#92400e",
                fontWeight: 600,
                border: "1px solid #fcd34d",
              }}
            />
          ))}
          <Typography variant="caption" sx={{ color: "#b45309", ml: 1 }}>
            Empty cells show "To Be Obtained"
          </Typography>
        </Box>
      )}

      {/* Table */}
      <TableContainer sx={{ maxHeight: 280, overflowX: "auto" }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {/* Extra columns for grouped view */}
              {showGroupedView && groupedData && (
                <>
                  <TableCell
                    sx={{
                      bgcolor: "grey.50",
                      borderBottom: "2px solid",
                      borderColor: "divider",
                      py: 1.5,
                      px: 1,
                      width: 40,
                      minWidth: 40,
                    }}
                  >
                    <Tooltip title="Expand to see unmatched records">
                      <Info sx={{ fontSize: 16, color: "text.secondary" }} />
                    </Tooltip>
                  </TableCell>
                  <TableCell
                    sx={{
                      bgcolor: "grey.50",
                      borderBottom: "2px solid",
                      borderColor: "divider",
                      py: 1.5,
                      px: 1,
                      width: 80,
                      minWidth: 80,
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      Status
                    </Typography>
                  </TableCell>
                </>
              )}
              {visibleColumnKeys.map((col) => (
                <TableCell
                  key={col}
                  sx={{
                    bgcolor: "grey.50",
                    borderBottom: "2px solid",
                    borderColor: "divider",
                    py: 1.5,
                    px: 2,
                    minWidth: 130,
                  }}
                >
                  <TableSortLabel
                    active={orderBy === col}
                    direction={orderBy === col ? order : "asc"}
                    onClick={() => handleSort(col)}
                    sx={{
                      "& .MuiTableSortLabel-icon": {
                        opacity: 0.5,
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color="text.primary"
                          sx={{
                            lineHeight: 1.3,
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {col}
                        </Typography>
                        {/* Badge for columns allowing missing data */}
                        {includeMissingDataColumns.has(col) && (
                          <Tooltip title="Missing values allowed - shows 'To Be Obtained'">
                            <Box
                              component="span"
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                bgcolor: "#fef3c7",
                                border: "1px solid #fcd34d",
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                color: "#f59e0b",
                              }}
                            >
                              ?
                            </Box>
                          </Tooltip>
                        )}
                      </Box>
                      <DataTypeBadge type={columns[col]} />
                    </Box>
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Grouped view rendering */}
            {showGroupedView && groupedData ? (
              groupedData.groupedPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnKeys.length + 2} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm ? "No matching records found" : "No data available"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                groupedData.groupedPatients
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((patient) => (
                    <GroupedPatientRow
                      key={patient.patientId}
                      patient={patient}
                      visibleColumnKeys={visibleColumnKeys}
                      columns={columns}
                      formatCellValue={formatCellValue}
                    />
                  ))
              )
            ) : (
              /* Regular view rendering */
              paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnKeys.length} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm ? "No matching records found" : "No data available"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, idx) => (
                  <TableRow
                    key={idx}
                    hover
                    sx={{
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                      "&:last-child td": {
                        borderBottom: 0,
                      },
                    }}
                  >
                    {visibleColumnKeys.map((col) => (
                      <TableCell
                        key={col}
                        sx={{
                          py: 1.25,
                          px: 2,
                          fontSize: "0.8125rem",
                          color: "text.primary",
                          borderColor: "divider",
                        }}
                      >
                        {formatCellValue(row[col], columns[col], col)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={showGroupedView && groupedData ? groupedData.groupedPatients.length : processedData.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10))
          setPage(0)
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelDisplayedRows={({ from, to, count }) => {
          if (showGroupedView && groupedData) {
            return `${from}-${to} of ${count} patients (${groupedData.totalMatchedRecords + groupedData.totalUnmatchedRecords} total records)`
          }
          return `${from}-${to} of ${count}`
        }}
        sx={{
          borderTop: "1px solid",
          borderColor: "divider",
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
            fontSize: "0.8125rem",
            color: "text.secondary",
          },
          "& .MuiTablePagination-select": {
            fontSize: "0.8125rem",
          },
        }}
      />

      {/* Column visibility menu */}
      <Menu
        anchorEl={columnMenuAnchor}
        open={Boolean(columnMenuAnchor)}
        onClose={() => setColumnMenuAnchor(null)}
        PaperProps={{
          sx: {
            maxHeight: 400,
            width: 280,
            borderRadius: 2,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          },
        }}
      >
        <Box px={2} py={1.5} borderBottom="1px solid" sx={{ borderColor: "divider" }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Manage Columns
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {visibleColumns.size} of {columnKeys.length} visible
          </Typography>
        </Box>
        <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
          {columnKeys.map((col) => (
            <MenuItem
              key={col}
              dense
              onClick={() => toggleColumn(col)}
              sx={{
                py: 1,
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox
                  checked={visibleColumns.has(col)}
                  size="small"
                  disableRipple
                  sx={{
                    p: 0,
                    "&.Mui-checked": {
                      color: "primary.main",
                    },
                  }}
                />
              </ListItemIcon>
              <ListItemText
                primary={col}
                secondary={<DataTypeBadge type={columns[col]} />}
                primaryTypographyProps={{
                  variant: "body2",
                  fontWeight: 500,
                  sx: { mb: 0.25 },
                }}
              />
            </MenuItem>
          ))}
        </Box>
      </Menu>
    </Paper>
  )
}
