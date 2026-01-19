import type { PatientData } from "@/lib/screening-logic"
import type { ColumnType, EnhancedColumnSchema } from "@/types/cohort.types"
import type { ChartDataPoint, HistogramDataPoint, ChartType } from "./visualization.types"

// Modern vibrant color palette for charts
export const CHART_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#06b6d4", // Cyan
  "#22c55e", // Green
  "#eab308", // Yellow
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#a855f7", // Purple
  "#10b981", // Emerald
]

// Gradient pairs for charts (start, end)
export const CHART_GRADIENTS = [
  ["#6366f1", "#8b5cf6"], // Indigo to Violet
  ["#ec4899", "#f472b6"], // Pink gradient
  ["#14b8a6", "#2dd4bf"], // Teal gradient
  ["#f97316", "#fb923c"], // Orange gradient
  ["#06b6d4", "#22d3ee"], // Cyan gradient
  ["#22c55e", "#4ade80"], // Green gradient
  ["#8b5cf6", "#a78bfa"], // Violet gradient
  ["#3b82f6", "#60a5fa"], // Blue gradient
]

/**
 * Count unique values in a column
 */
export function countUniqueValues(data: PatientData[], columnName: string): number {
  const uniqueValues = new Set(
    data
      .map((row) => row[columnName])
      .filter((v) => v !== null && v !== undefined && v !== "")
  )
  return uniqueValues.size
}

/**
 * Count null/empty values in a column
 */
export function countNullValues(data: PatientData[], columnName: string): number {
  return data.filter((row) => {
    const value = row[columnName]
    return value === null || value === undefined || value === ""
  }).length
}

/**
 * Get value frequency distribution for categorical/string columns
 */
export function getValueDistribution(
  data: PatientData[],
  columnName: string,
  maxCategories: number = 10
): ChartDataPoint[] {
  const counts: Record<string, number> = {}
  let validCount = 0

  data.forEach((row) => {
    const value = row[columnName]
    if (value !== null && value !== undefined && value !== "") {
      const key = String(value)
      counts[key] = (counts[key] || 0) + 1
      validCount++
    }
  })

  // Sort by count descending
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])

  // If more than maxCategories, group the rest as "Others"
  let result: ChartDataPoint[]
  if (sorted.length > maxCategories) {
    const top = sorted.slice(0, maxCategories - 1)
    const othersCount = sorted.slice(maxCategories - 1).reduce((sum, [, count]) => sum + count, 0)

    result = [
      ...top.map(([label, value], index) => ({
        label,
        value,
        percentage: validCount > 0 ? (value / validCount) * 100 : 0,
        color: CHART_COLORS[index % CHART_COLORS.length],
      })),
      {
        label: "Others",
        value: othersCount,
        percentage: validCount > 0 ? (othersCount / validCount) * 100 : 0,
        color: CHART_COLORS[(maxCategories - 1) % CHART_COLORS.length],
      },
    ]
  } else {
    result = sorted.map(([label, value], index) => ({
      label,
      value,
      percentage: validCount > 0 ? (value / validCount) * 100 : 0,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
  }

  return result
}

/**
 * Create histogram bins for numeric data
 */
export function createHistogramData(
  data: PatientData[],
  columnName: string,
  numBins: number = 10
): HistogramDataPoint[] {
  // Extract valid numeric values
  const values: number[] = []
  data.forEach((row) => {
    const value = row[columnName]
    if (value !== null && value !== undefined && value !== "") {
      const num = typeof value === "number" ? value : parseFloat(String(value))
      if (!isNaN(num)) {
        values.push(num)
      }
    }
  })

  if (values.length === 0) {
    return []
  }

  const min = Math.min(...values)
  const max = Math.max(...values)

  // Handle case where all values are the same
  if (min === max) {
    return [{
      bin: formatNumber(min),
      binStart: min,
      binEnd: max,
      count: values.length,
      percentage: 100,
    }]
  }

  const binWidth = (max - min) / numBins
  const bins: HistogramDataPoint[] = []

  // Initialize bins
  for (let i = 0; i < numBins; i++) {
    const binStart = min + i * binWidth
    const binEnd = min + (i + 1) * binWidth
    bins.push({
      bin: `${formatNumber(binStart)} - ${formatNumber(binEnd)}`,
      binStart,
      binEnd,
      count: 0,
      percentage: 0,
    })
  }

  // Count values in each bin
  values.forEach((value) => {
    let binIndex = Math.floor((value - min) / binWidth)
    // Handle edge case for max value
    if (binIndex >= numBins) binIndex = numBins - 1
    if (binIndex >= 0 && binIndex < bins.length) {
      bins[binIndex].count++
    }
  })

  // Calculate percentages
  bins.forEach((bin) => {
    bin.percentage = values.length > 0 ? (bin.count / values.length) * 100 : 0
  })

  return bins
}

/**
 * Format column name to human-readable title
 */
export function formatColumnTitle(
  columnName: string,
  columnMetadata?: EnhancedColumnSchema | null
): string {
  // Check for AI-generated description
  const metadata = columnMetadata?.[columnName]
  if (metadata?.abbreviation_expansion) {
    return metadata.abbreviation_expansion
  }

  // Convert snake_case or camelCase to Title Case
  return columnName
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

/**
 * Format number for display
 */
export function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toLocaleString()
  }
  // Round to 2 decimal places
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

/**
 * Determine the best chart type for a column
 */
export function determineChartType(
  columnName: string,
  columnType: ColumnType,
  uniqueCount: number,
  nullCount: number,
  totalRecords: number
): ChartType | null {
  const nullPercentage = totalRecords > 0 ? (nullCount / totalRecords) * 100 : 0

  // Skip columns with >90% null values
  if (nullPercentage > 90) {
    return null
  }

  if (columnType === "categorical") {
    if (uniqueCount <= 6) {
      return "pie"
    }
    return "bar"
  }

  if (columnType === "number") {
    return "histogram"
  }

  if (columnType === "string") {
    if (uniqueCount <= 10) {
      return "bar"
    }
    return null // Too many unique values for visualization
  }

  return null
}

/**
 * Calculate priority score for column visualization
 * Higher score = more suitable for visualization
 */
export function calculateColumnPriority(
  columnType: ColumnType,
  uniqueCount: number,
  nullCount: number,
  totalRecords: number
): number {
  let score = 0

  // Base score by column type and cardinality
  if (columnType === "categorical" && uniqueCount <= 10) {
    score = 100
  } else if (columnType === "number") {
    score = 80
  } else if (columnType === "categorical") {
    score = 60
  } else if (columnType === "string" && uniqueCount <= 5) {
    score = 40
  } else if (columnType === "string" && uniqueCount <= 10) {
    score = 20
  }

  // Penalty for high null percentage
  const nullPenalty = totalRecords > 0 ? (nullCount / totalRecords) * 50 : 0
  score -= nullPenalty

  return Math.max(0, score)
}

/**
 * Transform data for manual chart with aggregation
 */
export function transformDataForManualChart(
  data: PatientData[],
  columnName: string,
  aggregation: "count" | "sum" | "avg" | "min" | "max",
  groupBy?: string
): ChartDataPoint[] {
  if (!groupBy) {
    // Single aggregation without grouping
    const values = data
      .map((row) => row[columnName])
      .filter((v) => v !== null && v !== undefined && v !== "")
      .map((v) => (typeof v === "number" ? v : parseFloat(String(v))))
      .filter((v) => !isNaN(v))

    let result: number
    switch (aggregation) {
      case "count":
        result = values.length
        break
      case "sum":
        result = values.reduce((a, b) => a + b, 0)
        break
      case "avg":
        result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
        break
      case "min":
        result = values.length > 0 ? Math.min(...values) : 0
        break
      case "max":
        result = values.length > 0 ? Math.max(...values) : 0
        break
    }

    return [{
      label: formatColumnTitle(columnName),
      value: result,
      color: CHART_COLORS[0],
    }]
  }

  // Group by another column
  const groups: Record<string, number[]> = {}

  data.forEach((row) => {
    const groupValue = row[groupBy]
    if (groupValue !== null && groupValue !== undefined && groupValue !== "") {
      const key = String(groupValue)
      if (!groups[key]) {
        groups[key] = []
      }

      const value = row[columnName]
      if (value !== null && value !== undefined && value !== "") {
        const num = typeof value === "number" ? value : parseFloat(String(value))
        if (!isNaN(num)) {
          groups[key].push(num)
        }
      }
    }
  })

  return Object.entries(groups)
    .map(([label, values], index) => {
      let result: number
      switch (aggregation) {
        case "count":
          result = values.length
          break
        case "sum":
          result = values.reduce((a, b) => a + b, 0)
          break
        case "avg":
          result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
          break
        case "min":
          result = values.length > 0 ? Math.min(...values) : 0
          break
        case "max":
          result = values.length > 0 ? Math.max(...values) : 0
          break
      }

      return {
        label,
        value: result,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }
    })
    .sort((a, b) => b.value - a.value)
}
