"use client"

import { useState, useMemo } from "react"
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Tooltip,
  LinearProgress,
  Alert,
  Button,
  Skeleton,
  ToggleButtonGroup,
  ToggleButton,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
} from "@mui/material"
import {
  Edit,
  Check,
  Close,
  AutoAwesome,
  ExpandMore,
  Numbers,
  TextFields,
  Category,
  CalendarMonth,
  Warning,
  Refresh,
  Search,
  Clear,
} from "@mui/icons-material"
import type { ColumnDescription, ColumnCategory, ColumnType, DirtyDataStats } from "@/types/cohort.types"
import type { PatientData } from "@/lib/screening-logic"

interface ColumnReviewStepProps {
  columns: Record<string, ColumnType>
  data: PatientData[]
  descriptions: ColumnDescription[]
  onColumnsChange: (columns: Record<string, ColumnType>) => void
  onDescriptionsChange: (descriptions: ColumnDescription[]) => void
  isLoadingDescriptions: boolean
  descriptionError: string | null
  onRetryDescriptions?: () => void
  onRegenerateSingleColumn?: (columnName: string) => void
  regeneratingColumn?: string | null
  dirtyDataStats: DirtyDataStats | null
}

// Category colors for chips - using soft pastel colors
const CATEGORY_STYLES: Record<ColumnCategory, { bgcolor: string; color: string; borderColor: string }> = {
  "Demographics": { bgcolor: "#e3f2fd", color: "#1565c0", borderColor: "#90caf9" },
  "Clinical/Lab Values": { bgcolor: "#e8f5e9", color: "#2e7d32", borderColor: "#a5d6a7" },
  "Treatment History": { bgcolor: "#f3e5f5", color: "#7b1fa2", borderColor: "#ce93d8" },
  "Safety/Exclusions": { bgcolor: "#ffebee", color: "#c62828", borderColor: "#ef9a9a" },
  "Study-Specific": { bgcolor: "#fff3e0", color: "#e65100", borderColor: "#ffcc80" },
  "Administrative": { bgcolor: "#f5f5f5", color: "#616161", borderColor: "#e0e0e0" },
}

// All available categories
const ALL_CATEGORIES: ColumnCategory[] = [
  "Demographics",
  "Clinical/Lab Values",
  "Treatment History",
  "Safety/Exclusions",
  "Study-Specific",
  "Administrative",
]

// Confidence badge helper
const getConfidenceBadge = (score: number): { color: "success" | "primary" | "warning" | "error", label: string } => {
  if (score >= 0.85) return { color: "success", label: "High" }
  if (score >= 0.65) return { color: "primary", label: "Good" }
  if (score >= 0.45) return { color: "warning", label: "Moderate" }
  return { color: "error", label: "Low" }
}

// Column type icons
const TYPE_ICONS: Record<ColumnType, React.ReactNode> = {
  number: <Numbers fontSize="small" />,
  string: <TextFields fontSize="small" />,
  categorical: <Category fontSize="small" />,
  date: <CalendarMonth fontSize="small" />,
}

// Type colors for toggle buttons
const TYPE_COLORS: Record<ColumnType, "primary" | "secondary" | "default" | "info"> = {
  number: "primary",
  categorical: "secondary",
  string: "default",
  date: "info",
}

interface EditableRowProps {
  columnName: string
  columnType: ColumnType
  description: ColumnDescription | undefined
  sampleValues: (string | number)[]
  nullCount: number
  uniqueCount: number
  totalCount: number
  onTypeChange: (type: ColumnType) => void
  onDescriptionChange: (desc: ColumnDescription) => void
  onRegenerate?: () => void
  isLoadingDescription: boolean
  isRegenerating: boolean
}

function EditableRow({
  columnName,
  columnType,
  description,
  sampleValues,
  nullCount,
  uniqueCount,
  totalCount,
  onTypeChange,
  onDescriptionChange,
  onRegenerate,
  isLoadingDescription,
  isRegenerating,
}: EditableRowProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState<ColumnDescription | null>(null)

  const handleStartEdit = () => {
    if (description) {
      setEditedDescription({ ...description })
      setIsEditingDescription(true)
    }
  }

  const handleSaveDescription = () => {
    if (editedDescription) {
      onDescriptionChange(editedDescription)
      setIsEditingDescription(false)
    }
  }

  const handleCancelEdit = () => {
    setEditedDescription(null)
    setIsEditingDescription(false)
  }

  const confidenceBadge = description ? getConfidenceBadge(description.confidence_score) : null

  return (
    <TableRow hover>
      {/* Column Name & Type */}
      <TableCell sx={{ minWidth: 200 }}>
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {columnName}
          </Typography>
          {description?.abbreviation_expansion && (
            <Typography variant="caption" color="text.secondary" display="block">
              ({description.abbreviation_expansion})
            </Typography>
          )}
          <Box mt={1}>
            <ToggleButtonGroup
              value={columnType}
              exclusive
              onChange={(_, value) => value && onTypeChange(value)}
              size="small"
              sx={{ height: 28 }}
            >
              <ToggleButton
                value="number"
                sx={{
                  px: 1,
                  py: 0.25,
                  fontSize: "0.7rem",
                  "&.Mui-selected": {
                    bgcolor: "#e3f2fd",
                    color: "#1565c0",
                    borderColor: "#90caf9",
                    "&:hover": { bgcolor: "#bbdefb" },
                  },
                }}
              >
                <Numbers sx={{ fontSize: 14, mr: 0.5 }} />
                Num
              </ToggleButton>
              <ToggleButton
                value="string"
                sx={{
                  px: 1,
                  py: 0.25,
                  fontSize: "0.7rem",
                  "&.Mui-selected": {
                    bgcolor: "#f5f5f5",
                    color: "#424242",
                    borderColor: "#bdbdbd",
                    "&:hover": { bgcolor: "#eeeeee" },
                  },
                }}
              >
                <TextFields sx={{ fontSize: 14, mr: 0.5 }} />
                Text
              </ToggleButton>
              <ToggleButton
                value="categorical"
                sx={{
                  px: 1,
                  py: 0.25,
                  fontSize: "0.7rem",
                  "&.Mui-selected": {
                    bgcolor: "#f3e5f5",
                    color: "#7b1fa2",
                    borderColor: "#ce93d8",
                    "&:hover": { bgcolor: "#e1bee7" },
                  },
                }}
              >
                <Category sx={{ fontSize: 14, mr: 0.5 }} />
                Cat
              </ToggleButton>
              <ToggleButton
                value="date"
                sx={{
                  px: 1,
                  py: 0.25,
                  fontSize: "0.7rem",
                  "&.Mui-selected": {
                    bgcolor: "#e1f5fe",
                    color: "#0288d1",
                    borderColor: "#81d4fa",
                    "&:hover": { bgcolor: "#b3e5fc" },
                  },
                }}
              >
                <CalendarMonth sx={{ fontSize: 14, mr: 0.5 }} />
                Date
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {sampleValues.length > 0 && (
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5} sx={{ maxWidth: 180 }} noWrap>
              e.g. {sampleValues.slice(0, 3).join(", ")}
            </Typography>
          )}
          <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
            <Chip
              label={`${uniqueCount} unique`}
              size="small"
              variant="outlined"
              sx={{ height: 18, fontSize: "0.6rem", color: "text.secondary" }}
            />
            {nullCount > 0 && (
              <Chip
                icon={<Warning sx={{ fontSize: 10 }} />}
                label={`${nullCount} null`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ height: 18, fontSize: "0.6rem" }}
              />
            )}
          </Box>
        </Box>
      </TableCell>

      {/* AI Description */}
      <TableCell>
        {isLoadingDescription ? (
          <Box>
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="60%" />
          </Box>
        ) : isEditingDescription && editedDescription ? (
          <Box display="flex" flexDirection="column" gap={1}>
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={2}
              maxRows={3}
              value={editedDescription.clinical_description}
              onChange={(e) => setEditedDescription({ ...editedDescription, clinical_description: e.target.value })}
              placeholder="Clinical description..."
            />
            <Box display="flex" gap={1}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={editedDescription.category}
                  onChange={(e) => setEditedDescription({ ...editedDescription, category: e.target.value as ColumnCategory })}
                >
                  {ALL_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat} sx={{ fontSize: "0.8rem" }}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                placeholder="Unit"
                value={editedDescription.unit_of_measure || ""}
                onChange={(e) => setEditedDescription({ ...editedDescription, unit_of_measure: e.target.value || null })}
                sx={{ width: 80 }}
              />
              <TextField
                size="small"
                placeholder="Range"
                value={editedDescription.reference_range || ""}
                onChange={(e) => setEditedDescription({ ...editedDescription, reference_range: e.target.value || null })}
                sx={{ width: 100 }}
              />
            </Box>
          </Box>
        ) : description ? (
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              {description.clinical_description}
            </Typography>
            <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
              <Chip
                label={description.category}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.65rem",
                  bgcolor: CATEGORY_STYLES[description.category].bgcolor,
                  color: CATEGORY_STYLES[description.category].color,
                  border: `1px solid ${CATEGORY_STYLES[description.category].borderColor}`,
                }}
              />
              {description.unit_of_measure && (
                <Chip
                  label={description.unit_of_measure}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "0.65rem",
                    bgcolor: "#fafafa",
                    color: "#757575",
                    border: "1px solid #e0e0e0",
                  }}
                />
              )}
              {description.reference_range && (
                <Chip
                  label={description.reference_range}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "0.65rem",
                    bgcolor: "#fafafa",
                    color: "#757575",
                    border: "1px solid #e0e0e0",
                  }}
                />
              )}
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" fontStyle="italic">
            No description available
          </Typography>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell align="center" sx={{ width: 140 }}>
        {isLoadingDescription || isRegenerating ? (
          <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
            <Skeleton variant="rectangular" width={50} height={22} sx={{ borderRadius: 3 }} />
            <Skeleton variant="circular" width={24} height={24} />
          </Box>
        ) : isEditingDescription ? (
          <Box display="flex" gap={0.5} justifyContent="center">
            <IconButton size="small" color="success" onClick={handleSaveDescription}>
              <Check fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={handleCancelEdit}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
            {description && confidenceBadge && (
              <Tooltip title={`AI Confidence: ${Math.round(description.confidence_score * 100)}%`}>
                <Chip
                  icon={<AutoAwesome sx={{ fontSize: 12 }} />}
                  label={`${Math.round(description.confidence_score * 100)}%`}
                  size="small"
                  color={confidenceBadge.color}
                  variant="outlined"
                  sx={{ height: 22, fontSize: "0.7rem" }}
                />
              </Tooltip>
            )}
            {description && (
              <Tooltip title="Edit description">
                <IconButton size="small" onClick={handleStartEdit}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onRegenerate && (
              <Tooltip title="Regenerate description for this column">
                <IconButton size="small" onClick={onRegenerate} color="primary">
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </TableCell>
    </TableRow>
  )
}

// Loading skeleton rows
function LoadingSkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <TableRow key={idx}>
          <TableCell>
            <Skeleton variant="text" width={100} />
            <Skeleton variant="rectangular" width={150} height={28} sx={{ mt: 1, borderRadius: 1 }} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="70%" />
            <Box display="flex" gap={0.5} mt={0.5}>
              <Skeleton variant="rectangular" width={80} height={20} sx={{ borderRadius: 3 }} />
              <Skeleton variant="rectangular" width={50} height={20} sx={{ borderRadius: 3 }} />
            </Box>
          </TableCell>
          <TableCell align="center">
            <Skeleton variant="circular" width={24} height={24} sx={{ mx: "auto" }} />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function ColumnReviewStep({
  columns,
  data,
  descriptions,
  onColumnsChange,
  onDescriptionsChange,
  isLoadingDescriptions,
  descriptionError,
  onRetryDescriptions,
  onRegenerateSingleColumn,
  regeneratingColumn,
  dirtyDataStats,
}: ColumnReviewStepProps) {
  const [typeFilter, setTypeFilter] = useState<ColumnType | "all">("all")
  const [categoryFilter, setCategoryFilter] = useState<ColumnCategory | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const allColumnNames = useMemo(() => Object.keys(columns), [columns])

  // Map descriptions by column name for quick lookup
  const descriptionsByColumn = useMemo(() => {
    const map: Record<string, ColumnDescription> = {}
    descriptions.forEach((d) => {
      map[d.column_name] = d
    })
    return map
  }, [descriptions])

  // Category counts from descriptions
  const categoryCounts = useMemo(() => {
    const counts: Record<ColumnCategory | "all", number> = {
      all: descriptions.length,
      "Demographics": 0,
      "Clinical/Lab Values": 0,
      "Treatment History": 0,
      "Safety/Exclusions": 0,
      "Study-Specific": 0,
      "Administrative": 0,
    }
    descriptions.forEach((d) => {
      counts[d.category] = (counts[d.category] || 0) + 1
    })
    return counts
  }, [descriptions])

  // Filtered column names based on type, category filters, and search query
  const columnNames = useMemo(() => {
    let filtered = allColumnNames

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((col) => {
        // Search in column name
        if (col.toLowerCase().includes(query)) return true
        // Search in description
        const desc = descriptionsByColumn[col]
        if (desc) {
          if (desc.clinical_description?.toLowerCase().includes(query)) return true
          if (desc.abbreviation_expansion?.toLowerCase().includes(query)) return true
        }
        return false
      })
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((col) => columns[col] === typeFilter)
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((col) => {
        const desc = descriptionsByColumn[col]
        return desc && desc.category === categoryFilter
      })
    }

    return filtered
  }, [allColumnNames, columns, typeFilter, categoryFilter, descriptionsByColumn, searchQuery])

  // Get sample values for each column
  const sampleValuesByColumn = useMemo(() => {
    const samples: Record<string, (string | number)[]> = {}
    columnNames.forEach((col) => {
      const values = data
        .slice(0, 10)
        .map((row) => row[col])
        .filter((v) => v !== null && v !== undefined && v !== "")
        .slice(0, 5)
      samples[col] = values as (string | number)[]
    })
    return samples
  }, [columnNames, data])

  // Get unique counts for each column
  const uniqueCountsByColumn = useMemo(() => {
    const counts: Record<string, number> = {}
    columnNames.forEach((col) => {
      const uniqueValues = new Set(
        data
          .map((row) => row[col])
          .filter((v) => v !== null && v !== undefined && v !== "")
      )
      counts[col] = uniqueValues.size
    })
    return counts
  }, [columnNames, data])

  const handleTypeChange = (columnName: string, type: ColumnType) => {
    onColumnsChange({ ...columns, [columnName]: type })
  }

  const handleDescriptionChange = (updated: ColumnDescription) => {
    const newDescriptions = descriptions.map((d) =>
      d.column_name === updated.column_name ? updated : d
    )
    // If not found, add it
    if (!descriptions.find((d) => d.column_name === updated.column_name)) {
      newDescriptions.push(updated)
    }
    onDescriptionsChange(newDescriptions)
  }

  // Stats for filter cards
  const typeCounts = useMemo(() => ({
    all: allColumnNames.length,
    number: Object.values(columns).filter((t) => t === "number").length,
    categorical: Object.values(columns).filter((t) => t === "categorical").length,
    string: Object.values(columns).filter((t) => t === "string").length,
    date: Object.values(columns).filter((t) => t === "date").length,
  }), [columns, allColumnNames])

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6" fontWeight={600} display="flex" alignItems="center" gap={1}>
          Review Columns
          {isLoadingDescriptions && (
            <Chip
              icon={<AutoAwesome sx={{ fontSize: 14 }} />}
              label="Generating..."
              size="small"
              color="info"
              variant="outlined"
            />
          )}
        </Typography>
      </Box>

      {/* Category Filter Row */}
      {descriptions.length > 0 && (
        <Box display="flex" gap={0.5} alignItems="center" mb={2} flexWrap="wrap">
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
            AI Categories:
          </Typography>
          {ALL_CATEGORIES.filter(cat => categoryCounts[cat] > 0).map((category) => {
            // Shorten category names for display
            const shortName = category === "Clinical/Lab Values" ? "Clinical/Lab"
              : category === "Safety/Exclusions" ? "Safety"
              : category === "Treatment History" ? "Treatment"
              : category === "Study-Specific" ? "Study"
              : category
            return (
              <Chip
                key={category}
                label={`${shortName}: ${categoryCounts[category]}`}
                size="small"
                onClick={() => setCategoryFilter(categoryFilter === category ? "all" : category)}
                sx={{
                  height: 22,
                  fontSize: "0.65rem",
                  cursor: "pointer",
                  bgcolor: categoryFilter === category
                    ? CATEGORY_STYLES[category].color
                    : CATEGORY_STYLES[category].bgcolor,
                  color: categoryFilter === category
                    ? "#fff"
                    : CATEGORY_STYLES[category].color,
                  border: `1.5px solid ${CATEGORY_STYLES[category].borderColor}`,
                  fontWeight: categoryFilter === category ? 600 : 400,
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: categoryFilter === category
                      ? CATEGORY_STYLES[category].color
                      : CATEGORY_STYLES[category].borderColor,
                  },
                }}
              />
            )
          })}
          {categoryFilter !== "all" && (
            <Chip
              label="×"
              size="small"
              onClick={() => setCategoryFilter("all")}
              sx={{
                height: 22,
                minWidth: 22,
                fontSize: "0.75rem",
                bgcolor: "#ffebee",
                color: "#c62828",
                cursor: "pointer",
                "&:hover": { bgcolor: "#ffcdd2" },
              }}
            />
          )}
        </Box>
      )}

      {/* Type Filter Cards + Search + Regenerate */}
      <Box display="flex" gap={1} mb={2} alignItems="center" flexWrap="wrap">
        <Paper
          onClick={() => setTypeFilter("all")}
          sx={{
            px: 1.5,
            py: 0.75,
            cursor: "pointer",
            border: typeFilter === "all" ? 2 : 1,
            borderColor: typeFilter === "all" ? "primary.main" : "divider",
            bgcolor: typeFilter === "all" ? "primary.50" : "background.paper",
            borderRadius: 2,
            transition: "all 0.2s",
            "&:hover": { borderColor: "primary.main", bgcolor: "grey.50" },
          }}
        >
          <Typography variant="caption" color="text.secondary" display="block">
            All
          </Typography>
          <Typography variant="subtitle1" fontWeight={600} color={typeFilter === "all" ? "primary.main" : "text.primary"}>
            {typeCounts.all}
          </Typography>
        </Paper>
        <Paper
          onClick={() => setTypeFilter("number")}
          sx={{
            px: 1.5,
            py: 0.75,
            cursor: "pointer",
            border: typeFilter === "number" ? 2 : 1,
            borderColor: typeFilter === "number" ? "#1565c0" : "divider",
            bgcolor: typeFilter === "number" ? "#e3f2fd" : "background.paper",
            borderRadius: 2,
            transition: "all 0.2s",
            "&:hover": { borderColor: "#1565c0", bgcolor: "#e3f2fd" },
          }}
        >
          <Box display="flex" alignItems="center" gap={0.5}>
            <Numbers sx={{ fontSize: 14, color: "#1565c0" }} />
            <Typography variant="caption" color="text.secondary">
              Numeric
            </Typography>
          </Box>
          <Typography variant="subtitle1" fontWeight={600} color={typeFilter === "number" ? "#1565c0" : "text.primary"}>
            {typeCounts.number}
          </Typography>
        </Paper>
        <Paper
          onClick={() => setTypeFilter("string")}
          sx={{
            px: 1.5,
            py: 0.75,
            cursor: "pointer",
            border: typeFilter === "string" ? 2 : 1,
            borderColor: typeFilter === "string" ? "#424242" : "divider",
            bgcolor: typeFilter === "string" ? "#f5f5f5" : "background.paper",
            borderRadius: 2,
            transition: "all 0.2s",
            "&:hover": { borderColor: "#424242", bgcolor: "#f5f5f5" },
          }}
        >
          <Box display="flex" alignItems="center" gap={0.5}>
            <TextFields sx={{ fontSize: 14, color: "#424242" }} />
            <Typography variant="caption" color="text.secondary">
              Text
            </Typography>
          </Box>
          <Typography variant="subtitle1" fontWeight={600} color={typeFilter === "string" ? "#424242" : "text.primary"}>
            {typeCounts.string}
          </Typography>
        </Paper>
        <Paper
          onClick={() => setTypeFilter("categorical")}
          sx={{
            px: 1.5,
            py: 0.75,
            cursor: "pointer",
            border: typeFilter === "categorical" ? 2 : 1,
            borderColor: typeFilter === "categorical" ? "#7b1fa2" : "divider",
            bgcolor: typeFilter === "categorical" ? "#f3e5f5" : "background.paper",
            borderRadius: 2,
            transition: "all 0.2s",
            "&:hover": { borderColor: "#7b1fa2", bgcolor: "#f3e5f5" },
          }}
        >
          <Box display="flex" alignItems="center" gap={0.5}>
            <Category sx={{ fontSize: 14, color: "#7b1fa2" }} />
            <Typography variant="caption" color="text.secondary">
              Categorical
            </Typography>
          </Box>
          <Typography variant="subtitle1" fontWeight={600} color={typeFilter === "categorical" ? "#7b1fa2" : "text.primary"}>
            {typeCounts.categorical}
          </Typography>
        </Paper>
        <Paper
          onClick={() => setTypeFilter("date")}
          sx={{
            px: 1.5,
            py: 0.75,
            cursor: "pointer",
            border: typeFilter === "date" ? 2 : 1,
            borderColor: typeFilter === "date" ? "#0288d1" : "divider",
            bgcolor: typeFilter === "date" ? "#e1f5fe" : "background.paper",
            borderRadius: 2,
            transition: "all 0.2s",
            "&:hover": { borderColor: "#0288d1", bgcolor: "#e1f5fe" },
          }}
        >
          <Box display="flex" alignItems="center" gap={0.5}>
            <CalendarMonth sx={{ fontSize: 14, color: "#0288d1" }} />
            <Typography variant="caption" color="text.secondary">
              Date
            </Typography>
          </Box>
          <Typography variant="subtitle1" fontWeight={600} color={typeFilter === "date" ? "#0288d1" : "text.primary"}>
            {typeCounts.date}
          </Typography>
        </Paper>

        {/* Spacer to push search and button to right */}
        <Box flex={1} />

        {/* Dirty data indicator (compact) with tooltip */}
        {dirtyDataStats && dirtyDataStats.totalDirtyRecords > 0 && (
          <Tooltip
            title={
              <Box sx={{ p: 0.5 }}>
                <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>
                  Columns with null values:
                </Typography>
                {Object.entries(dirtyDataStats.columnStats)
                  .filter(([_, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([col, count]) => (
                    <Typography key={col} variant="caption" display="block" sx={{ opacity: 0.9 }}>
                      • {col}: {count} null{count > 1 ? "s" : ""}
                    </Typography>
                  ))}
                {Object.entries(dirtyDataStats.columnStats).filter(([_, count]) => count > 0).length > 10 && (
                  <Typography variant="caption" display="block" sx={{ opacity: 0.7, mt: 0.5 }}>
                    ...and {Object.entries(dirtyDataStats.columnStats).filter(([_, count]) => count > 0).length - 10} more
                  </Typography>
                )}
              </Box>
            }
            arrow
            placement="bottom"
          >
            <Chip
              icon={<Warning sx={{ fontSize: 14 }} />}
              label={`${dirtyDataStats.totalDirtyRecords} rows with nulls`}
              size="small"
              color="warning"
              variant="outlined"
              sx={{ height: 28, cursor: "help" }}
            />
          </Tooltip>
        )}

        {/* Search Box */}
        <TextField
          size="small"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            width: 160,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              bgcolor: "#fafafa",
              "& fieldset": { borderColor: "#e0e0e0" },
              "&:hover fieldset": { borderColor: "#bdbdbd" },
              "&.Mui-focused fieldset": { borderColor: "#90caf9" },
            },
            "& .MuiInputBase-input": { py: 0.6, fontSize: "0.8rem" },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 16, color: "#9e9e9e" }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery("")} sx={{ p: 0.25 }}>
                  <Clear sx={{ fontSize: 14, color: "#9e9e9e" }} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Regenerate Button */}
        {onRetryDescriptions && !isLoadingDescriptions && (
          <Button
            size="small"
            startIcon={descriptions.length > 0 ? <Refresh /> : <AutoAwesome />}
            onClick={onRetryDescriptions}
            variant="outlined"
            sx={{ height: 32, whiteSpace: "nowrap" }}
          >
            {descriptions.length > 0 ? "Regenerate" : "Generate"}
          </Button>
        )}
      </Box>

      {/* Description generation progress */}
      {isLoadingDescriptions && (
        <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />
      )}

      {/* Error alert */}
      {descriptionError && (
        <Alert
          severity="error"
          sx={{ mb: 1, py: 0 }}
          action={
            onRetryDescriptions && (
              <Button color="inherit" size="small" onClick={onRetryDescriptions}>
                Retry
              </Button>
            )
          }
        >
          {descriptionError}
        </Alert>
      )}

      {/* Main table */}
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 280 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: "grey.50", fontWeight: 600, width: "30%" }}>
                Column & Type
              </TableCell>
              <TableCell sx={{ bgcolor: "grey.50", fontWeight: 600 }}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <AutoAwesome sx={{ fontSize: 16, color: "primary.main" }} />
                  AI Description
                </Box>
              </TableCell>
              <TableCell sx={{ bgcolor: "grey.50", fontWeight: 600, width: 140 }} align="center">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {columnNames.map((colName) => (
              <EditableRow
                key={colName}
                columnName={colName}
                columnType={columns[colName]}
                description={descriptionsByColumn[colName]}
                sampleValues={sampleValuesByColumn[colName] || []}
                nullCount={dirtyDataStats?.columnStats[colName] || 0}
                uniqueCount={uniqueCountsByColumn[colName] || 0}
                totalCount={data.length}
                onTypeChange={(type) => handleTypeChange(colName, type)}
                onDescriptionChange={handleDescriptionChange}
                onRegenerate={onRegenerateSingleColumn ? () => onRegenerateSingleColumn(colName) : undefined}
                isLoadingDescription={isLoadingDescriptions && !descriptionsByColumn[colName]}
                isRegenerating={regeneratingColumn === colName}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary footer */}
      <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color="text.secondary">
          Showing {columnNames.length} of {allColumnNames.length} columns
          {descriptions.length > 0 && ` • ${descriptions.length} with AI descriptions`}
          {(typeFilter !== "all" || categoryFilter !== "all" || searchQuery) && (
            <> • Filtered by: {searchQuery && `"${searchQuery}"`}{searchQuery && (typeFilter !== "all" || categoryFilter !== "all") && ", "}{typeFilter !== "all" && `Type: ${typeFilter}`}{typeFilter !== "all" && categoryFilter !== "all" && ", "}{categoryFilter !== "all" && `Category: ${categoryFilter}`}</>
          )}
        </Typography>
        {(typeFilter !== "all" || categoryFilter !== "all" || searchQuery) && (
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setTypeFilter("all")
              setCategoryFilter("all")
              setSearchQuery("")
            }}
            sx={{ fontSize: "0.7rem", py: 0 }}
          >
            Clear All Filters
          </Button>
        )}
      </Box>
    </Box>
  )
}
