/**
 * Schema Validator for Patient Enrollment
 *
 * Validates dataset schemas against inclusion/exclusion criteria requirements.
 * Provides case-insensitive column matching with helpful suggestions.
 */

import cohortService from "@/services/patient-enrollment/cohort-service"
import type { SchemaValidationResult, FilterGroup } from "@/types/cohort.types"

/**
 * Validate dataset schema against required columns
 *
 * @param requiredColumns - Columns needed by filters/criteria
 * @param availableColumns - Columns present in the dataset
 * @param caseSensitive - Whether to enforce exact case matching (default: false)
 * @returns Validation result with missing columns and suggestions
 */
export function validateSchema(
  requiredColumns: string[],
  availableColumns: string[],
  caseSensitive: boolean = false
): SchemaValidationResult {
  // Create normalized sets for comparison
  const availableSet = new Set(
    caseSensitive
      ? availableColumns
      : availableColumns.map(c => c.toLowerCase())
  )

  const missing: string[] = []
  const caseMismatches: Array<{ required: string; available: string[] }> = []

  // Check each required column
  for (const col of requiredColumns) {
    const searchCol = caseSensitive ? col : col.toLowerCase()

    if (!availableSet.has(searchCol)) {
      missing.push(col)

      // Find case-insensitive matches for suggestions
      if (caseSensitive) {
        const suggestions = availableColumns.filter(
          ac => ac.toLowerCase() === col.toLowerCase()
        )
        if (suggestions.length > 0) {
          caseMismatches.push({ required: col, available: suggestions })
        }
      }
    }
  }

  return {
    isValid: missing.length === 0,
    missingColumns: missing,
    availableColumns,
    requiredColumns,
    caseMismatchColumns: caseMismatches.length > 0 ? caseMismatches : undefined
  }
}

/**
 * Extract required column names from structured filter
 *
 * @param filter - FilterGroup to extract columns from
 * @returns Array of unique column names
 */
export function extractColumnsFromFilter(filter: FilterGroup | null): string[] {
  if (!filter) return []
  return cohortService.extractColumnsFromFilter(filter)
}

/**
 * Extract required columns from natural language criteria using AI
 *
 * @param inclusionCriteria - Natural language inclusion criteria
 * @param exclusionCriteria - Natural language exclusion criteria
 * @param masterDataId - Master data ID for context
 * @param enterpriseId - Enterprise ID for API call
 * @param columns - Column schema for context
 * @returns Promise resolving to array of required column names
 */
export async function extractColumnsFromCriteria(
  inclusionCriteria?: string,
  exclusionCriteria?: string,
  masterDataId?: string,
  enterpriseId?: string,
  columns?: Record<string, string>
): Promise<string[]> {
  // If no criteria provided, no columns needed
  if (!inclusionCriteria?.trim() && !exclusionCriteria?.trim()) {
    return []
  }

  try {
    // Call AI service to generate filter and get columns_used
    const response = await cohortService.generateFilterFromAI({
      inclusion_criteria: inclusionCriteria?.trim() || undefined,
      exclusion_criteria: exclusionCriteria?.trim() || undefined,
      master_data_id: masterDataId,
      enterprise_id: enterpriseId,
      columns: columns
    })

    // Extract columns from the response
    return response.data.columns_used || []
  } catch (error) {
    console.error("Failed to extract columns from criteria:", error)
    // Return empty array on error - graceful degradation
    return []
  }
}

/**
 * Validate dataset schema against natural language criteria using backend endpoint
 *
 * @param inclusionCriteria - Natural language inclusion criteria
 * @param exclusionCriteria - Natural language exclusion criteria
 * @param availableColumns - Columns present in the dataset
 * @returns Promise resolving to validation result
 */
export async function validateSchemaAgainstCriteriaBackend(
  inclusionCriteria: string,
  exclusionCriteria: string,
  availableColumns: string[]
): Promise<SchemaValidationResult> {
  // If no criteria provided, validation passes
  if (!inclusionCriteria?.trim() && !exclusionCriteria?.trim()) {
    return {
      isValid: true,
      missingColumns: [],
      availableColumns,
      requiredColumns: []
    }
  }

  try {
    // Call backend schema validation endpoint
    const response = await cohortService.validateSchema({
      columns: availableColumns,
      inclusion_criteria: inclusionCriteria?.trim() || undefined,
      exclusion_criteria: exclusionCriteria?.trim() || undefined,
    })

    // Convert backend response to frontend format
    return {
      isValid: response.data.is_valid,
      missingColumns: response.data.missing_columns,
      availableColumns: response.data.available_columns,
      requiredColumns: response.data.required_columns,
      criteria_mapping: response.data.criteria_mapping, // Include criteria to column mapping
      suggestedMappings: response.data.suggested_mappings, // Include AI-suggested column mappings
    }
  } catch (error) {
    console.error("Backend schema validation failed:", error)
    // Graceful degradation - return valid to not block user
    return {
      isValid: true,
      missingColumns: [],
      availableColumns,
      requiredColumns: []
    }
  }
}

/**
 * Validate dataset schema against natural language criteria
 *
 * @param inclusionCriteria - Natural language inclusion criteria
 * @param exclusionCriteria - Natural language exclusion criteria
 * @param availableColumns - Columns present in the dataset
 * @param masterDataId - Master data ID for context
 * @param enterpriseId - Enterprise ID for API call
 * @param columns - Column schema for context
 * @returns Promise resolving to validation result
 */
export async function validateSchemaAgainstCriteria(
  inclusionCriteria: string,
  exclusionCriteria: string,
  availableColumns: string[],
  masterDataId?: string,
  enterpriseId?: string,
  columns?: Record<string, string>
): Promise<SchemaValidationResult> {
  // Use backend validation endpoint (recommended)
  return validateSchemaAgainstCriteriaBackend(
    inclusionCriteria,
    exclusionCriteria,
    availableColumns
  )

  // Fallback: Extract required columns from criteria using AI (old method)
  // const requiredColumns = await extractColumnsFromCriteria(
  //   inclusionCriteria,
  //   exclusionCriteria,
  //   masterDataId,
  //   enterpriseId,
  //   columns
  // )
  // return validateSchema(requiredColumns, availableColumns, false)
}

/**
 * Validate dataset schema against structured filter
 *
 * @param filter - FilterGroup to validate
 * @param availableColumns - Columns present in the dataset
 * @returns Validation result
 */
export function validateSchemaAgainstFilter(
  filter: FilterGroup | null,
  availableColumns: string[]
): SchemaValidationResult {
  // Extract required columns from filter
  const requiredColumns = extractColumnsFromFilter(filter)

  // Validate schema with case-insensitive matching
  return validateSchema(requiredColumns, availableColumns, false)
}
