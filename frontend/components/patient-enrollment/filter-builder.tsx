"use client"

import { useState } from "react"
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from "@mui/material"
import { Add, Delete, FilterList } from "@mui/icons-material"
import type { FilterGroup, FilterRule, OperatorType, LogicType, ColumnType } from "@/types/cohort.types"

interface FilterBuilderProps {
  columns: Record<string, ColumnType>
  filterGroup: FilterGroup
  onFilterChange: (group: FilterGroup) => void
}

const stringOperators: { value: OperatorType; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "contains", label: "Contains" },
]

const numberOperators: { value: OperatorType; label: string }[] = [
  { value: "equals", label: "=" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "between", label: "Between" },
]

// Type guard to check if a rule is a FilterRule (not a nested FilterGroup)
const isFilterRule = (rule: FilterRule | FilterGroup): rule is FilterRule => {
  return !("logic" in rule)
}

export function FilterBuilder({ columns, filterGroup, onFilterChange }: FilterBuilderProps) {
  const [localGroup, setLocalGroup] = useState<FilterGroup>(filterGroup)

  // Get only the simple FilterRule items (not nested groups)
  const simpleRules = localGroup.rules.filter(isFilterRule)

  const addRule = () => {
    const firstColumn = Object.keys(columns)[0]
    const newRule: FilterRule = {
      id: Math.random().toString(36).substr(2, 9),
      field: firstColumn,
      operator: columns[firstColumn] === "number" ? "gte" : "equals",
      value: "",
    }

    const updatedGroup = {
      ...localGroup,
      rules: [...localGroup.rules, newRule],
    }
    setLocalGroup(updatedGroup)
    onFilterChange(updatedGroup)
  }

  const removeRule = (id: string) => {
    const updatedGroup = {
      ...localGroup,
      rules: localGroup.rules.filter((rule) => rule.id !== id),
    }
    setLocalGroup(updatedGroup)
    onFilterChange(updatedGroup)
  }

  const updateRule = (id: string, updates: Partial<FilterRule>) => {
    const updatedGroup = {
      ...localGroup,
      rules: localGroup.rules.map((rule) => {
        if (isFilterRule(rule) && rule.id === id) {
          return { ...rule, ...updates }
        }
        return rule
      }),
    }
    setLocalGroup(updatedGroup)
    onFilterChange(updatedGroup)
  }

  const updateLogic = (logic: LogicType) => {
    const updatedGroup = { ...localGroup, logic }
    setLocalGroup(updatedGroup)
    onFilterChange(updatedGroup)
  }

  const getOperators = (columnType: ColumnType) => {
    return columnType === "number" ? numberOperators : stringOperators
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: "primary.light",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FilterList sx={{ fontSize: 18, color: "primary.main" }} />
          </Box>
          <Typography variant="h6" fontWeight={600}>
            Filter Builder
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" color="text.secondary">
            Logic:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={localGroup.logic}
              onChange={(e) => updateLogic(e.target.value as LogicType)}
            >
              <MenuItem value="AND">AND</MenuItem>
              <MenuItem value="OR">OR</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {simpleRules.length === 0 ? (
        <Box
          sx={{
            border: "2px dashed #d1d5db",
            borderRadius: 2,
            p: 6,
            textAlign: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary" mb={2}>
            No filters applied
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={addRule}
          >
            Add Filter Rule
          </Button>
        </Box>
      ) : (
        <Box>
          {simpleRules.map((rule, index) => (
            <Box key={rule.id} display="flex" alignItems="center" gap={2} mb={2}>
              {index > 0 && (
                <Chip
                  label={localGroup.logic}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ minWidth: 50 }}
                />
              )}
              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  p: 2,
                  border: "1px solid #ececf1",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Field</InputLabel>
                  <Select
                    value={rule.field}
                    label="Field"
                    onChange={(e) => {
                      const value = e.target.value
                      const columnType = columns[value]
                      updateRule(rule.id, {
                        field: value,
                        operator: columnType === "number" ? "gte" : "equals",
                        value: "",
                        value2: undefined,
                      })
                    }}
                  >
                    {Object.keys(columns).map((column) => (
                      <MenuItem key={column} value={column}>
                        {column}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Operator</InputLabel>
                  <Select
                    value={rule.operator}
                    label="Operator"
                    onChange={(e) => updateRule(rule.id, { operator: e.target.value as OperatorType })}
                  >
                    {getOperators(columns[rule.field]).map((op) => (
                      <MenuItem key={op.value} value={op.value}>
                        {op.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  type={columns[rule.field] === "number" ? "number" : "text"}
                  label="Value"
                  value={rule.value}
                  onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                  sx={{ minWidth: 120 }}
                />

                {rule.operator === "between" && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      and
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      label="Max"
                      value={rule.value2 || ""}
                      onChange={(e) => updateRule(rule.id, { value2: e.target.value })}
                      sx={{ minWidth: 120 }}
                    />
                  </>
                )}

                <IconButton
                  size="small"
                  color="error"
                  onClick={() => removeRule(rule.id)}
                >
                  <Delete />
                </IconButton>
              </Paper>
            </Box>
          ))}

          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            onClick={addRule}
            sx={{ mt: 1 }}
          >
            Add Rule
          </Button>
        </Box>
      )}
    </Box>
  )
}
