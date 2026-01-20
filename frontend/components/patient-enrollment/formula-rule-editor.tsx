"use client"

import { useMemo } from "react"
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Typography,
  Autocomplete,
} from "@mui/material"
import { LocalizationProvider } from "@mui/x-date-pickers"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3"
import { parseISO, format, isValid } from "date-fns"
import type {
  FormulaRule,
  ColumnType,
  OperatorType,
  ColumnSuggestion,
  FieldColumnSuggestions,
} from "@/types/cohort.types"
import { ColumnSuggestionDropdown } from "./column-suggestion-dropdown"

// Operator configurations with mathematical symbols
const OPERATORS: {
  value: OperatorType
  label: string
  symbol: string
  types: ColumnType[]
}[] = [
  { value: "equals", label: "Equals", symbol: "=", types: ["string", "number", "categorical"] },
  { value: "not_equals", label: "Not Equals", symbol: "≠", types: ["string", "number", "categorical"] },
  { value: "contains", label: "Contains", symbol: "∋", types: ["string"] },
  { value: "gt", label: "Greater Than", symbol: ">", types: ["number"] },
  { value: "gte", label: "Greater or Equal", symbol: "≥", types: ["number"] },
  { value: "lt", label: "Less Than", symbol: "<", types: ["number"] },
  { value: "lte", label: "Less or Equal", symbol: "≤", types: ["number"] },
  { value: "between", label: "Between", symbol: "∈", types: ["number"] },
  { value: "is_empty", label: "Is Empty", symbol: "= ∅", types: ["string", "number", "categorical", "date"] },
  { value: "is_not_empty", label: "Is Not Empty", symbol: "≠ ∅", types: ["string", "number", "categorical", "date"] },
  // Date operators
  { value: "on_date", label: "On Date", symbol: "=", types: ["date"] },
  { value: "before", label: "Before", symbol: "<", types: ["date"] },
  { value: "after", label: "After", symbol: ">", types: ["date"] },
  { value: "on_or_before", label: "On or Before", symbol: "≤", types: ["date"] },
  { value: "on_or_after", label: "On or After", symbol: "≥", types: ["date"] },
  { value: "between_dates", label: "Between Dates", symbol: "∈", types: ["date"] },
]

// Helper to parse date value for DatePicker
const parseDateValue = (value: string | number | null | undefined): Date | null => {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return new Date(value)
  const parsed = parseISO(String(value))
  return isValid(parsed) ? parsed : null
}

// Helper to format date for storage
const formatDateForStorage = (date: Date | null): string | null => {
  if (!date || !isValid(date)) return null
  return format(date, "yyyy-MM-dd")
}

interface FormulaRuleEditorProps {
  /** The formula rule to edit */
  rule: FormulaRule
  /** Available columns and their types */
  columns: Record<string, ColumnType>
  /** Column suggestions for this field from AI */
  columnSuggestions?: FieldColumnSuggestions
  /** Categorical values for autocomplete */
  categoricalValues?: Record<string, string[]>
  /** Callback when the rule changes */
  onChange: (rule: FormulaRule) => void
  /** Use compact styling */
  compact?: boolean
  /** Read-only mode */
  readOnly?: boolean
  /** Show validation errors */
  showErrors?: boolean
}

/**
 * Get operators available for a column type
 */
function getOperatorsForColumn(type: ColumnType): typeof OPERATORS {
  return OPERATORS.filter((op) => op.types.includes(type))
}

/**
 * FormulaRuleEditor
 *
 * Inline editor for a single FormulaRule (field, operator, value).
 * Shows column dropdown with confidence scores, operator dropdown, and value input.
 */
export function FormulaRuleEditor({
  rule,
  columns,
  columnSuggestions,
  categoricalValues = {},
  onChange,
  compact = false,
  readOnly = false,
  showErrors = false,
}: FormulaRuleEditorProps) {
  // Get the type of the selected column
  const columnType = columns[rule.field] || "string"

  // Get available operators for this column type
  const availableOperators = useMemo(
    () => getOperatorsForColumn(columnType),
    [columnType]
  )

  // Check if this is a categorical field
  const isCategorical = columnType === "categorical"
  const isDateField = columnType === "date"
  const categoricalOptions = categoricalValues[rule.field] || []

  // Check if operator needs a value
  const needsValue = !["is_empty", "is_not_empty"].includes(rule.operator)
  const needsSecondValue = rule.operator === "between"
  const needsBetweenDates = rule.operator === "between_dates"

  // Validation
  const hasFieldError = showErrors && !rule.field
  const hasValueError = showErrors && needsValue && (rule.value === null || rule.value === "")
  const hasValue2Error = showErrors && (needsSecondValue || needsBetweenDates) && (rule.value2 === null || rule.value2 === "")

  // Get suggestions as ColumnSuggestion[]
  const suggestions: ColumnSuggestion[] = columnSuggestions?.suggestions || []

  // Styling
  const fontSize = compact ? "0.75rem" : "0.875rem"
  const inputHeight = compact ? 28 : 36
  const gap = compact ? 0.75 : 1

  // Handle field change
  const handleFieldChange = (field: string) => {
    // When field changes, reset operator if not compatible
    const newColumnType = columns[field] || "string"
    const newOperators = getOperatorsForColumn(newColumnType)
    const operatorStillValid = newOperators.some((op) => op.value === rule.operator)

    onChange({
      ...rule,
      field,
      operator: operatorStillValid ? rule.operator : newOperators[0]?.value || "equals",
      // Reset value if changing from/to categorical
      value: newColumnType === "categorical" || columnType === "categorical" ? null : rule.value,
    })
  }

  // Handle operator change
  const handleOperatorChange = (operator: OperatorType) => {
    const updates: Partial<FormulaRule> = { operator }

    // Clear value2 if not between or between_dates
    if (operator !== "between" && operator !== "between_dates") {
      updates.value2 = undefined
    }

    // Clear value if is_empty/is_not_empty
    if (operator === "is_empty" || operator === "is_not_empty") {
      updates.value = null
    }

    onChange({ ...rule, ...updates })
  }

  // Handle value change
  const handleValueChange = (value: string | number | null) => {
    // Convert to number if column type is number
    let processedValue: string | number | null = value
    if (columnType === "number" && typeof value === "string" && value !== "") {
      const parsed = parseFloat(value)
      processedValue = isNaN(parsed) ? value : parsed
    }
    onChange({ ...rule, value: processedValue })
  }

  // Handle value2 change (for between)
  const handleValue2Change = (value: string | number | null) => {
    let processedValue: string | number | null = value
    if (columnType === "number" && typeof value === "string" && value !== "") {
      const parsed = parseFloat(value)
      processedValue = isNaN(parsed) ? value : parsed
    }
    onChange({ ...rule, value2: processedValue })
  }

  return (
    <Box display="flex" alignItems="center" gap={gap} flexWrap="nowrap" sx={{ minWidth: 0, maxWidth: "100%" }}>
      {/* Column dropdown with suggestions */}
      <ColumnSuggestionDropdown
        value={rule.field}
        suggestions={suggestions}
        allColumns={columns}
        onChange={handleFieldChange}
        error={hasFieldError}
        size={compact ? "small" : "medium"}
        placeholder="Column"
        disabled={readOnly}
      />

      {/* Operator dropdown */}
      <FormControl size={compact ? "small" : "medium"} error={showErrors && !rule.operator}>
        <Select
          value={rule.operator}
          onChange={(e) => handleOperatorChange(e.target.value as OperatorType)}
          disabled={readOnly || !rule.field}
          sx={{
            height: inputHeight,
            bgcolor: "#fff",
            fontSize,
            "& .MuiSelect-select": {
              py: compact ? 0.5 : 1,
              px: 0.75,
            },
          }}
        >
          {availableOperators.map((op) => (
            <MenuItem key={op.value} value={op.value} sx={{ fontSize }}>
              <Typography
                component="span"
                sx={{
                  fontFamily: "monospace",
                  fontWeight: 600,
                  color: "#6366f1",
                  fontSize: compact ? "0.7rem" : "0.8rem",
                }}
              >
                {op.symbol}
              </Typography>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Value input */}
      {needsValue && (
        <>
          {isCategorical && categoricalOptions.length > 0 ? (
            // Autocomplete for categorical values
            <Autocomplete
              value={rule.value as string || ""}
              onChange={(_, newValue) => handleValueChange(newValue || null)}
              options={categoricalOptions}
              disabled={readOnly}
              freeSolo
              size={compact ? "small" : "medium"}
              sx={{
                minWidth: compact ? 100 : 120,
                maxWidth: compact ? 150 : 200,
                flex: "0 1 auto",
              }}
              slotProps={{
                paper: {
                  sx: {
                    minWidth: 150,
                    maxHeight: 300,
                  },
                },
                listbox: {
                  sx: {
                    maxHeight: 280,
                    "& .MuiAutocomplete-option": {
                      fontSize,
                      py: 0.75,
                      px: 1,
                    },
                  },
                },
                popper: {
                  placement: "bottom-start",
                  sx: {
                    zIndex: 1400,
                  },
                },
              }}
              renderOption={(props, option) => (
                <Box
                  component="li"
                  {...props}
                  key={option}
                  sx={{
                    fontSize,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {option}
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  error={hasValueError}
                  placeholder="Value"
                  sx={{
                    "& .MuiInputBase-root": {
                      height: inputHeight,
                      fontSize,
                    },
                    "& .MuiInputBase-input": {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    },
                  }}
                />
              )}
            />
          ) : isDateField ? (
            // DatePicker for date fields
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                value={parseDateValue(rule.value)}
                onChange={(date) => handleValueChange(formatDateForStorage(date))}
                disabled={readOnly}
                slotProps={{
                  textField: {
                    size: compact ? "small" : "medium",
                    error: hasValueError,
                    placeholder: needsBetweenDates ? "Start Date" : "Date",
                    sx: {
                      width: compact ? 100 : 130,
                      "& .MuiInputBase-root": {
                        height: inputHeight,
                        fontSize,
                      },
                    },
                  },
                }}
              />
            </LocalizationProvider>
          ) : (
            // Regular text/number input
            <TextField
              value={rule.value ?? ""}
              onChange={(e) => handleValueChange(e.target.value || null)}
              error={hasValueError}
              disabled={readOnly}
              type={columnType === "number" ? "number" : "text"}
              placeholder={columnType === "number" ? "0" : "Value"}
              size={compact ? "small" : "medium"}
              sx={{
                width: compact ? 60 : 80,
                "& .MuiInputBase-root": {
                  height: inputHeight,
                  fontSize,
                },
                "& .MuiInputBase-input": {
                  px: 0.75,
                },
              }}
            />
          )}

          {/* Second value for between / between_dates operator */}
          {(needsSecondValue || needsBetweenDates) && (
            <>
              <Typography
                sx={{
                  fontSize,
                  color: "#64748b",
                  fontWeight: 500,
                }}
              >
                -
              </Typography>
              {needsBetweenDates ? (
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    value={parseDateValue(rule.value2)}
                    onChange={(date) => handleValue2Change(formatDateForStorage(date))}
                    disabled={readOnly}
                    slotProps={{
                      textField: {
                        size: compact ? "small" : "medium",
                        error: hasValue2Error,
                        placeholder: "End Date",
                        sx: {
                          width: compact ? 100 : 130,
                          "& .MuiInputBase-root": {
                            height: inputHeight,
                            fontSize,
                          },
                        },
                      },
                    }}
                  />
                </LocalizationProvider>
              ) : (
                <TextField
                  value={rule.value2 ?? ""}
                  onChange={(e) => handleValue2Change(e.target.value || null)}
                  error={hasValue2Error}
                  disabled={readOnly}
                  type={columnType === "number" ? "number" : "text"}
                  placeholder={columnType === "number" ? "0" : "Value"}
                  size={compact ? "small" : "medium"}
                  sx={{
                    width: compact ? 60 : 80,
                    "& .MuiInputBase-root": {
                      height: inputHeight,
                      fontSize,
                    },
                    "& .MuiInputBase-input": {
                      px: 0.75,
                    },
                  }}
                />
              )}
            </>
          )}
        </>
      )}
    </Box>
  )
}

export default FormulaRuleEditor
