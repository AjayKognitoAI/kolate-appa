"use client"

import { useMemo, useEffect, useRef } from "react"
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Divider,
  Chip,
  Typography,
  Tooltip,
} from "@mui/material"
import type { SelectChangeEvent } from "@mui/material/Select"
import {
  CheckCircle,
  Science,
  Warning,
} from "@mui/icons-material"
import type { ColumnSuggestion, ColumnType } from "@/types/cohort.types"

interface ColumnSuggestionDropdownProps {
  /** Currently selected column */
  value: string
  /** Column suggestions with confidence scores from AI */
  suggestions: ColumnSuggestion[]
  /** All available columns in the dataset */
  allColumns: Record<string, ColumnType>
  /** Callback when column selection changes */
  onChange: (column: string) => void
  /** Show error state */
  error?: boolean
  /** Size variant */
  size?: "small" | "medium"
  /** Placeholder text when no selection */
  placeholder?: string
  /** Disable the dropdown */
  disabled?: boolean
}

/**
 * Get confidence color based on score
 * >= 85: Green (high confidence)
 * 60-84: Yellow/Amber (medium confidence)
 * < 60: Red (low confidence)
 */
function getConfidenceColor(confidence: number): {
  bg: string
  text: string
  border: string
} {
  if (confidence >= 85) {
    return { bg: "#dcfce7", text: "#166534", border: "#86efac" }
  } else if (confidence >= 60) {
    return { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" }
  } else {
    return { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" }
  }
}

/**
 * Get column type indicator
 */
function getColumnTypeLabel(type: ColumnType): string {
  switch (type) {
    case "number":
      return "N"
    case "string":
      return "S"
    case "categorical":
      return "C"
    default:
      return "?"
  }
}

/**
 * Find actual column name with case-insensitive matching
 * Returns the actual column name from allColumns that matches the given name (case-insensitive)
 */
function findActualColumnName(name: string, allColumns: Record<string, ColumnType>): string | null {
  // First try exact match
  if (name in allColumns) {
    return name
  }
  // Then try case-insensitive match
  const lowerName = name.toLowerCase()
  for (const col of Object.keys(allColumns)) {
    if (col.toLowerCase() === lowerName) {
      return col
    }
  }
  return null
}

/**
 * ColumnSuggestionDropdown
 *
 * A dropdown component that shows column options with confidence scores.
 * Displays AI-suggested columns first with confidence indicators,
 * followed by all other available columns.
 */
export function ColumnSuggestionDropdown({
  value,
  suggestions,
  allColumns,
  onChange,
  error = false,
  size = "small",
  placeholder = "Select column...",
  disabled = false,
}: ColumnSuggestionDropdownProps) {
  // Filter out invalid suggestions, deduplicate, map to actual column names, and sort by confidence (highest first)
  const sortedSuggestions = useMemo(() => {
    const seen = new Set<string>()
    return [...suggestions]
      .map((s) => {
        if (!s || typeof s.column !== "string" || s.column.trim() === "") {
          return null
        }
        // Find the actual column name (case-insensitive match)
        const actualColumn = findActualColumnName(s.column, allColumns)
        if (!actualColumn) {
          return null // Column doesn't exist in dataset
        }
        return { ...s, column: actualColumn }
      })
      .filter((s): s is ColumnSuggestion => {
        if (!s) return false
        // Deduplicate by actual column name (keep first occurrence)
        if (seen.has(s.column)) {
          return false
        }
        seen.add(s.column)
        return true
      })
      .sort((a, b) => b.confidence - a.confidence)
  }, [suggestions, allColumns])

  // Get column names that are in suggestions (already mapped to actual names)
  const suggestedColumnNames = useMemo(
    () => new Set(sortedSuggestions.map((s) => s.column)),
    [sortedSuggestions]
  )

  // Other columns not in suggestions
  const otherColumns = useMemo(
    () =>
      Object.keys(allColumns).filter((col) => !suggestedColumnNames.has(col)),
    [allColumns, suggestedColumnNames]
  )

  // Check if current value exists in either suggestions or allColumns (case-insensitive)
  // If not, we need to show it separately to ensure it remains selectable
  const showCurrentValueSeparately = useMemo(
    () =>
      value &&
      value !== "" &&
      !suggestedColumnNames.has(value) &&
      !findActualColumnName(value, allColumns),
    [value, suggestedColumnNames, allColumns]
  )

  // Normalize the value to actual column name (case-insensitive)
  const normalizedValue = useMemo(() => {
    if (!value || value === "") return ""
    const actualCol = findActualColumnName(value, allColumns)
    return actualCol || value
  }, [value, allColumns])

  // Track if we've already auto-corrected to prevent infinite loops
  const hasAutoCorrected = useRef(false)

  // Auto-correct the value if it doesn't match the actual column name
  // This ensures the formula gets updated with the correct casing
  useEffect(() => {
    if (
      value &&
      value !== "" &&
      normalizedValue !== value &&
      normalizedValue !== "" &&
      !disabled &&
      !hasAutoCorrected.current
    ) {
      hasAutoCorrected.current = true
      onChange(normalizedValue)
    }
    // Reset the flag when value changes from external source
    if (value === normalizedValue) {
      hasAutoCorrected.current = false
    }
  }, [value, normalizedValue, onChange, disabled])

  // Get confidence for currently selected value (case-insensitive match)
  const selectedConfidence = useMemo(() => {
    const valueLower = normalizedValue?.toLowerCase()
    const suggestion = sortedSuggestions.find((s) => s.column.toLowerCase() === valueLower)
    return suggestion?.confidence
  }, [sortedSuggestions, normalizedValue])

  const isSmall = size === "small"
  const selectHeight = isSmall ? 28 : 36
  const fontSize = isSmall ? "0.75rem" : "0.875rem"

  // Handle selection change with proper typing
  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value)
  }

  return (
    <FormControl size={size} error={error}>
      <Select<string>
        value={normalizedValue}
        onChange={handleChange}
        displayEmpty
        disabled={disabled}
        renderValue={(selected) => {
          if (!selected) {
            return (
              <Typography
                sx={{ color: "#94a3b8", fontSize, fontStyle: "italic" }}
              >
                {placeholder}
              </Typography>
            )
          }
          return (
            <Tooltip title={selected} arrow placement="top" enterDelay={500}>
              <Box display="flex" alignItems="center" gap={0.5} sx={{ minWidth: 0, overflow: "hidden" }}>
                <Typography
                  sx={{
                    fontSize,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {selected}
                </Typography>
                {selectedConfidence !== undefined && selectedConfidence < 100 && (
                  <Tooltip
                    title={
                      selectedConfidence >= 85
                        ? "High confidence match based on column name similarity"
                        : selectedConfidence >= 60
                          ? "Moderate confidence - verify this is the correct column"
                          : "Low confidence - manual verification recommended"
                    }
                    arrow
                    placement="top"
                  >
                    <Chip
                      label={`${selectedConfidence}%`}
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        flexShrink: 0,
                        ...getConfidenceColor(selectedConfidence),
                        bgcolor: getConfidenceColor(selectedConfidence).bg,
                        color: getConfidenceColor(selectedConfidence).text,
                        cursor: "help",
                      }}
                    />
                  </Tooltip>
                )}
              </Box>
            </Tooltip>
          )
        }}
        sx={{
          height: selectHeight,
          bgcolor: "#fff",
          fontSize,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: error
              ? "#ef4444"
              : value
              ? "#86efac"
              : "#cbd5e1",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: error
              ? "#dc2626"
              : value
              ? "#4ade80"
              : "#94a3b8",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: error ? "#dc2626" : "#3b82f6",
          },
          "& .MuiSelect-select": {
            py: isSmall ? 0.5 : 1,
            px: 1,
          },
        }}
      >
        {/* Empty option */}
        <MenuItem value="" sx={{ fontSize }}>
          <em style={{ color: "#94a3b8", pointerEvents: "none" }}>{placeholder}</em>
        </MenuItem>

        {/* AI Suggested columns section - Divider */}
        {sortedSuggestions.length > 0 && (
          <Divider key="ai-suggested-divider" textAlign="left" sx={{ my: 0.5 }}>
            <Chip
              label="AI Suggested"
              size="small"
              icon={<Science sx={{ fontSize: 12 }} />}
              sx={{
                height: 18,
                fontSize: "0.6rem",
                bgcolor: "#ede9fe",
                color: "#7c3aed",
                "& .MuiChip-icon": { color: "#7c3aed" },
              }}
            />
          </Divider>
        )}

        {/* AI Suggested columns section - Items */}
        {sortedSuggestions.map((suggestion) => {
          const confidenceColors = getConfidenceColor(suggestion.confidence)
          const columnType = allColumns[suggestion.column]

          return (
            <MenuItem
              key={suggestion.column}
              value={suggestion.column}
              sx={{ fontSize, py: 0.75 }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                width="100%"
                gap={1}
                sx={{ pointerEvents: "none" }}
              >
                <Box display="flex" alignItems="center" gap={0.75}>
                  {suggestion.confidence >= 85 ? (
                    <Tooltip title="Exact match found in data columns" arrow placement="top">
                      <CheckCircle
                        sx={{ fontSize: 14, color: "#16a34a", pointerEvents: "auto" }}
                      />
                    </Tooltip>
                  ) : suggestion.confidence >= 60 ? (
                    <Tooltip title="Partial match - review recommended" arrow placement="top">
                      <Science sx={{ fontSize: 14, color: "#d97706", pointerEvents: "auto" }} />
                    </Tooltip>
                  ) : (
                    <Tooltip title="Low confidence match - manual selection advised" arrow placement="top">
                      <Warning sx={{ fontSize: 14, color: "#dc2626", pointerEvents: "auto" }} />
                    </Tooltip>
                  )}
                  <Typography
                    sx={{
                      fontWeight: suggestion.confidence >= 85 ? 600 : 500,
                      fontSize,
                    }}
                  >
                    {suggestion.column}
                  </Typography>
                  {columnType && (
                    <Chip
                      label={getColumnTypeLabel(columnType)}
                      size="small"
                      sx={{
                        height: 16,
                        minWidth: 16,
                        fontSize: "0.55rem",
                        fontWeight: 700,
                        bgcolor: "#f1f5f9",
                        color: "#64748b",
                      }}
                    />
                  )}
                </Box>
                <Tooltip
                  title={
                    suggestion.confidence >= 100
                      ? "Perfect match - column name exactly matches"
                      : suggestion.confidence >= 85
                        ? "High confidence match based on column name similarity"
                        : suggestion.confidence >= 60
                          ? "Moderate confidence - verify this is the correct column"
                          : "Low confidence - manual verification recommended"
                  }
                  arrow
                  placement="top"
                >
                  <Chip
                    label={`${suggestion.confidence}%`}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.6rem",
                      fontWeight: 600,
                      bgcolor: confidenceColors.bg,
                      color: confidenceColors.text,
                      border: `1px solid ${confidenceColors.border}`,
                      pointerEvents: "auto",
                      cursor: "help",
                    }}
                  />
                </Tooltip>
              </Box>
            </MenuItem>
          )
        })}

        {/* Other columns section - Divider */}
        {otherColumns.length > 0 && (
          <Divider key="all-columns-divider" textAlign="left" sx={{ my: 0.5 }}>
            <Chip
              label="All Columns"
              size="small"
              sx={{
                height: 18,
                fontSize: "0.6rem",
                bgcolor: "#f1f5f9",
                color: "#64748b",
              }}
            />
          </Divider>
        )}

        {/* Other columns section - Items */}
        {otherColumns.map((col) => {
          const columnType = allColumns[col]
          return (
            <MenuItem key={col} value={col} sx={{ fontSize, py: 0.75 }}>
              <Box display="flex" alignItems="center" gap={0.75} sx={{ pointerEvents: "none" }}>
                <Typography sx={{ fontSize }}>{col}</Typography>
                {columnType && (
                  <Chip
                    label={getColumnTypeLabel(columnType)}
                    size="small"
                    sx={{
                      height: 16,
                      minWidth: 16,
                      fontSize: "0.55rem",
                      fontWeight: 700,
                      bgcolor: "#f1f5f9",
                      color: "#64748b",
                    }}
                  />
                )}
              </Box>
            </MenuItem>
          )
        })}

        {/* Current value if not in suggestions or allColumns - Divider */}
        {showCurrentValueSeparately && (
          <Divider key="current-selection-divider" textAlign="left" sx={{ my: 0.5 }}>
            <Chip
              label="Current Selection"
              size="small"
              sx={{
                height: 18,
                fontSize: "0.6rem",
                bgcolor: "#dbeafe",
                color: "#1d4ed8",
              }}
            />
          </Divider>
        )}

        {/* Current value if not in suggestions or allColumns - Item */}
        {showCurrentValueSeparately && (
          <MenuItem key="current-value" value={value} sx={{ fontSize, py: 0.75 }}>
            <Box display="flex" alignItems="center" gap={0.75} sx={{ pointerEvents: "none" }}>
              <Typography sx={{ fontSize, fontWeight: 500 }}>{value}</Typography>
              <Chip
                label="?"
                size="small"
                sx={{
                  height: 16,
                  minWidth: 16,
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  bgcolor: "#fef3c7",
                  color: "#92400e",
                }}
              />
            </Box>
          </MenuItem>
        )}
      </Select>
    </FormControl>
  )
}

export default ColumnSuggestionDropdown
