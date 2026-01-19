"use client"

import { useState } from "react"
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  Alert,
  Stack,
  ButtonGroup,
} from "@mui/material"
import {
  AutoAwesome,
  CheckCircle,
  Cancel,
  ExpandMore,
  ExpandLess,
  Info,
  AddCircle,
  RemoveCircle,
} from "@mui/icons-material"
import type { FilterGroup, FilterRule } from "@/types/cohort.types"

interface AISuggestionsGateProps {
  /**
   * The complete filter group containing all gates including AI suggestions
   */
  filterGroup: FilterGroup

  /**
   * Callback when a suggestion is accepted
   * Receives the rule to add, target gate name, and whether it's exclusion
   */
  onAcceptSuggestion: (rule: FilterRule, targetGate: string, isExclusion: boolean) => void

  /**
   * Callback when a suggestion is rejected
   */
  onRejectSuggestion: (ruleId: string) => void

  /**
   * Optional: Column information for better display
   */
  columns?: Record<string, string>
}

// Type guard
const isFilterRule = (rule: FilterRule | FilterGroup): rule is FilterRule => {
  return !("logic" in rule)
}

// Get operator symbol
const getOperatorSymbol = (operator: string): string => {
  const symbols: Record<string, string> = {
    equals: "=",
    not_equals: "≠",
    contains: "~",
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
  return symbols[operator] || operator
}

// Format rule for display
const formatRule = (rule: FilterRule): string => {
  if (rule.operator === "between" && rule.value2) {
    return `${rule.field} ${getOperatorSymbol(rule.operator)} [${rule.value}, ${rule.value2}]`
  }
  if (rule.operator === "is_empty" || rule.operator === "is_not_empty") {
    return `${rule.field} ${getOperatorSymbol(rule.operator)}`
  }
  return `${rule.field} ${getOperatorSymbol(rule.operator)} ${rule.value ?? ""}`
}

export function AISuggestionsGate({
  filterGroup,
  onAcceptSuggestion,
  onRejectSuggestion,
  columns,
}: AISuggestionsGateProps) {
  const [expanded, setExpanded] = useState(true)

  // Find the AI suggestions gate
  const aiSuggestionsGate = filterGroup.rules.find(
    (rule) =>
      !isFilterRule(rule) &&
      (rule.name?.toLowerCase().includes("ai generated suggestions") ||
        rule.name?.toLowerCase().includes("suggestion"))
  ) as FilterGroup | undefined

  // If no AI suggestions gate found or it's empty, don't render
  if (!aiSuggestionsGate || aiSuggestionsGate.rules.length === 0) {
    return null
  }

  // Check if the gate indicates no suggestions
  const hasNoSuggestions =
    aiSuggestionsGate.name?.toLowerCase().includes("none") ||
    aiSuggestionsGate.name?.toLowerCase().includes("all relevant fields covered")

  if (hasNoSuggestions) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 1.5,
          border: "1px solid",
          borderColor: "grey.300",
          borderRadius: 1.5,
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <AutoAwesome sx={{ color: "text.secondary", fontSize: 18 }} />
          <Typography variant="caption" color="text.secondary">
            {aiSuggestionsGate.name || "No additional suggestions - all relevant fields are covered"}
          </Typography>
        </Stack>
      </Paper>
    )
  }

  // Get all suggestion rules (parent handles removal, so we just show what's in the gate)
  const suggestionRules = aiSuggestionsGate.rules.filter(isFilterRule)

  const handleAcceptAsInclusion = (rule: FilterRule) => {
    // Add to appropriate inclusion gate based on field type
    const targetGate = determineInclusionGate(rule)
    onAcceptSuggestion(rule, targetGate, false) // false = not exclusion
  }

  const handleAcceptAsExclusion = (rule: FilterRule) => {
    // Add to safety exclusions gate
    onAcceptSuggestion(rule, "Safety Exclusions", true) // true = is exclusion
  }

  const handleReject = (ruleId: string) => {
    onRejectSuggestion(ruleId)
  }

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2,
        border: "1px solid",
        borderColor: "grey.200",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      {/* Collapsible Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none",
          bgcolor: "grey.50",
          "&:hover": {
            bgcolor: "grey.100",
          },
        }}
        onClick={() => {
          console.log("Header clicked, toggling from:", expanded, "to:", !expanded);
          setExpanded(!expanded);
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <AutoAwesome sx={{ fontSize: 18, color: "secondary.main" }} />
          <Typography variant="subtitle2" fontWeight={600} color="text.primary">
            AI Suggestions
          </Typography>
          <Chip
            label="Not in formula yet"
            size="small"
            variant="outlined"
            sx={{
              height: 22,
              fontSize: "0.7rem",
              borderColor: "secondary.main",
              color: "secondary.main",
              borderStyle: "dashed",
            }}
          />
        </Stack>
        <IconButton size="small" sx={{ p: 0.5 }}>
          {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        {/* Suggestions list */}
        <Stack spacing={0} divider={<Box sx={{ borderBottom: "1px solid", borderColor: "grey.100" }} />}>
          {suggestionRules.map((rule) => (
            <Box
              key={rule.id}
              sx={{
                px: 2,
                py: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "background-color 0.2s",
                "&:hover": {
                  bgcolor: "grey.50",
                },
              }}
            >
              {/* Suggestion content */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "secondary.main",
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2" color="text.primary">
                  {formatRuleNaturalLanguage(rule)}
                </Typography>
              </Stack>

              {/* Action buttons */}
              <Stack direction="row" spacing={0.5} flexShrink={0}>
                <Tooltip title="Add to formula">
                  <IconButton
                    size="small"
                    onClick={() => handleAcceptAsInclusion(rule)}
                    sx={{
                      color: "text.secondary",
                      "&:hover": {
                        color: "success.main",
                        bgcolor: "success.50",
                      },
                    }}
                  >
                    <AddCircle fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Exclude from formula">
                  <IconButton
                    size="small"
                    onClick={() => handleAcceptAsExclusion(rule)}
                    sx={{
                      color: "text.secondary",
                      "&:hover": {
                        color: "warning.main",
                        bgcolor: "warning.50",
                      },
                    }}
                  >
                    <RemoveCircle fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Dismiss suggestion">
                  <IconButton
                    size="small"
                    onClick={() => handleReject(rule.id)}
                    sx={{
                      color: "text.secondary",
                      "&:hover": {
                        color: "error.main",
                        bgcolor: "error.50",
                      },
                    }}
                  >
                    <Cancel fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Paper>
  )
}

// Helper: Determine appropriate inclusion gate for a suggestion
function determineInclusionGate(rule: FilterRule): string {
  const fieldLower = rule.field.toLowerCase()

  // Demographics
  if (fieldLower.includes("age") || fieldLower.includes("gender") || fieldLower.includes("sex")) {
    return "Gate 1 - Demographics"
  }

  // Clinical criteria
  if (
    fieldLower.includes("score") ||
    fieldLower.includes("severity") ||
    fieldLower.includes("clinical") ||
    fieldLower.includes("diagnosis") ||
    fieldLower.includes("condition")
  ) {
    return "Gate 2 - Clinical Criteria"
  }

  // Treatment history
  if (
    fieldLower.includes("treatment") ||
    fieldLower.includes("medication") ||
    fieldLower.includes("therapy") ||
    fieldLower.includes("drug")
  ) {
    return "Gate 3 - Treatment History"
  }

  // Default to study specific
  return "Gate 4 - Study Specific"
}

// Helper: Generate natural language explanation
function generateExplanation(rule: FilterRule): string {
  const field = rule.field.replace(/_/g, " ")

  switch (rule.operator) {
    case "equals":
      return `Patients where ${field} equals "${rule.value}"`
    case "not_equals":
      return `Patients where ${field} does not equal "${rule.value}"`
    case "contains":
      return `Patients where ${field} contains "${rule.value}"`
    case "gt":
      return `Patients where ${field} is greater than ${rule.value}`
    case "gte":
      return `Patients where ${field} is at least ${rule.value}`
    case "lt":
      return `Patients where ${field} is less than ${rule.value}`
    case "lte":
      return `Patients where ${field} is at most ${rule.value}`
    case "between":
      return `Patients where ${field} is between ${rule.value} and ${rule.value2}`
    case "is_empty":
      return `Patients where ${field} is empty or missing`
    case "is_not_empty":
      return `Patients where ${field} has a value`
    case "in_cohort":
      return `Patients who are in cohort "${rule.value}"`
    case "not_in_cohort":
      return `Patients who are not in cohort "${rule.value}"`
    default:
      return `Filter based on ${field}`
  }
}

// Helper: Format rule in natural language for display in the card
function formatRuleNaturalLanguage(rule: FilterRule): string {
  const field = rule.field.replace(/_/g, " ")

  switch (rule.operator) {
    case "equals":
      return `${field} is "${rule.value}"`
    case "not_equals":
      return `${field} is not "${rule.value}"`
    case "contains":
      return `${field} contains "${rule.value}"`
    case "gt":
      return `${field} is greater than ${rule.value}`
    case "gte":
      return `${field} is at least ${rule.value}`
    case "lt":
      return `${field} is less than ${rule.value}`
    case "lte":
      return `${field} is at most ${rule.value}`
    case "between":
      return `${field} is between ${rule.value} and ${rule.value2}`
    case "is_empty":
      return `${field} is empty`
    case "is_not_empty":
      return `${field} is not empty`
    case "in_cohort":
      return `in cohort "${rule.value}"`
    case "not_in_cohort":
      return `not in cohort "${rule.value}"`
    default:
      return `${field} ${rule.operator} ${rule.value ?? ""}`
  }
}
