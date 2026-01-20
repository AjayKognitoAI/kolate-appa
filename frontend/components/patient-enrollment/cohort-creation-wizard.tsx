"use client"

import { useState, useCallback, useMemo } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  Chip,
  Avatar,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Autocomplete,
} from "@mui/material"
import {
  Group,
  ArrowBack,
  ArrowForward,
  CheckCircle,
  Storage,
  FilterList,
  People,
  Assessment,
  Add,
  Delete,
} from "@mui/icons-material"
import type {
  MasterDataApi,
  CohortCreateRequest,
  FilterGroup,
  FilterRule,
  ColumnSchema,
  ColumnType,
  OperatorType,
  LogicType,
} from "@/types/cohort.types"
import type { PatientData } from "@/lib/screening-logic"

interface CohortCreationWizardProps {
  open: boolean
  studyId: string
  masterDataList: MasterDataApi[]
  onClose: () => void
  onSubmit: (data: Omit<CohortCreateRequest, "enterprise_id" | "user_id" | "user_name">) => Promise<void>
}

const STEPS = [
  "Cohort Details",
  "Select Master Data",
  "Build Filters",
  "Preview & Save",
]

// Operator configurations
const OPERATORS: { value: OperatorType; label: string; symbol: string; types: ColumnType[] }[] = [
  { value: "equals", label: "Equals", symbol: "=", types: ["string", "number", "categorical"] },
  { value: "not_equals", label: "Not Equals", symbol: "≠", types: ["string", "number", "categorical"] },
  { value: "contains", label: "Contains", symbol: "∋", types: ["string"] },
  { value: "gt", label: "Greater Than", symbol: ">", types: ["number"] },
  { value: "gte", label: "Greater or Equal", symbol: "≥", types: ["number"] },
  { value: "lt", label: "Less Than", symbol: "<", types: ["number"] },
  { value: "lte", label: "Less or Equal", symbol: "≤", types: ["number"] },
  { value: "between", label: "Between", symbol: "∈", types: ["number"] },
  { value: "is_empty", label: "Is Empty", symbol: "= ∅", types: ["string", "number", "categorical"] },
  { value: "is_not_empty", label: "Is Not Empty", symbol: "≠ ∅", types: ["string", "number", "categorical"] },
]

const OPERATOR_SYMBOLS: Record<string, string> = {
  equals: "=",
  not_equals: "≠",
  contains: "∋",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  between: "∈",
  is_empty: "= ∅",
  is_not_empty: "≠ ∅",
}

// Type guard
const isFilterRule = (rule: FilterRule | FilterGroup): rule is FilterRule => {
  return !("logic" in rule)
}

export function CohortCreationWizard({
  open,
  studyId,
  masterDataList,
  onClose,
  onSubmit,
}: CohortCreationWizardProps) {
  // Step state
  const [activeStep, setActiveStep] = useState(0)

  // Step 1: Cohort Details
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  // Step 2: Master Data Selection
  const [selectedMasterDataId, setSelectedMasterDataId] = useState("")

  // Step 3: Filter Building
  const [filter, setFilter] = useState<FilterGroup>({
    id: "root",
    logic: "AND",
    rules: [],
  })

  // Preview data (simulated from master data)
  const [previewData, setPreviewData] = useState<PatientData[]>([])
  const [filteredData, setFilteredData] = useState<PatientData[]>([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedMasterData = masterDataList.find(md => md.id === selectedMasterDataId)
  const columns = selectedMasterData?.columns as ColumnSchema || {}

  // Get operators for column type
  const getOperatorsForColumn = useCallback((columnType: ColumnType) => {
    return OPERATORS.filter((op) => op.types.includes(columnType))
  }, [])

  // Apply filter to data
  const applyFilter = useCallback((data: PatientData[], filterGroup: FilterGroup): PatientData[] => {
    if (!filterGroup.rules || filterGroup.rules.length === 0) {
      return data
    }

    return data.filter((patient) => {
      const results = filterGroup.rules.map((rule) => {
        if ("logic" in rule) {
          return applyFilter([patient], rule as FilterGroup).length > 0
        } else {
          return evaluateRule(patient, rule as FilterRule, columns)
        }
      })

      return filterGroup.logic === "AND"
        ? results.every((r) => r)
        : results.some((r) => r)
    })
  }, [columns])

  // Evaluate single rule
  const evaluateRule = (patient: PatientData, rule: FilterRule, cols: ColumnSchema): boolean => {
    const fieldValue = patient[rule.field]
    const columnType = cols[rule.field] || "string"

    if (rule.operator === "is_empty") {
      return fieldValue === undefined || fieldValue === null || fieldValue === ""
    }
    if (rule.operator === "is_not_empty") {
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== ""
    }

    if (fieldValue === undefined || fieldValue === null || fieldValue === "") {
      return false
    }

    const value = rule.value

    if (columnType === "number") {
      const numField = Number(fieldValue)
      const numValue = Number(value)

      switch (rule.operator) {
        case "equals": return numField === numValue
        case "not_equals": return numField !== numValue
        case "gt": return numField > numValue
        case "gte": return numField >= numValue
        case "lt": return numField < numValue
        case "lte": return numField <= numValue
        case "between": return numField >= numValue && numField <= Number(rule.value2)
        default: return false
      }
    }

    const strField = String(fieldValue).toLowerCase()
    const strValue = String(value).toLowerCase()

    switch (rule.operator) {
      case "equals": return strField === strValue
      case "not_equals": return strField !== strValue
      case "contains": return strField.includes(strValue)
      default: return false
    }
  }

  // Generate sample preview data based on master data columns
  const generatePreviewData = useCallback(() => {
    if (!selectedMasterData) return []

    // Generate sample data based on columns
    const sampleSize = Math.min(selectedMasterData.row_count, 100)
    const data: PatientData[] = []

    for (let i = 0; i < sampleSize; i++) {
      const row: PatientData = { _row_index: i }
      Object.entries(columns).forEach(([col, type]) => {
        if (col.toLowerCase().includes("id")) {
          row[col] = `PAT-${String(i + 1).padStart(5, "0")}`
        } else if (type === "number") {
          row[col] = Math.floor(Math.random() * 100)
        } else {
          row[col] = `Value_${i + 1}`
        }
      })
      data.push(row)
    }

    return data
  }, [selectedMasterData, columns])

  // Update preview when master data changes
  const handleMasterDataChange = (masterDataId: string) => {
    setSelectedMasterDataId(masterDataId)
    setFilter({ id: "root", logic: "AND", rules: [] })
    setPreviewData([])
    setFilteredData([])
  }

  // Filter operations
  const addRule = () => {
    const firstColumn = Object.keys(columns)[0]
    if (!firstColumn) return

    const columnType = columns[firstColumn]
    const newRule: FilterRule = {
      id: Math.random().toString(36).substr(2, 9),
      field: firstColumn,
      operator: columnType === "number" ? "gte" : "equals",
      value: "",
    }
    setFilter({ ...filter, rules: [...filter.rules, newRule] })
  }

  const removeRule = (id: string) => {
    setFilter({ ...filter, rules: filter.rules.filter((r) => r.id !== id) })
  }

  const updateRule = (id: string, updates: Partial<FilterRule>) => {
    setFilter({
      ...filter,
      rules: filter.rules.map((rule) => {
        if (isFilterRule(rule) && rule.id === id) {
          return { ...rule, ...updates }
        }
        return rule
      }),
    })
  }

  const handleApplyFilters = () => {
    const data = generatePreviewData()
    setPreviewData(data)
    const filtered = applyFilter(data, filter)
    setFilteredData(filtered)
    setActiveStep(3)
  }

  // Get filter rules for display
  const getFilterRules = (group: FilterGroup): FilterRule[] => {
    const rules: FilterRule[] = []
    group.rules.forEach((rule) => {
      if (isFilterRule(rule)) {
        rules.push(rule)
      } else {
        rules.push(...getFilterRules(rule as FilterGroup))
      }
    })
    return rules
  }

  const filterRules = getFilterRules(filter)
  const matchRate = previewData.length > 0
    ? ((filteredData.length / previewData.length) * 100).toFixed(1)
    : "0"

  // Navigation
  const handleNext = () => {
    setError(null)

    if (activeStep === 0) {
      if (!name.trim()) {
        setError("Please enter a cohort name")
        return
      }
    }

    if (activeStep === 1) {
      if (!selectedMasterDataId) {
        setError("Please select a master data file")
        return
      }
    }

    if (activeStep === 2) {
      handleApplyFilters()
      return
    }

    setActiveStep((prev) => prev + 1)
  }

  const handleBack = () => {
    setActiveStep((prev) => prev - 1)
    setError(null)
  }

  const handleSubmit = async () => {
    if (!selectedMasterData) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Generate patient IDs for filtered data
      const filteredPatientIds = filteredData.map((p, idx) =>
        p.patient_id?.toString() || `patient_${idx}`
      )

      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        study_id: studyId,
        master_data_id: selectedMasterDataId,
        columns: columns,
        filter: filter,
        filtered_patient_ids: filteredPatientIds,
        patient_count: filteredData.length,
        master_data_patient_count: selectedMasterData.row_count,
      })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create cohort")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setActiveStep(0)
    setName("")
    setDescription("")
    setSelectedMasterDataId("")
    setFilter({ id: "root", logic: "AND", rules: [] })
    setPreviewData([])
    setFilteredData([])
    setError(null)
    onClose()
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Provide basic information about your cohort.
            </Typography>

            <TextField
              fullWidth
              label="Cohort Name"
              placeholder="e.g., Adult Patients with High EASI Score"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="dense"
              required
              autoFocus
              inputProps={{ maxLength: 255 }}
            />

            <TextField
              fullWidth
              label="Description"
              placeholder="Describe the purpose and criteria for this cohort..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="dense"
              multiline
              rows={3}
              inputProps={{ maxLength: 1000 }}
            />
          </Box>
        )

      case 1:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Select the master data file to use for this cohort.
            </Typography>

            <FormControl fullWidth margin="dense" required>
              <InputLabel>Select Master Data</InputLabel>
              <Select
                value={selectedMasterDataId}
                label="Select Master Data"
                onChange={(e) => handleMasterDataChange(e.target.value)}
              >
                {masterDataList.map((md) => (
                  <MenuItem key={md.id} value={md.id}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Storage fontSize="small" color="action" />
                      {md.file_name} ({md.row_count.toLocaleString()} rows)
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedMasterData && (
              <Paper elevation={0} sx={{ mt: 3, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Dataset
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedMasterData.row_count.toLocaleString()} patients
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Object.keys(columns).length} columns available
                </Typography>
                <Box mt={2} display="flex" flexWrap="wrap" gap={0.5}>
                  {Object.keys(columns).slice(0, 10).map((col) => (
                    <Chip key={col} label={col} size="small" variant="outlined" />
                  ))}
                  {Object.keys(columns).length > 10 && (
                    <Chip label={`+${Object.keys(columns).length - 10} more`} size="small" />
                  )}
                </Box>
              </Paper>
            )}
          </Box>
        )

      case 2:
        return (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Define inclusion and exclusion criteria for your cohort.
                </Typography>
              </Box>
              <ToggleButtonGroup
                value={filter.logic}
                exclusive
                onChange={(_, value) => value && setFilter({ ...filter, logic: value })}
                size="small"
              >
                <ToggleButton value="AND">AND</ToggleButton>
                <ToggleButton value="OR">OR</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {filter.rules.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, border: "1px dashed #ccc", textAlign: "center" }}>
                <FilterList sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                <Typography variant="body1" gutterBottom>
                  No filters added yet
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Add filters to define your cohort criteria. Without filters, all patients will be included.
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={addRule}>
                  Add Filter Rule
                </Button>
              </Paper>
            ) : (
              <Box>
                {filter.rules.map((rule, index) => {
                  if (!isFilterRule(rule)) return null
                  const columnType = columns[rule.field] || "string"
                  const operators = getOperatorsForColumn(columnType)

                  return (
                    <Paper
                      key={rule.id}
                      elevation={0}
                      sx={{ p: 2, mb: 2, border: "1px solid #e0e0e0", borderRadius: 1 }}
                    >
                      <Box display="flex" alignItems="center" gap={2}>
                        {index > 0 && (
                          <Chip
                            label={filter.logic}
                            size="small"
                            color={filter.logic === "AND" ? "primary" : "warning"}
                          />
                        )}

                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <InputLabel>Field</InputLabel>
                          <Select
                            value={rule.field}
                            label="Field"
                            onChange={(e) => {
                              const newType = columns[e.target.value] || "string"
                              const newOps = getOperatorsForColumn(newType)
                              updateRule(rule.id, {
                                field: e.target.value,
                                operator: newOps[0]?.value || "equals",
                                value: "",
                              })
                            }}
                          >
                            {Object.keys(columns).map((col) => (
                              <MenuItem key={col} value={col}>{col}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <InputLabel>Operator</InputLabel>
                          <Select
                            value={rule.operator}
                            label="Operator"
                            onChange={(e) => updateRule(rule.id, { operator: e.target.value as OperatorType })}
                          >
                            {operators.map((op) => (
                              <MenuItem key={op.value} value={op.value}>
                                {op.symbol} {op.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {!["is_empty", "is_not_empty"].includes(rule.operator) && (
                          <TextField
                            size="small"
                            label="Value"
                            value={rule.value || ""}
                            onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                            type={columnType === "number" ? "number" : "text"}
                            sx={{ minWidth: 120 }}
                          />
                        )}

                        {rule.operator === "between" && (
                          <TextField
                            size="small"
                            label="Value 2"
                            value={rule.value2 || ""}
                            onChange={(e) => updateRule(rule.id, { value2: e.target.value })}
                            type="number"
                            sx={{ minWidth: 120 }}
                          />
                        )}

                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeRule(rule.id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Paper>
                  )
                })}

                <Button variant="outlined" startIcon={<Add />} onClick={addRule}>
                  Add Filter Rule
                </Button>
              </Box>
            )}

            <Alert severity="info" sx={{ mt: 3 }}>
              Click &quot;Apply & Preview&quot; to see how many patients match your criteria.
            </Alert>
          </Box>
        )

      case 3:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Review your filtered results before saving the cohort.
            </Typography>

            {/* Summary Stats */}
            <Grid container spacing={2} mb={3}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Paper elevation={0} sx={{ p: 2, border: "1px solid #ececf1", textAlign: "center" }}>
                  <Avatar sx={{ bgcolor: "success.light", color: "success.main", mx: "auto", mb: 1 }}>
                    <CheckCircle />
                  </Avatar>
                  <Typography variant="h5" fontWeight={700}>
                    {filteredData.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Matching Patients
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Paper elevation={0} sx={{ p: 2, border: "1px solid #ececf1", textAlign: "center" }}>
                  <Avatar sx={{ bgcolor: "primary.light", color: "primary.main", mx: "auto", mb: 1 }}>
                    <People />
                  </Avatar>
                  <Typography variant="h5" fontWeight={700}>
                    {previewData.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Patients
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Paper elevation={0} sx={{ p: 2, border: "1px solid #ececf1", textAlign: "center" }}>
                  <Avatar sx={{ bgcolor: "info.light", color: "info.main", mx: "auto", mb: 1 }}>
                    <Assessment />
                  </Avatar>
                  <Typography variant="h5" fontWeight={700}>
                    {matchRate}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Match Rate
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Paper elevation={0} sx={{ p: 2, border: "1px solid #ececf1", textAlign: "center" }}>
                  <Avatar sx={{ bgcolor: "warning.light", color: "warning.main", mx: "auto", mb: 1 }}>
                    <FilterList />
                  </Avatar>
                  <Typography variant="h5" fontWeight={700}>
                    {filterRules.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active Filters
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Applied Filters Summary */}
            {filterRules.length > 0 && (
              <Paper elevation={0} sx={{ p: 2, border: "1px solid #ececf1", mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Applied Filters ({filter.logic})
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {filterRules.map((rule) => (
                    <Chip
                      key={rule.id}
                      label={
                        rule.operator === "between"
                          ? `${rule.field}: ${rule.value} - ${rule.value2}`
                          : ["is_empty", "is_not_empty"].includes(rule.operator)
                            ? `${rule.field} ${OPERATOR_SYMBOLS[rule.operator]}`
                            : `${rule.field} ${OPERATOR_SYMBOLS[rule.operator]} ${rule.value}`
                      }
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Paper>
            )}

            {/* Data Preview */}
            <Paper elevation={0} sx={{ border: "1px solid #ececf1" }}>
              <Box px={2} py={1.5} borderBottom="1px solid #ececf1">
                <Typography variant="subtitle2">
                  Preview: {name || "New Cohort"}
                </Typography>
              </Box>

              {filteredData.length === 0 ? (
                <Box p={4} textAlign="center">
                  <Typography variant="body1" color="text.secondary">
                    No patients match your filter criteria
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Go back and adjust your filters
                  </Typography>
                </Box>
              ) : (
                <>
                  <TableContainer sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          {Object.keys(columns).slice(0, 6).map((col) => (
                            <TableCell key={col} sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}>
                              {col}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredData
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((row, idx) => (
                            <TableRow key={idx} hover>
                              {Object.keys(columns).slice(0, 6).map((col) => (
                                <TableCell key={col}>
                                  {String(row[col] ?? "")}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={filteredData.length}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10))
                      setPage(0)
                    }}
                    rowsPerPageOptions={[10, 25, 50]}
                  />
                </>
              )}
            </Paper>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Group color="primary" />
          Create New Cohort
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ pt: 2, pb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button
            onClick={handleBack}
            disabled={isSubmitting}
            startIcon={<ArrowBack />}
          >
            Back
          </Button>
        )}
        {activeStep < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            endIcon={activeStep === 2 ? undefined : <ArrowForward />}
          >
            {activeStep === 2 ? "Apply & Preview" : "Next"}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSubmitting || filteredData.length === 0}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <CheckCircle />}
          >
            {isSubmitting ? "Creating..." : "Save Cohort"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
