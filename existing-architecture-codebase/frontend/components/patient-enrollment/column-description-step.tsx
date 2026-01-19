"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  LinearProgress,
  Alert,
  Collapse,
  Button,
  Skeleton,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material"
import {
  Edit,
  Check,
  Close,
  AutoAwesome,
  ExpandMore,
  Info,
  Warning,
  Refresh,
} from "@mui/icons-material"
import type { ColumnDescription, ColumnCategory, ColumnType } from "@/types/cohort.types"
import type { PatientData } from "@/lib/screening-logic"

interface ColumnDescriptionStepProps {
  columns: Record<string, ColumnType>
  data: PatientData[]
  descriptions: ColumnDescription[]
  onDescriptionsChange: (descriptions: ColumnDescription[]) => void
  isLoading: boolean
  error: string | null
  onRetry?: () => void
}

// Category colors for chips
const CATEGORY_COLORS: Record<ColumnCategory, "primary" | "secondary" | "success" | "error" | "warning" | "info" | "default"> = {
  "Demographics": "primary",
  "Clinical/Lab Values": "success",
  "Treatment History": "secondary",
  "Safety/Exclusions": "error",
  "Study-Specific": "warning",
  "Administrative": "default",
}

// All available categories
const ALL_CATEGORIES: ColumnCategory[] = [
  "Demographics",
  "Clinical/Lab Values",
  "Treatment History",
  "Safety/Exclusions",
  "Study-Specific",
  "Administrative",
]

// Confidence badge helper
const getConfidenceBadge = (score: number): { color: "success" | "primary" | "warning" | "error", label: string } => {
  if (score >= 0.85) return { color: "success", label: "High" }
  if (score >= 0.65) return { color: "primary", label: "Good" }
  if (score >= 0.45) return { color: "warning", label: "Moderate" }
  return { color: "error", label: "Low" }
}

// Single row editing component
interface EditableDescriptionRowProps {
  description: ColumnDescription
  columnType: ColumnType
  sampleValues: (string | number)[]
  onSave: (updated: ColumnDescription) => void
}

function EditableDescriptionRow({
  description,
  columnType,
  sampleValues,
  onSave,
}: EditableDescriptionRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedDescription, setEditedDescription] = useState<ColumnDescription>(description)

  const confidenceBadge = getConfidenceBadge(description.confidence_score)

  const handleSave = () => {
    onSave(editedDescription)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedDescription(description)
    setIsEditing(false)
  }

  const handleFieldChange = (field: keyof ColumnDescription, value: string | number | null) => {
    setEditedDescription((prev) => ({ ...prev, [field]: value }))
  }

  if (isEditing) {
    return (
      <TableRow sx={{ bgcolor: "action.hover" }}>
        <TableCell>
          <Typography variant="body2" fontWeight={600}>
            {description.column_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Type: {columnType}
          </Typography>
        </TableCell>
        <TableCell>
          <FormControl size="small" fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={editedDescription.category}
              label="Category"
              onChange={(e) => handleFieldChange("category", e.target.value)}
            >
              {ALL_CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </TableCell>
        <TableCell>
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            value={editedDescription.clinical_description}
            onChange={(e) => handleFieldChange("clinical_description", e.target.value)}
            placeholder="Enter clinical description..."
          />
        </TableCell>
        <TableCell>
          <Box display="flex" flexDirection="column" gap={1}>
            <TextField
              size="small"
              fullWidth
              label="Abbreviation"
              value={editedDescription.abbreviation_expansion || ""}
              onChange={(e) => handleFieldChange("abbreviation_expansion", e.target.value || null)}
              placeholder="e.g., Body Mass Index"
            />
            <TextField
              size="small"
              fullWidth
              label="Unit"
              value={editedDescription.unit_of_measure || ""}
              onChange={(e) => handleFieldChange("unit_of_measure", e.target.value || null)}
              placeholder="e.g., kg/m²"
            />
            <TextField
              size="small"
              fullWidth
              label="Reference Range"
              value={editedDescription.reference_range || ""}
              onChange={(e) => handleFieldChange("reference_range", e.target.value || null)}
              placeholder="e.g., 18.5-24.9"
            />
          </Box>
        </TableCell>
        <TableCell align="center">
          <Box display="flex" gap={0.5} justifyContent="center">
            <IconButton size="small" color="success" onClick={handleSave}>
              <Check fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={handleCancel}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow hover>
      <TableCell>
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {description.column_name}
          </Typography>
          {description.abbreviation_expansion && (
            <Typography variant="caption" color="text.secondary">
              ({description.abbreviation_expansion})
            </Typography>
          )}
          <Box mt={0.5}>
            <Chip
              label={columnType}
              size="small"
              variant="outlined"
              color={columnType === "number" ? "primary" : columnType === "categorical" ? "secondary" : "default"}
            />
          </Box>
          {sampleValues.length > 0 && (
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
              Sample: {sampleValues.slice(0, 3).join(", ")}
              {sampleValues.length > 3 && "..."}
            </Typography>
          )}
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={description.category}
          size="small"
          color={CATEGORY_COLORS[description.category]}
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ maxWidth: 400 }}>
          {description.clinical_description}
        </Typography>
      </TableCell>
      <TableCell>
        <Box display="flex" flexDirection="column" gap={0.5}>
          {description.unit_of_measure && (
            <Typography variant="caption">
              <strong>Unit:</strong> {description.unit_of_measure}
            </Typography>
          )}
          {description.reference_range && (
            <Typography variant="caption">
              <strong>Range:</strong> {description.reference_range}
            </Typography>
          )}
          <Tooltip title={`AI Confidence: ${Math.round(description.confidence_score * 100)}%`}>
            <Chip
              label={`${confidenceBadge.label} (${Math.round(description.confidence_score * 100)}%)`}
              size="small"
              color={confidenceBadge.color}
              variant="outlined"
              icon={<AutoAwesome fontSize="small" />}
            />
          </Tooltip>
        </Box>
      </TableCell>
      <TableCell align="center">
        <Tooltip title="Edit description">
          <IconButton size="small" onClick={() => setIsEditing(true)}>
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  )
}

// Loading skeleton for table rows
function LoadingSkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <TableRow key={idx}>
          <TableCell>
            <Skeleton variant="text" width={120} />
            <Skeleton variant="text" width={80} height={20} />
          </TableCell>
          <TableCell>
            <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 3 }} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="80%" />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={60} />
            <Skeleton variant="text" width={80} />
          </TableCell>
          <TableCell align="center">
            <Skeleton variant="circular" width={32} height={32} />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function ColumnDescriptionStep({
  columns,
  data,
  descriptions,
  onDescriptionsChange,
  isLoading,
  error,
  onRetry,
}: ColumnDescriptionStepProps) {
  const [groupByCategory, setGroupByCategory] = useState(false)

  // Get sample values for each column
  const sampleValuesByColumn = useMemo(() => {
    const samples: Record<string, (string | number)[]> = {}
    const columnNames = Object.keys(columns)

    columnNames.forEach((col) => {
      const values = data
        .slice(0, 10)
        .map((row) => row[col])
        .filter((v) => v !== null && v !== undefined && v !== "")
        .slice(0, 5)
      samples[col] = values as (string | number)[]
    })

    return samples
  }, [columns, data])

  // Group descriptions by category
  const groupedDescriptions = useMemo(() => {
    if (!groupByCategory) return null

    const groups: Record<ColumnCategory, ColumnDescription[]> = {
      "Demographics": [],
      "Clinical/Lab Values": [],
      "Treatment History": [],
      "Safety/Exclusions": [],
      "Study-Specific": [],
      "Administrative": [],
    }

    descriptions.forEach((desc) => {
      if (groups[desc.category]) {
        groups[desc.category].push(desc)
      }
    })

    return groups
  }, [descriptions, groupByCategory])

  const handleDescriptionUpdate = (updated: ColumnDescription) => {
    const newDescriptions = descriptions.map((desc) =>
      desc.column_name === updated.column_name ? updated : desc
    )
    onDescriptionsChange(newDescriptions)
  }

  // Columns without descriptions (not yet generated)
  const columnsWithoutDescriptions = useMemo(() => {
    const describedColumns = new Set(descriptions.map((d) => d.column_name))
    return Object.keys(columns).filter((col) => !describedColumns.has(col))
  }, [columns, descriptions])

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6" fontWeight={600} display="flex" alignItems="center" gap={1}>
            <AutoAwesome color="primary" />
            Column Descriptions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AI-generated clinical descriptions for your dataset columns. You can edit any suggestion.
          </Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          {onRetry && !isLoading && (
            <Button
              size="small"
              startIcon={<Refresh />}
              onClick={onRetry}
              variant="outlined"
            >
              Regenerate
            </Button>
          )}
          <Button
            size="small"
            variant={groupByCategory ? "contained" : "outlined"}
            onClick={() => setGroupByCategory(!groupByCategory)}
          >
            {groupByCategory ? "Ungroup" : "Group by Category"}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          onRetry && (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          )
        }>
          {error}
        </Alert>
      )}

      {isLoading && (
        <Box mb={2}>
          <Alert severity="info" icon={<AutoAwesome />}>
            Generating AI descriptions for {Object.keys(columns).length} columns...
          </Alert>
          <LinearProgress sx={{ mt: 1 }} />
        </Box>
      )}

      {columnsWithoutDescriptions.length > 0 && !isLoading && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {columnsWithoutDescriptions.length} column(s) without descriptions: {columnsWithoutDescriptions.slice(0, 5).join(", ")}
          {columnsWithoutDescriptions.length > 5 && `... and ${columnsWithoutDescriptions.length - 5} more`}
        </Alert>
      )}

      {groupByCategory && groupedDescriptions ? (
        // Grouped view with accordions
        <Box>
          {ALL_CATEGORIES.map((category) => {
            const categoryDescriptions = groupedDescriptions[category]
            if (categoryDescriptions.length === 0) return null

            return (
              <Accordion key={category} defaultExpanded={categoryDescriptions.length > 0}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      label={category}
                      size="small"
                      color={CATEGORY_COLORS[category]}
                    />
                    <Typography variant="body2" color="text.secondary">
                      ({categoryDescriptions.length} columns)
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell width="20%">Column</TableCell>
                          <TableCell width="12%">Category</TableCell>
                          <TableCell width="40%">Description</TableCell>
                          <TableCell width="20%">Metadata</TableCell>
                          <TableCell width="8%" align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {categoryDescriptions.map((desc) => (
                          <EditableDescriptionRow
                            key={desc.column_name}
                            description={desc}
                            columnType={columns[desc.column_name] || "string"}
                            sampleValues={sampleValuesByColumn[desc.column_name] || []}
                            onSave={handleDescriptionUpdate}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            )
          })}
        </Box>
      ) : (
        // Flat table view
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell width="18%">Column</TableCell>
                <TableCell width="12%">Category</TableCell>
                <TableCell width="40%">Description</TableCell>
                <TableCell width="22%">Metadata</TableCell>
                <TableCell width="8%" align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <LoadingSkeletonRows count={Math.min(Object.keys(columns).length, 5)} />
              ) : descriptions.length > 0 ? (
                descriptions.map((desc) => (
                  <EditableDescriptionRow
                    key={desc.column_name}
                    description={desc}
                    columnType={columns[desc.column_name] || "string"}
                    sampleValues={sampleValuesByColumn[desc.column_name] || []}
                    onSave={handleDescriptionUpdate}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary" py={4}>
                      No column descriptions available. Click "Regenerate" to generate AI descriptions.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {descriptions.length > 0 && (
        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {descriptions.length} of {Object.keys(columns).length} columns described
          </Typography>
          <Box display="flex" gap={1}>
            {Object.entries(
              descriptions.reduce((acc, d) => {
                acc[d.category] = (acc[d.category] || 0) + 1
                return acc
              }, {} as Record<string, number>)
            ).map(([category, count]) => (
              <Chip
                key={category}
                label={`${category}: ${count}`}
                size="small"
                variant="outlined"
                color={CATEGORY_COLORS[category as ColumnCategory]}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}
