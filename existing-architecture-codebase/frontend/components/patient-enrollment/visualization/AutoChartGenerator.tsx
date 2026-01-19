import type { PatientData } from "@/lib/screening-logic"
import type { ColumnType, EnhancedColumnSchema } from "@/types/cohort.types"
import type { AutoChartConfig } from "./visualization.types"
import {
  countUniqueValues,
  countNullValues,
  getValueDistribution,
  createHistogramData,
  formatColumnTitle,
  determineChartType,
  calculateColumnPriority,
} from "./visualization.utils"

interface ScoredColumn {
  columnName: string
  columnType: ColumnType
  uniqueCount: number
  nullCount: number
  score: number
}

/**
 * Generate auto-chart configurations for all suitable columns
 */
export function generateAutoCharts(
  data: PatientData[],
  columns: Record<string, ColumnType>,
  columnMetadata?: EnhancedColumnSchema | null,
  nullDetection?: { null_count_by_column: Record<string, number> } | null,
  maxCharts: number = 8
): AutoChartConfig[] {
  if (data.length === 0) {
    return []
  }

  const totalRecords = data.length
  const configs: AutoChartConfig[] = []

  // Score and sort columns by visualization priority
  const scoredColumns: ScoredColumn[] = Object.entries(columns).map(([columnName, columnType]) => {
    const metadata = columnMetadata?.[columnName]

    // Use metadata if available, otherwise calculate from data
    const uniqueCount = metadata?.unique_count ?? countUniqueValues(data, columnName)
    const nullCount = nullDetection?.null_count_by_column?.[columnName]
      ?? metadata?.null_count
      ?? countNullValues(data, columnName)

    const score = calculateColumnPriority(columnType, uniqueCount, nullCount, totalRecords)

    return { columnName, columnType, uniqueCount, nullCount, score }
  })

  // Sort by score descending and filter out zero scores
  scoredColumns.sort((a, b) => b.score - a.score)
  const eligibleColumns = scoredColumns.filter((col) => col.score > 0)

  // Generate charts for top columns
  for (const col of eligibleColumns.slice(0, maxCharts)) {
    const chartType = determineChartType(
      col.columnName,
      col.columnType,
      col.uniqueCount,
      col.nullCount,
      totalRecords
    )

    if (!chartType) continue

    const metadata = columnMetadata?.[col.columnName]
    let chartData

    if (chartType === "histogram") {
      // Calculate appropriate number of bins based on data
      const numBins = Math.min(15, Math.max(5, Math.ceil(Math.sqrt(col.uniqueCount))))
      chartData = createHistogramData(data, col.columnName, numBins)
    } else {
      // Bar or Pie chart - get value distribution
      const maxCategories = chartType === "pie" ? 8 : 12
      chartData = getValueDistribution(data, col.columnName, maxCategories)
    }

    // Skip if no data to show
    if (chartData.length === 0) continue

    configs.push({
      id: `auto-${col.columnName}-${Date.now()}`,
      columnName: col.columnName,
      chartType,
      title: formatColumnTitle(col.columnName, columnMetadata),
      description: metadata?.description || undefined,
      data: chartData,
      metadata: {
        totalRecords,
        nullCount: col.nullCount,
        uniqueCount: col.uniqueCount,
        columnType: col.columnType,
        unitOfMeasure: metadata?.unit_of_measure,
      },
    })
  }

  return configs
}
