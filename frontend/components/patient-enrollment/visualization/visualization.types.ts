import type { ColumnType, EnhancedColumnSchema } from "@/types/cohort.types"
import type { PatientData } from "@/lib/screening-logic"

/**
 * Chart type options for visualization
 */
export type ChartType = "bar" | "histogram" | "pie" | "line"

/**
 * Generic chart data point for bar/pie charts
 */
export interface ChartDataPoint {
  label: string
  value: number
  percentage?: number
  color?: string
}

/**
 * Histogram-specific data point with bin information
 */
export interface HistogramDataPoint {
  bin: string
  binStart: number
  binEnd: number
  count: number
  percentage: number
}

/**
 * Auto-generated chart configuration
 */
export interface AutoChartConfig {
  id: string
  columnName: string
  chartType: ChartType
  title: string
  description?: string
  data: ChartDataPoint[] | HistogramDataPoint[]
  metadata: {
    totalRecords: number
    nullCount: number
    uniqueCount: number
    columnType: ColumnType
    unitOfMeasure?: string | null
  }
}

/**
 * Manual chart configuration from user
 */
export interface ManualChartConfig {
  id: string
  title: string
  chartType: ChartType
  columnName: string
  aggregation: "count" | "sum" | "avg" | "min" | "max"
  groupBy?: string
}

/**
 * Props for the main DataVisualization component
 */
export interface DataVisualizationProps {
  /** Patient data records */
  data: PatientData[]
  /** Column type mapping */
  columns: Record<string, ColumnType>
  /** Optional enhanced column metadata with descriptions, unique counts, etc. */
  columnMetadata?: EnhancedColumnSchema | null
  /** Optional null detection info */
  nullDetection?: {
    null_count_by_column: Record<string, number>
    rows_with_nulls_percentage: number
  } | null
  /** Title for the visualization section */
  title?: string
  /** Maximum number of auto-generated charts to show */
  maxAutoCharts?: number
  /** Whether to show the quick chart builder */
  showQuickBuilder?: boolean
  /** Callback when a chart is downloaded */
  onDownload?: (chartId: string, format: "png" | "svg") => void
  /** Height for individual charts */
  chartHeight?: number
  /** Whether component is in read-only mode */
  readOnly?: boolean
}

/**
 * Props for ChartCard wrapper
 */
export interface ChartCardProps {
  chart: AutoChartConfig | ManualChartConfig
  data: PatientData[]
  columns: Record<string, ColumnType>
  height?: number
  onDownload?: (format: "png" | "svg") => void
  onRemove?: () => void
  onEdit?: () => void
}

/**
 * Props for ManualChartBuilder dialog
 */
export interface ManualChartBuilderProps {
  open: boolean
  onClose: () => void
  onSave: (config: ManualChartConfig) => void
  data: PatientData[]
  columns: Record<string, ColumnType>
  columnMetadata?: EnhancedColumnSchema | null
  existingConfig?: ManualChartConfig
}

/**
 * Props for individual chart components
 */
export interface ChartComponentProps {
  data: ChartDataPoint[] | HistogramDataPoint[]
  title?: string
  height?: number
  unit?: string | null
}
