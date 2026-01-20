import type { PatientData } from "@/lib/screening-logic"

export interface DuplicateEntry {
  value: string | number
  count: number
  indices: number[]
}

/**
 * Detect duplicate values in a specific column
 * @param data - The patient data array
 * @param columnName - The column to check for duplicates
 * @returns Array of duplicate entries with their counts and row indices
 */
export function detectDuplicates(
  data: PatientData[],
  columnName: string
): DuplicateEntry[] {
  const valueMap = new Map<string | number, number[]>()

  // Count occurrences and track indices
  data.forEach((row, index) => {
    const value = row[columnName]
    if (value !== null && value !== undefined && value !== "") {
      const key = String(value)
      if (!valueMap.has(key)) {
        valueMap.set(key, [])
      }
      valueMap.get(key)!.push(index)
    }
  })

  // Filter only duplicates
  const duplicates: DuplicateEntry[] = []
  valueMap.forEach((indices, value) => {
    if (indices.length > 1) {
      duplicates.push({
        value,
        count: indices.length,
        indices,
      })
    }
  })

  // Sort by count (descending)
  return duplicates.sort((a, b) => b.count - a.count)
}

/**
 * Check if a column has any duplicate values
 * @param data - The patient data array
 * @param columnName - The column to check
 * @returns true if duplicates exist, false otherwise
 */
export function hasDuplicates(
  data: PatientData[],
  columnName: string
): boolean {
  const seen = new Set<string | number>()

  for (const row of data) {
    const value = row[columnName]
    if (value !== null && value !== undefined && value !== "") {
      const key = String(value)
      if (seen.has(key)) {
        return true
      }
      seen.add(key)
    }
  }

  return false
}

/**
 * Auto-detect the most likely patient ID column based on common naming patterns
 * @param data - The patient data array
 * @param columns - Object containing column names as keys
 * @returns The detected column name or null
 */
export function detectPatientIdColumn(
  data: PatientData[],
  columns: Record<string, any>
): string | null {
  if (data.length === 0) return null

  const columnNames = Object.keys(columns)
  const commonPatterns = [
    /^patient_?id$/i,
    /^subject_?id$/i,
    /^participant_?id$/i,
    /^id$/i,
    /patient.*id/i,
    /subject.*id/i,
  ]

  // First, try exact pattern matches
  for (const pattern of commonPatterns) {
    const match = columnNames.find((col) => pattern.test(col))
    if (match && !hasDuplicates(data, match)) {
      return match
    }
  }

  // If no pattern match, find first column with all unique values
  for (const columnName of columnNames) {
    if (!hasDuplicates(data, columnName)) {
      return columnName
    }
  }

  return null
}

/**
 * Get statistics about empty/null values in a column
 * @param data - The patient data array
 * @param columnName - The column to check
 * @returns Object with count and percentage of empty values
 */
export function getEmptyValueStats(
  data: PatientData[],
  columnName: string
): { count: number; percentage: number } {
  const emptyCount = data.filter((row) => {
    const value = row[columnName]
    return value === null || value === undefined || value === ""
  }).length

  return {
    count: emptyCount,
    percentage: (emptyCount / data.length) * 100,
  }
}

/**
 * Check if a value is considered "empty" (null, undefined, empty string, or whitespace-only)
 * @param value - The value to check
 * @returns true if the value is empty, false otherwise
 */
export function isEmptyValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "string" && value.trim() === "")
  )
}

/**
 * Get detailed statistics about dirty/empty data across all columns
 * @param data - The patient data array
 * @param columns - Array of column names to check
 * @returns Object with total dirty records count and per-column empty counts
 */
export function getDirtyDataStatistics(
  data: PatientData[],
  columns: string[]
): { totalDirtyRecords: number; columnStats: Record<string, number> } {
  if (data.length === 0 || columns.length === 0) {
    return { totalDirtyRecords: 0, columnStats: {} }
  }

  const columnStats: Record<string, number> = {}

  // Calculate empty count per column
  columns.forEach((col) => {
    columnStats[col] = data.filter((row) => isEmptyValue(row[col])).length
  })

  // Calculate records with at least one empty value
  const totalDirtyRecords = data.filter((row) => {
    return columns.some((col) => isEmptyValue(row[col]))
  }).length

  return { totalDirtyRecords, columnStats }
}

/**
 * Filter data to exclude records with any empty values
 * @param data - The patient data array
 * @param columns - Array of column names to check for empty values
 * @returns Filtered array with only clean records (no empty values)
 */
export function filterOutDirtyRecords(
  data: PatientData[],
  columns: string[]
): PatientData[] {
  return data.filter((row) => {
    return !columns.some((col) => isEmptyValue(row[col]))
  })
}

/**
 * A grouped patient with matched and unmatched records
 */
export interface GroupedPatientRecords {
  patientId: string
  matchedRecords: PatientData[]
  unmatchedRecords: PatientData[]
  totalRecords: number
  hasUnmatchedRecords: boolean
}

/**
 * Result of grouping patient records
 */
export interface GroupedPatientResult {
  groupedPatients: GroupedPatientRecords[]
  totalMatchedRecords: number
  totalUnmatchedRecords: number
  patientsWithMultipleRecords: number
  patientsWithUnmatchedRecords: number
}

/**
 * Extract patient ID from a row using common identifier field names
 * @param row - The patient data row
 * @param patientIdColumn - Optional specific column name to use
 * @param rowIndex - Fallback index if no ID found
 * @returns The patient ID as a string
 */
export function extractPatientId(
  row: PatientData,
  patientIdColumn?: string,
  rowIndex?: number
): string {
  // Try specific column first
  if (patientIdColumn && row[patientIdColumn] != null && row[patientIdColumn] !== "") {
    return String(row[patientIdColumn])
  }

  // Try common identifier field names
  const patientId =
    row.patient_id ||
    row.PatientId ||
    row.PATIENT_ID ||
    row.id ||
    row.Id ||
    row.ID ||
    row.subject_id ||
    row.SubjectId ||
    row.SUBJECT_ID ||
    row.participant_id ||
    row.ParticipantId ||
    row.PARTICIPANT_ID

  if (patientId != null && patientId !== "") {
    return String(patientId)
  }

  // Fallback to row index
  return rowIndex != null ? `patient_${rowIndex}` : `unknown_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Group patient records by patient ID and separate into matched and unmatched
 * For patients who have at least one matching record, this function groups all
 * their records and identifies which matched and which didn't.
 *
 * @param allData - All patient data records from master data
 * @param matchedData - Records that matched the filter criteria
 * @param patientIdColumn - Optional specific column name for patient ID
 * @returns Grouped patient records with matched/unmatched separation
 */
export function groupPatientRecords(
  allData: PatientData[],
  matchedData: PatientData[],
  patientIdColumn?: string
): GroupedPatientResult {
  // Create a set of matched record indices for quick lookup
  const matchedIndices = new Set<number>()
  matchedData.forEach((record) => {
    const rowIndex = record._row_index as number | undefined
    if (rowIndex != null) {
      matchedIndices.add(rowIndex)
    }
  })

  // Create a set of patient IDs that have at least one match
  const patientsWithMatches = new Set<string>()
  matchedData.forEach((record, idx) => {
    const patientId = extractPatientId(record, patientIdColumn, record._row_index as number ?? idx)
    patientsWithMatches.add(patientId)
  })

  // Group all records by patient ID
  const patientRecordsMap = new Map<string, { matched: PatientData[]; unmatched: PatientData[] }>()

  allData.forEach((record, idx) => {
    const rowIndex = (record._row_index as number | undefined) ?? idx
    const patientId = extractPatientId(record, patientIdColumn, rowIndex)

    // Only include patients who have at least one match
    if (!patientsWithMatches.has(patientId)) {
      return
    }

    if (!patientRecordsMap.has(patientId)) {
      patientRecordsMap.set(patientId, { matched: [], unmatched: [] })
    }

    const group = patientRecordsMap.get(patientId)!
    if (matchedIndices.has(rowIndex)) {
      group.matched.push(record)
    } else {
      group.unmatched.push(record)
    }
  })

  // Convert to array format
  const groupedPatients: GroupedPatientRecords[] = []
  let totalMatchedRecords = 0
  let totalUnmatchedRecords = 0
  let patientsWithMultipleRecords = 0
  let patientsWithUnmatchedRecords = 0

  patientRecordsMap.forEach((records, patientId) => {
    const totalRecords = records.matched.length + records.unmatched.length
    const hasUnmatchedRecords = records.unmatched.length > 0

    groupedPatients.push({
      patientId,
      matchedRecords: records.matched,
      unmatchedRecords: records.unmatched,
      totalRecords,
      hasUnmatchedRecords,
    })

    totalMatchedRecords += records.matched.length
    totalUnmatchedRecords += records.unmatched.length

    if (totalRecords > 1) {
      patientsWithMultipleRecords++
    }
    if (hasUnmatchedRecords) {
      patientsWithUnmatchedRecords++
    }
  })

  // Sort by patient ID
  groupedPatients.sort((a, b) => a.patientId.localeCompare(b.patientId))

  return {
    groupedPatients,
    totalMatchedRecords,
    totalUnmatchedRecords,
    patientsWithMultipleRecords,
    patientsWithUnmatchedRecords,
  }
}
