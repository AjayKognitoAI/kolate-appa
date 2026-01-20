/**
 * Formula Combiner Utility
 *
 * Combines sentence-by-sentence CriteriaFormulas into a single FilterGroup
 * that can be applied to patient data.
 */

import type {
  CriteriaFormula,
  FormulaRule,
  FormulaGroup,
  FilterRule,
  FilterGroup,
  ColumnType,
} from "@/types/cohort.types"

/**
 * Generate a unique ID for filter rules/groups
 */
function generateId(prefix: string = "item"): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now().toString(36)}`
}

/**
 * Check if an item is a FormulaGroup
 */
function isFormulaGroup(item: FormulaRule | FormulaGroup): item is FormulaGroup {
  return "logic" in item && "rules" in item
}

/**
 * Convert a FormulaRule to a FilterRule with a unique ID
 */
function formulaRuleToFilterRule(rule: FormulaRule): FilterRule {
  return {
    id: generateId(),
    field: rule.field,
    operator: rule.operator,
    value: rule.value,
    value2: rule.value2,
  }
}

/**
 * Convert a FormulaGroup to a FilterGroup with unique IDs (preserves structure)
 */
function formulaGroupToFilterGroup(group: FormulaGroup): FilterGroup {
  return {
    id: generateId(),
    logic: group.logic,
    negate: group.negate,
    rules: group.rules.map((item) => {
      if (isFormulaGroup(item)) {
        return formulaGroupToFilterGroup(item)
      } else {
        return formulaRuleToFilterRule(item)
      }
    }),
  }
}

/**
 * Convert a FormulaRule or FormulaGroup to FilterRule or FilterGroup
 */
function formulaToFilter(
  formula: FormulaRule | FormulaGroup
): FilterRule | FilterGroup {
  if (isFormulaGroup(formula)) {
    return formulaGroupToFilterGroup(formula)
  } else {
    return formulaRuleToFilterRule(formula)
  }
}

/**
 * Simplify a FilterGroup by unwrapping groups with single rules
 * This prevents unnecessary nesting like { logic: AND, rules: [singleRule] }
 */
function simplifyFilterGroup(item: FilterRule | FilterGroup): FilterRule | FilterGroup {
  if (!("logic" in item)) {
    // It's a FilterRule, return as-is
    return item
  }

  // It's a FilterGroup - first recursively simplify all nested rules
  const simplifiedRules = item.rules.map(r => simplifyFilterGroup(r))

  // If group has only one rule, unwrap it (unless it has negate or name that we need to preserve)
  if (simplifiedRules.length === 1 && !item.negate && !item.name) {
    return simplifiedRules[0]
  }

  // Return the group with simplified rules
  return {
    ...item,
    rules: simplifiedRules,
  }
}

/**
 * Group filters by their primary field
 */
function groupFiltersByField(
  filters: (FilterRule | FilterGroup)[]
): Map<string, (FilterRule | FilterGroup)[]> {
  const groups = new Map<string, (FilterRule | FilterGroup)[]>()

  for (const filter of filters) {
    // For FilterGroup, check if it has a single field or is complex
    let field: string
    if ("logic" in filter) {
      // It's a group - check all nested rules
      const fields = new Set<string>()
      const collectFields = (f: FilterRule | FilterGroup): void => {
        if ("logic" in f) {
          f.rules.forEach(collectFields)
        } else {
          fields.add(f.field || "unknown")
        }
      }
      collectFields(filter)
      field = fields.size === 1 ? Array.from(fields)[0] : "complex"
    } else {
      field = filter.field || "unknown"
    }

    if (!groups.has(field)) {
      groups.set(field, [])
    }
    groups.get(field)!.push(filter)
  }

  return groups
}

/**
 * Create filter items from grouped filters
 * - Single items are returned as-is (not wrapped in a group)
 * - Multiple items with the same field are wrapped in a named group
 */
function createFilterItemsFromGroups(
  groupedFilters: Map<string, (FilterRule | FilterGroup)[]>
): (FilterRule | FilterGroup)[] {
  const items: (FilterRule | FilterGroup)[] = []

  for (const [field, filters] of groupedFilters) {
    if (filters.length === 1) {
      // Single filter - don't wrap in a group
      const filter = filters[0]
      // If it's already a group, add the field name if not set
      if ("logic" in filter && !filter.name && field !== "complex") {
        items.push({ ...filter, name: field })
      } else {
        items.push(filter)
      }
    } else {
      // Multiple filters for same field - create a named group
      items.push({
        id: generateId(),
        name: field !== "complex" ? field : undefined,
        logic: "AND" as const,
        rules: filters,
      })
    }
  }

  return items
}

/**
 * Combines all CriteriaFormulas into a single FilterGroup.
 *
 * The combination logic:
 * 1. Convert formulas to filters (preserving nested group structure and logic)
 * 2. Group filters by their field name (e.g., all "age" conditions together)
 * 3. Single filters remain as-is (not wrapped in unnecessary groups)
 * 4. Multiple filters with same field are grouped together with the field name
 * 5. All IC groups are combined into "Inclusion Criteria"
 * 6. All EC groups are combined into "Exclusion Criteria"
 * 7. Final result: IC_combined AND EC_combined
 *
 * Note: The backend already negates exclusion criteria formulas,
 * so we can simply AND them together without additional negation.
 *
 * @param criteriaFormulas - Array of CriteriaFormula from the API
 * @param columns - Available columns (for validation, optional)
 * @returns A single FilterGroup ready to apply
 */
export function combineFormulasToFilterGroup(
  criteriaFormulas: CriteriaFormula[],
  columns?: Record<string, ColumnType>
): FilterGroup {
  // Separate IC and EC formulas
  const inclusionFormulas = criteriaFormulas.filter((f) => f.type === "inclusion")
  const exclusionFormulas = criteriaFormulas.filter((f) => f.type === "exclusion")

  // Convert formulas to filters (preserving structure)
  const inclusionFilters = inclusionFormulas.map((f) => formulaToFilter(f.formula))
  const exclusionFilters = exclusionFormulas.map((f) => formulaToFilter(f.formula))

  // Group filters by field
  const inclusionGrouped = groupFiltersByField(inclusionFilters)
  const exclusionGrouped = groupFiltersByField(exclusionFilters)

  // Create filter items from grouped filters
  const inclusionItems = createFilterItemsFromGroups(inclusionGrouped)
  const exclusionItems = createFilterItemsFromGroups(exclusionGrouped)

  // Create main groups for organization
  const mainGroups: (FilterRule | FilterGroup)[] = []

  // Add inclusion criteria
  if (inclusionItems.length > 0) {
    if (inclusionItems.length === 1) {
      // Single item - add directly (could be rule or group)
      const item = inclusionItems[0]
      if ("logic" in item) {
        mainGroups.push({ ...item, name: item.name || "Inclusion" })
      } else {
        mainGroups.push(item)
      }
    } else {
      // Multiple items - wrap in a parent group
      mainGroups.push({
        id: generateId(),
        name: "Inclusion Criteria",
        logic: "AND",
        rules: inclusionItems,
      })
    }
  }

  // Add exclusion criteria
  if (exclusionItems.length > 0) {
    if (exclusionItems.length === 1) {
      // Single item - add directly
      const item = exclusionItems[0]
      if ("logic" in item) {
        mainGroups.push({ ...item, name: item.name || "Exclusion" })
      } else {
        mainGroups.push(item)
      }
    } else {
      // Multiple items - wrap in a parent group
      mainGroups.push({
        id: generateId(),
        name: "Exclusion Criteria",
        logic: "AND",
        rules: exclusionItems,
      })
    }
  }

  // Create root filter group
  if (mainGroups.length === 0) {
    // No formulas - return empty filter that matches all
    return {
      id: generateId(),
      logic: "AND",
      rules: [],
    }
  }

  // Simplify all main groups first
  const simplifiedGroups = mainGroups.map(g => simplifyFilterGroup(g))

  if (simplifiedGroups.length === 1) {
    // Single item - if it's a group, return it; if it's a rule, wrap it
    const item = simplifiedGroups[0]
    if ("logic" in item) {
      return item
    } else {
      return {
        id: generateId(),
        logic: "AND",
        rules: [item],
      }
    }
  }

  // Multiple main groups - combine with AND and simplify the result
  const result: FilterGroup = {
    id: generateId(),
    name: "Combined Criteria",
    logic: "AND",
    rules: simplifiedGroups,
  }

  return simplifyFilterGroup(result) as FilterGroup
}

/**
 * Validate that all fields in criteria have valid column mappings
 *
 * @param criteriaFormulas - Array of CriteriaFormula to validate
 * @param columns - Available columns in the dataset
 * @returns Object with validation results
 */
export function validateCriteriaFormulas(
  criteriaFormulas: CriteriaFormula[],
  columns: Record<string, ColumnType>
): {
  isValid: boolean
  mappedCount: number
  totalCount: number
  unmappedFields: string[]
} {
  const unmappedFields: string[] = []

  function checkFormula(formula: FormulaRule | FormulaGroup): boolean {
    if (isFormulaGroup(formula)) {
      return formula.rules.every((rule) => checkFormula(rule))
    } else {
      if (!formula.field || !(formula.field in columns)) {
        if (formula.field && !unmappedFields.includes(formula.field)) {
          unmappedFields.push(formula.field)
        }
        return false
      }
      return true
    }
  }

  const mappedCount = criteriaFormulas.filter((f) =>
    checkFormula(f.formula)
  ).length

  return {
    isValid: unmappedFields.length === 0,
    mappedCount,
    totalCount: criteriaFormulas.length,
    unmappedFields,
  }
}

/**
 * Apply column selections to formula fields
 *
 * When user selects a different column for a field (from suggestions),
 * this function updates the formula with the new column names.
 *
 * @param formula - The formula to update
 * @param columnSelections - Map of original field names to selected column names
 * @returns Updated formula with new field names
 */
export function applyColumnSelections(
  formula: FormulaRule | FormulaGroup,
  columnSelections: Record<string, string>
): FormulaRule | FormulaGroup {
  if (isFormulaGroup(formula)) {
    return {
      ...formula,
      rules: formula.rules.map((rule) =>
        applyColumnSelections(rule, columnSelections)
      ),
    }
  } else {
    const selectedColumn = columnSelections[formula.field]
    if (selectedColumn && selectedColumn !== formula.field) {
      return { ...formula, field: selectedColumn }
    }
    return formula
  }
}

/**
 * Update a specific formula in the criteria array
 *
 * @param criteriaFormulas - Original array of criteria
 * @param index - Index of the criteria to update
 * @param newFormula - New formula to set
 * @returns Updated array of criteria
 */
export function updateCriteriaFormula(
  criteriaFormulas: CriteriaFormula[],
  index: number,
  newFormula: FormulaRule | FormulaGroup
): CriteriaFormula[] {
  return criteriaFormulas.map((f, i) => {
    if (i === index) {
      return { ...f, formula: newFormula }
    }
    return f
  })
}

export default combineFormulasToFilterGroup
