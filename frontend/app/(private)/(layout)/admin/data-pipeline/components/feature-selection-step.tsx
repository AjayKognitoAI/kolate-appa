"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Checkbox,
  Chip,
  Alert,
  CircularProgress,
  Skeleton,
  IconButton,
  Tooltip,
  LinearProgress,
} from "@mui/material"
import { IconBolt, IconInfoCircle, IconAlertTriangle, IconRefresh } from "@tabler/icons-react"
import {
  dataPipelineService,
  EdaResponse,
  EdaFeatureRanking,
  EdaColumnInfo,
  EdaNumericStats,
  DataQualityResponse,
} from "@/services/data-pipeline/data-pipeline-service"
import { toast } from "react-toastify"
import FeatureReasoningModal from "./feature-reasoning-modal"

interface FeatureSelectionStepProps {
  onNext: (data: any) => void
  onPrevious: () => void
  data: any
}

interface Feature {
  id: string
  label: string
  importance: "High" | "Medium" | "Low"
  importance_score: number
  reasoning: string
  dtype: string
  missing_percent: number
  unique_count: number
  correlation_with_target?: number
}

// Helper function to format feature label
const formatFeatureLabel = (featureName: string): string => {
  return featureName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Fallback function to determine feature importance when EDA is not available
const getFallbackFeatureImportance = (featureName: string): "High" | "Medium" | "Low" => {
  const lowerName = featureName.toLowerCase()

  if (
    lowerName.includes("id") ||
    lowerName.includes("age") ||
    lowerName.includes("weight") ||
    lowerName.includes("glucose") ||
    lowerName.includes("pressure") ||
    lowerName.includes("diagnosis") ||
    lowerName.includes("outcome")
  ) {
    return "High"
  }

  if (
    lowerName.includes("height") ||
    lowerName.includes("bmi") ||
    lowerName.includes("date") ||
    lowerName.includes("type")
  ) {
    return "Medium"
  }

  return "Low"
}

export default function FeatureSelectionStep({ onNext, onPrevious, data }: FeatureSelectionStepProps) {
  // Extract features from the extracted data
  const extractedColumns = data.extractedData?.columns || []
  const csvContent = data.extractedData?.csv_content
  const filename = data.extractedData?.filename

  // EDA State
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [edaResponse, setEdaResponse] = useState<EdaResponse | null>(null)
  const [dataQuality, setDataQuality] = useState<DataQualityResponse | null>(null)
  const [edaError, setEdaError] = useState<string | null>(null)

  // Modal State
  const [selectedFeatureForModal, setSelectedFeatureForModal] = useState<EdaFeatureRanking | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Convert EDA results to Feature objects, or fallback to basic column info
  const ALL_FEATURES: Feature[] = edaResponse?.eda?.feature_ranking
    ? edaResponse.eda.feature_ranking.map((ranking: EdaFeatureRanking) => ({
        id: ranking.column,
        label: formatFeatureLabel(ranking.column),
        importance: ranking.importance_level,
        importance_score: ranking.importance_score,
        reasoning: ranking.reasoning,
        dtype: ranking.dtype,
        missing_percent: ranking.missing_percent,
        unique_count: ranking.unique_count,
        correlation_with_target: ranking.correlation_with_target,
      }))
    : extractedColumns.map((col: string) => ({
        id: col,
        label: formatFeatureLabel(col),
        importance: getFallbackFeatureImportance(col),
        importance_score: getFallbackFeatureImportance(col) === "High" ? 80 : getFallbackFeatureImportance(col) === "Medium" ? 50 : 20,
        reasoning: "Feature importance estimated based on column name patterns. Run EDA analysis for detailed insights.",
        dtype: "unknown",
        missing_percent: 0,
        unique_count: 0,
      }))

  // Sort features by importance score (highest first)
  const sortedFeatures = [...ALL_FEATURES].sort((a, b) => b.importance_score - a.importance_score)

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(data.selectedFeatures || [])

  // Run EDA analysis
  const runEdaAnalysis = useCallback(async () => {
    if (!csvContent) {
      setEdaError("No CSV content available for analysis")
      return
    }

    setIsAnalyzing(true)
    setEdaError(null)

    try {
      // Create a File object from the CSV content
      const csvBlob = new Blob([csvContent], { type: "text/csv" })
      const csvFile = new File([csvBlob], filename || "data.csv", { type: "text/csv" })

      // Run EDA analysis
      const edaResult = await dataPipelineService.runEda(csvFile)
      setEdaResponse(edaResult)

      // Also run data quality check
      try {
        const qualityResult = await dataPipelineService.checkDataQuality(csvFile)
        setDataQuality(qualityResult)
      } catch (qualityError) {
        console.warn("Data quality check failed:", qualityError)
      }

      toast.success("EDA analysis completed successfully")
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Failed to run EDA analysis"
      setEdaError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsAnalyzing(false)
    }
  }, [csvContent, filename])

  // Run EDA on mount if CSV content is available
  useEffect(() => {
    if (csvContent && !edaResponse && !isAnalyzing) {
      runEdaAnalysis()
    }
  }, [csvContent, edaResponse, isAnalyzing, runEdaAnalysis])

  // Get column info and numeric stats for the modal
  const getColumnInfo = (columnName: string): EdaColumnInfo | undefined => {
    return edaResponse?.eda?.column_info?.find((col) => col.column === columnName)
  }

  const getNumericStats = (columnName: string): EdaNumericStats | undefined => {
    return edaResponse?.eda?.numeric_stats?.find((stat) => stat.column === columnName)
  }

  const openFeatureModal = (feature: Feature) => {
    const edaFeature: EdaFeatureRanking = {
      column: feature.id,
      importance_score: feature.importance_score,
      importance_level: feature.importance,
      reasoning: feature.reasoning,
      dtype: feature.dtype,
      missing_percent: feature.missing_percent,
      unique_count: feature.unique_count,
      correlation_with_target: feature.correlation_with_target,
    }
    setSelectedFeatureForModal(edaFeature)
    setModalOpen(true)
  }

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureId) ? prev.filter((id) => id !== featureId) : [...prev, featureId]
    )
  }

  const selectAll = () => {
    if (selectedFeatures.length === sortedFeatures.length) {
      setSelectedFeatures([])
    } else {
      setSelectedFeatures(sortedFeatures.map((f) => f.id))
    }
  }

  const selectHighImportance = () => {
    const highImportanceFeatures = sortedFeatures.filter((f) => f.importance === "High").map((f) => f.id)
    setSelectedFeatures(highImportanceFeatures)
  }

  const getImportanceColor = (importance: string): "error" | "warning" | "info" | "default" => {
    switch (importance) {
      case "High":
        return "error"
      case "Medium":
        return "warning"
      case "Low":
        return "info"
      default:
        return "default"
    }
  }

  return (
    <Box>
      {/* Features Info */}
      <Card sx={{ mb: 3, bgcolor: "primary.lighter", border: 1, borderColor: "primary.light" }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <IconBolt size={24} color="#1e4db7" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Select Features for Your Model
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {edaResponse
                  ? "Features have been analyzed using AI-powered EDA. Click the info icon on any feature to see detailed reasoning."
                  : "Choose which features to use for training your ML model. Features marked as \"High\" importance are recommended."}
              </Typography>
            </Box>
            {csvContent && (
              <Tooltip title="Re-run EDA Analysis">
                <IconButton onClick={runEdaAnalysis} disabled={isAnalyzing} size="small">
                  <IconRefresh size={20} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* EDA Analysis Progress */}
      {isAnalyzing && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="body1" fontWeight="bold">
                Running AI-Powered Feature Analysis...
              </Typography>
            </Box>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Analyzing data quality, correlations, and feature importance. This may take a moment.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* EDA Error Alert */}
      {edaError && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setEdaError(null)}>
          <Typography variant="body2" fontWeight="bold">
            EDA Analysis Error
          </Typography>
          <Typography variant="body2">
            {edaError}. Using fallback feature importance estimation.
          </Typography>
        </Alert>
      )}

      {/* Data Quality Warnings */}
      {dataQuality && dataQuality.quality.issues.length > 0 && (
        <Alert
          severity={dataQuality.quality.overall_score < 70 ? "warning" : "info"}
          sx={{ mb: 3 }}
          icon={<IconAlertTriangle size={20} />}
        >
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Data Quality Score: {dataQuality.quality.overall_score.toFixed(0)}%
          </Typography>
          <Typography variant="body2" component="div">
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {dataQuality.quality.issues.slice(0, 3).map((issue, idx) => (
                <li key={idx}>
                  <strong>{issue.column}</strong>: {issue.description}
                </li>
              ))}
              {dataQuality.quality.issues.length > 3 && (
                <li>...and {dataQuality.quality.issues.length - 3} more issues</li>
              )}
            </ul>
          </Typography>
        </Alert>
      )}

      {/* EDA Stats Summary */}
      {edaResponse && (
        <Card sx={{ mb: 3, bgcolor: "grey.50" }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Dataset Overview
            </Typography>
            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Rows
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {edaResponse.eda.basic_stats.rows.toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Columns
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {edaResponse.eda.basic_stats.columns}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Memory
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {edaResponse.eda.basic_stats.memory_usage}
                </Typography>
              </Box>
              {edaResponse.eda.basic_stats.duplicates > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Duplicates
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="warning.main">
                    {edaResponse.eda.basic_stats.duplicates}
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Feature Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              Available Features {edaResponse && `(Ranked by AI)`}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                onClick={selectHighImportance}
                size="small"
                sx={{ fontWeight: "bold" }}
              >
                Select High Importance
              </Button>
              <Button
                variant="text"
                onClick={selectAll}
                size="small"
                sx={{ fontWeight: "bold" }}
              >
                {selectedFeatures.length === sortedFeatures.length ? "Deselect All" : "Select All"}
              </Button>
            </Box>
          </Box>

          {isAnalyzing ? (
            // Loading skeletons
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} sx={{ border: 2, borderColor: "divider" }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Skeleton variant="rectangular" width={24} height={24} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" width="60%" height={24} />
                        <Skeleton variant="rectangular" width={120} height={24} sx={{ mt: 1, borderRadius: 2 }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              {sortedFeatures.map((feature) => (
                <Card
                  key={feature.id}
                  sx={{
                    border: 2,
                    borderColor: selectedFeatures.includes(feature.id) ? "primary.main" : "divider",
                    bgcolor: selectedFeatures.includes(feature.id) ? "primary.lighter" : "background.paper",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: "primary.main",
                    },
                  }}
                  onClick={() => toggleFeature(feature.id)}
                >
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                      <Checkbox
                        checked={selectedFeatures.includes(feature.id)}
                        onChange={() => {}}
                        sx={{ p: 0, mt: 0.5 }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                          <Typography variant="body1" fontWeight="bold" noWrap sx={{ flex: 1 }}>
                            {feature.label}
                          </Typography>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                openFeatureModal(feature)
                              }}
                              sx={{ p: 0.5 }}
                            >
                              <IconInfoCircle size={18} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                          <Chip
                            label={`${feature.importance} Importance`}
                            color={getImportanceColor(feature.importance)}
                            size="small"
                          />
                          {edaResponse && (
                            <Chip
                              label={`Score: ${feature.importance_score.toFixed(0)}`}
                              variant="outlined"
                              size="small"
                            />
                          )}
                          {feature.missing_percent > 0 && (
                            <Chip
                              label={`${feature.missing_percent.toFixed(1)}% missing`}
                              color={feature.missing_percent > 20 ? "warning" : "default"}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                        {feature.dtype !== "unknown" && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                            Type: {feature.dtype}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card sx={{ bgcolor: "grey.50" }}>
        <CardContent>
          <Typography variant="body1" fontWeight="bold">
            Selected Features:{" "}
            <Box component="span" sx={{ color: "primary.main" }}>
              {selectedFeatures.length} / {sortedFeatures.length}
            </Box>
          </Typography>
          {selectedFeatures.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {selectedFeatures.map((id) => sortedFeatures.find((f) => f.id === id)?.label).join(", ")}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
        <Button variant="outlined" fullWidth onClick={onPrevious} size="large">
          Previous
        </Button>
        <Button
          variant="contained"
          fullWidth
          onClick={() => onNext({ selectedFeatures, edaResponse, dataQuality })}
          disabled={selectedFeatures.length === 0 || isAnalyzing}
          size="large"
        >
          {isAnalyzing ? "Analyzing..." : "Submit to Model"}
        </Button>
      </Box>

      {/* Feature Reasoning Modal */}
      <FeatureReasoningModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        feature={selectedFeatureForModal}
        columnInfo={selectedFeatureForModal ? getColumnInfo(selectedFeatureForModal.column) : null}
        numericStats={selectedFeatureForModal ? getNumericStats(selectedFeatureForModal.column) : null}
        filename={edaResponse?.filename}
      />
    </Box>
  )
}
