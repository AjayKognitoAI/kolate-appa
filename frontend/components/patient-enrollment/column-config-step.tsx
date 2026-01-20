"use client"

import React, { useMemo, useState, useEffect } from "react"
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Chip,
  Tooltip,
  InputLabel,
  FormHelperText,
  Alert,
  Switch,
  FormControlLabel,
  Collapse,
  Badge,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
} from "@mui/material"
import {
  Numbers,
  TextFields,
  Category,
  CalendarMonth,
  Info,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  CleaningServices,
  ExpandMore,
  ExpandLess,
  GridView,
  ViewList,
  OpenInNew,
  Close,
} from "@mui/icons-material"
import type { PatientData } from "@/lib/screening-logic"
import type { ColumnType, DirtyDataStats } from "@/types/cohort.types"
import { detectPatientIdColumn, hasDuplicates, detectDuplicates, getEmptyValueStats } from "@/utils/patient-id-utils"
import { DuplicatesModal } from "./duplicates-modal"

interface ColumnConfigStepProps {
  data: PatientData[]
  columns: Record<string, ColumnType>
  onColumnTypeChange: (column: string, type: ColumnType) => void
  patientIdColumn?: string
  onPatientIdColumnChange?: (column: string) => void
  // Dirty data handling props
  excludeDirtyData?: boolean
  onExcludeDirtyDataChange?: (exclude: boolean) => void
  dirtyDataStats?: DirtyDataStats | null
}

const TYPE_CONFIG: Record<ColumnType, {
  icon: React.ReactElement;
  color: "primary" | "secondary" | "default" | "info";
  label: string;
  bgColor: string;
  borderColor: string;
  iconBg: string;
}> = {
  number: {
    icon: <Numbers fontSize="small" />,
    color: "primary",
    label: "Numeric",
    bgColor: "rgba(25, 118, 210, 0.04)",
    borderColor: "#1976d2",
    iconBg: "#e3f2fd",
  },
  string: {
    icon: <TextFields fontSize="small" />,
    color: "default",
    label: "Text",
    bgColor: "rgba(158, 158, 158, 0.04)",
    borderColor: "#9e9e9e",
    iconBg: "#f5f5f5",
  },
  categorical: {
    icon: <Category fontSize="small" />,
    color: "secondary",
    label: "Categorical",
    bgColor: "rgba(156, 39, 176, 0.04)",
    borderColor: "#9c27b0",
    iconBg: "#f3e5f5",
  },
  date: {
    icon: <CalendarMonth fontSize="small" />,
    color: "info",
    label: "Date",
    bgColor: "rgba(2, 136, 209, 0.04)",
    borderColor: "#0288d1",
    iconBg: "#e1f5fe",
  },
}

export function ColumnConfigStep({
  data,
  columns,
  onColumnTypeChange,
  patientIdColumn,
  onPatientIdColumnChange,
  excludeDirtyData = true,
  onExcludeDirtyDataChange,
  dirtyDataStats,
}: ColumnConfigStepProps) {
  const [selectedPatientIdColumn, setSelectedPatientIdColumn] = useState<string>(patientIdColumn || "")
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false)
  const [currentDuplicates, setCurrentDuplicates] = useState<any[]>([])
  const [dirtyDataPanelExpanded, setDirtyDataPanelExpanded] = useState(false)
  const [columnViewMode, setColumnViewMode] = useState<"grid" | "list">("list")
  const [missingDataDialogOpen, setMissingDataDialogOpen] = useState(false)
  const [columnTypeFilter, setColumnTypeFilter] = useState<ColumnType | "all">("all")

  // Auto-detect patient ID column on mount
  useEffect(() => {
    if (!patientIdColumn && data.length > 0 && Object.keys(columns).length > 0) {
      const detected = detectPatientIdColumn(data, columns)
      if (detected) {
        setSelectedPatientIdColumn(detected)
        onPatientIdColumnChange?.(detected)
      }
    }
  }, [])

  // Handle patient ID column change
  const handlePatientIdChange = (columnName: string) => {
    if (hasDuplicates(data, columnName)) {
      const duplicates = detectDuplicates(data, columnName)
      setCurrentDuplicates(duplicates)
      setIsDuplicatesModalOpen(true)
      // Don't set the column if it has duplicates
      return
    }

    setSelectedPatientIdColumn(columnName)
    onPatientIdColumnChange?.(columnName)
  }

  // Get validation status for patient ID column
  const getPatientIdStatus = () => {
    if (!selectedPatientIdColumn) {
      return { severity: "error" as const, message: "Please select a patient ID column", icon: <ErrorIcon fontSize="small" /> }
    }

    const emptyStats = getEmptyValueStats(data, selectedPatientIdColumn)
    if (emptyStats.percentage > 10) {
      return {
        severity: "warning" as const,
        message: `${emptyStats.count} rows (${emptyStats.percentage.toFixed(1)}%) have empty values`,
        icon: <Warning fontSize="small" />
      }
    }

    return {
      severity: "success" as const,
      message: "All values are unique",
      icon: <CheckCircle fontSize="small" />
    }
  }

  const patientIdStatus = getPatientIdStatus()

  const columnStats = useMemo(() => {
    const stats: Record<string, { uniqueCount: number; sampleValues: string[]; nullCount: number }> = {}

    Object.keys(columns).forEach((col) => {
      const values = data.map((row) => row[col])
      const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== "")
      const uniqueValues = new Set(nonNullValues.map((v) => String(v)))
      const sampleValues = Array.from(uniqueValues).slice(0, 5)

      stats[col] = {
        uniqueCount: uniqueValues.size,
        sampleValues,
        nullCount: values.length - nonNullValues.length,
      }
    })

    return stats
  }, [data, columns])

  const columnKeys = Object.keys(columns)
  const filteredColumnKeys = columnTypeFilter === "all"
    ? columnKeys
    : columnKeys.filter(col => columns[col] === columnTypeFilter)

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Set patient data column types
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Review and adjust the detected column types. This helps optimize filtering options for each column.
      </Typography>

      {/* Summary Stats Row with Patient ID, Missing Data & View Toggle */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} gap={2}>
        <Box display="flex" gap={1.5} alignItems="stretch" sx={{ overflowX: "auto" }}>
          {/* Patient ID Selector - Compact */}
          <Tooltip
            title="Column that uniquely identifies each patient"
            placement="bottom"
          >
            <Paper
              elevation={0}
              sx={{
                px: 1.5,
                py: 0.75,
                border: "1px solid",
                borderColor: patientIdStatus.severity === "error" ? "#f44336" : patientIdStatus.severity === "warning" ? "#ff9800" : "#4caf50",
                borderRadius: 1.5,
                bgcolor: patientIdStatus.severity === "error" ? "rgba(244, 67, 54, 0.04)" : patientIdStatus.severity === "warning" ? "rgba(255, 152, 0, 0.04)" : "rgba(76, 175, 80, 0.04)",
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexShrink: 0,
                width: 180,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5} sx={{ fontSize: "0.65rem" }}>
                  Patient ID
                  {patientIdStatus.severity === "success" && <CheckCircle sx={{ fontSize: 10, color: "#4caf50" }} />}
                  {patientIdStatus.severity === "warning" && <Warning sx={{ fontSize: 10, color: "#ff9800" }} />}
                  {patientIdStatus.severity === "error" && <ErrorIcon sx={{ fontSize: 10, color: "#f44336" }} />}
                </Typography>
                <FormControl size="small" sx={{ minWidth: 120, mt: 0.25 }}>
                  <Select
                    value={selectedPatientIdColumn}
                    onChange={(e) => handlePatientIdChange(e.target.value)}
                    displayEmpty
                    sx={{
                      height: 24,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      "& .MuiSelect-select": { py: 0.25, px: 0.75 },
                    }}
                  >
                    <MenuItem value="" disabled>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.75rem" }}>Select</Typography>
                    </MenuItem>
                    {columnKeys.map((col) => (
                      <MenuItem key={col} value={col}>
                        <Box display="flex" alignItems="center" gap={1} width="100%">
                          <Typography variant="body2" fontWeight={500} sx={{ fontSize: "0.75rem" }}>{col}</Typography>
                          <Box flex={1} />
                          <Chip
                            label={`${columnStats[col]?.uniqueCount || 0}`}
                            size="small"
                            sx={{ height: 16, fontSize: "0.55rem" }}
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Paper>
          </Tooltip>

          {/* Divider */}
          <Box sx={{ width: 1, bgcolor: "#e0e0e0", my: 0.5 }} />

          {/* Total Columns */}
          <Paper
            elevation={0}
            onClick={() => setColumnTypeFilter("all")}
            sx={{
              p: 1,
              border: columnTypeFilter === "all" ? "2px solid #1976d2" : "1px solid #e0e0e0",
              borderRadius: 1.5,
              cursor: "pointer",
              transition: "all 0.2s ease",
              bgcolor: columnTypeFilter === "all" ? "rgba(25, 118, 210, 0.08)" : "transparent",
              flexShrink: 0,
              width: 72,
              height: 72,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              "&:hover": {
                borderColor: "#1976d2",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              },
            }}
          >
            <Typography variant="h5" fontWeight={700} color={columnTypeFilter === "all" ? "#1976d2" : "text.primary"} lineHeight={1}>
              {columnKeys.length}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", mt: 0.5 }}>
              All
            </Typography>
          </Paper>

          {/* Type Stats */}
          {Object.entries(TYPE_CONFIG).map(([type, config]) => {
            const count = columnKeys.filter(col => columns[col] === type).length
            const isSelected = columnTypeFilter === type
            return (
              <Paper
                key={type}
                elevation={0}
                onClick={() => setColumnTypeFilter(isSelected ? "all" : type as ColumnType)}
                sx={{
                  p: 1,
                  border: isSelected ? `2px solid ${config.borderColor}` : `1px solid ${config.borderColor}`,
                  borderRadius: 1.5,
                  bgcolor: isSelected ? config.bgColor : "transparent",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                  width: 72,
                  height: 72,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  "&:hover": {
                    bgcolor: config.bgColor,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  },
                }}
              >
                <Box sx={{ "& svg": { fontSize: 18, color: config.borderColor } }}>
                  {config.icon}
                </Box>
                <Typography variant="h6" fontWeight={700} color={config.borderColor} lineHeight={1} mt={0.5}>
                  {count}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>
                  {config.label}
                </Typography>
              </Paper>
            )
          })}

          {/* Missing Data Filter - Compact with Switch */}
          <Paper
            elevation={0}
            sx={{
              px: 1.5,
              py: 0.75,
              border: "1px solid",
              borderColor: excludeDirtyData ? "#ff9800" : "#66bb6a",
              borderRadius: 1.5,
              bgcolor: excludeDirtyData ? "rgba(255, 152, 0, 0.08)" : "rgba(102, 187, 106, 0.08)",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexShrink: 0,
              width: 180,
            }}
          >
            <Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <CleaningServices sx={{ fontSize: 14, color: excludeDirtyData ? "#ff9800" : "#4caf50" }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>Missing</Typography>
              </Box>
              <Typography variant="subtitle1" fontWeight={600} color={excludeDirtyData ? "#ff9800" : "#4caf50"}>
                {dirtyDataStats?.totalDirtyRecords || 0}
              </Typography>
            </Box>
            <Box display="flex" flexDirection="column" alignItems="center">
              <Switch
                checked={excludeDirtyData}
                onChange={(e) => onExcludeDirtyDataChange?.(e.target.checked)}
                size="small"
                sx={{
                  transform: "scale(0.8)",
                  "& .MuiSwitch-switchBase.Mui-checked": {
                    color: "#ff9800",
                  },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: "#ff9800",
                  },
                  "& .MuiSwitch-switchBase:not(.Mui-checked)": {
                    color: "#4caf50",
                  },
                  "& .MuiSwitch-switchBase:not(.Mui-checked) + .MuiSwitch-track": {
                    backgroundColor: "#4caf50",
                  },
                }}
              />
              <Typography variant="caption" sx={{ fontSize: "0.55rem", color: excludeDirtyData ? "#ff9800" : "#4caf50", fontWeight: 600, mt: -0.5 }}>
                {excludeDirtyData ? "Exclude" : "Include"}
              </Typography>
            </Box>
            <Tooltip title="View column details">
              <IconButton
                size="small"
                onClick={() => setMissingDataDialogOpen(true)}
                sx={{
                  color: excludeDirtyData ? "#ff9800" : "#4caf50",
                  p: 0.25,
                }}
              >
                <OpenInNew sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Paper>
        </Box>

        {/* View Toggle */}
        <ToggleButtonGroup
          value={columnViewMode}
          exclusive
          onChange={(_, val) => val && setColumnViewMode(val)}
          size="small"
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="grid" sx={{ px: 1, py: 0.25 }}>
            <GridView sx={{ fontSize: 16, mr: 0.5 }} />
            <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>Grid</Typography>
          </ToggleButton>
          <ToggleButton value="list" sx={{ px: 1, py: 0.25 }}>
            <ViewList sx={{ fontSize: 16, mr: 0.5 }} />
            <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>List</Typography>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Column Cards - Grid or List View */}
      {columnViewMode === "grid" ? (
        <Grid container spacing={2}>
          {filteredColumnKeys.map((col) => {
            const type = columns[col]
            const stats = columnStats[col]
            const config = TYPE_CONFIG[type]
            const hasMissingData = (stats?.nullCount || 0) > 0

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={col}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor: hasMissingData ? "#ff9800" : "#e0e0e0",
                    borderRadius: 2,
                    bgcolor: "#fff",
                    height: "100%",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: config.borderColor,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    },
                  }}
                >
                  {/* Card Header */}
                  <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1.5}>
                    <Box display="flex" alignItems="center" gap={1.5} flex={1} minWidth={0}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1,
                          bgcolor: config.iconBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {type === "number" && <Numbers sx={{ fontSize: 18, color: config.borderColor }} />}
                        {type === "string" && <TextFields sx={{ fontSize: 18, color: config.borderColor }} />}
                        {type === "categorical" && <Category sx={{ fontSize: 18, color: config.borderColor }} />}
                      </Box>
                      <Tooltip title={col} placement="top">
                        <Typography
                          variant="subtitle2"
                          fontWeight={600}
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {col}
                        </Typography>
                      </Tooltip>
                    </Box>
                    {hasMissingData && (
                      <Tooltip title={`${stats?.nullCount} missing values`}>
                        <Warning sx={{ fontSize: 18, color: "#ff9800", flexShrink: 0 }} />
                      </Tooltip>
                    )}
                  </Box>

                  {/* Type Selector */}
                  <ToggleButtonGroup
                    value={type}
                    exclusive
                    onChange={(_, newType) => newType && onColumnTypeChange(col, newType as ColumnType)}
                    size="small"
                    fullWidth
                    sx={{ mb: 1.5 }}
                  >
                    <ToggleButton
                      value="number"
                      sx={{
                        flex: 1,
                        py: 0.5,
                        fontSize: "0.7rem",
                        "&.Mui-selected": { bgcolor: "#e3f2fd", color: "#1976d2" },
                      }}
                    >
                      <Numbers sx={{ fontSize: 14, mr: 0.5 }} />
                      Num
                    </ToggleButton>
                    <ToggleButton
                      value="string"
                      sx={{
                        flex: 1,
                        py: 0.5,
                        fontSize: "0.7rem",
                        "&.Mui-selected": { bgcolor: "#f5f5f5", color: "#616161" },
                      }}
                    >
                      <TextFields sx={{ fontSize: 14, mr: 0.5 }} />
                      Text
                    </ToggleButton>
                    <ToggleButton
                      value="categorical"
                      sx={{
                        flex: 1,
                        py: 0.5,
                        fontSize: "0.7rem",
                        "&.Mui-selected": { bgcolor: "#f3e5f5", color: "#9c27b0" },
                      }}
                    >
                      <Category sx={{ fontSize: 14, mr: 0.5 }} />
                      Cat
                    </ToggleButton>
                    <ToggleButton
                      value="date"
                      sx={{
                        flex: 1,
                        py: 0.5,
                        fontSize: "0.7rem",
                        "&.Mui-selected": { bgcolor: "#e1f5fe", color: "#0288d1" },
                      }}
                    >
                      <CalendarMonth sx={{ fontSize: 14, mr: 0.5 }} />
                      Date
                    </ToggleButton>
                  </ToggleButtonGroup>

                  {/* Stats Row */}
                  <Box display="flex" gap={1} mb={1.5}>
                    <Chip
                      label={`${stats?.uniqueCount || 0} unique`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.65rem", height: 20 }}
                    />
                    <Chip
                      label={`${stats?.nullCount || 0} empty`}
                      size="small"
                      variant="outlined"
                      color={hasMissingData ? "warning" : "default"}
                      sx={{ fontSize: "0.65rem", height: 20 }}
                    />
                  </Box>

                  {/* Sample Values */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                      Sample values
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {stats?.sampleValues.slice(0, 3).map((val, idx) => (
                        <Chip
                          key={idx}
                          label={val.length > 12 ? val.substring(0, 12) + "…" : val}
                          size="small"
                          sx={{
                            fontSize: "0.65rem",
                            height: 20,
                            bgcolor: "#f5f5f5",
                            "& .MuiChip-label": { px: 1 },
                          }}
                        />
                      ))}
                      {(stats?.sampleValues.length || 0) > 3 && (
                        <Tooltip title={stats?.sampleValues.slice(3).join(", ")}>
                          <Chip
                            label={`+${(stats?.sampleValues.length || 0) - 3}`}
                            size="small"
                            sx={{
                              fontSize: "0.65rem",
                              height: 20,
                              bgcolor: "#e0e0e0",
                              "& .MuiChip-label": { px: 1 },
                            }}
                          />
                        </Tooltip>
                      )}
                      {(!stats?.sampleValues || stats.sampleValues.length === 0) && (
                        <Typography variant="caption" color="text.disabled" fontStyle="italic">
                          No values
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            )
          })}
        </Grid>
      ) : (
        /* List View */
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {filteredColumnKeys.map((col) => {
            const type = columns[col]
            const stats = columnStats[col]
            const config = TYPE_CONFIG[type]
            const hasMissingData = (stats?.nullCount || 0) > 0

            return (
              <Paper
                key={col}
                elevation={0}
                sx={{
                  px: 2,
                  py: 1.5,
                  border: "1px solid",
                  borderColor: hasMissingData ? "#ff9800" : "#e0e0e0",
                  borderRadius: 2,
                  bgcolor: "#fff",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: config.borderColor,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  },
                }}
              >
                <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                  {/* Column Name with Icon */}
                  <Box display="flex" alignItems="center" gap={1.5} minWidth={200} flex={1}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        bgcolor: config.iconBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {type === "number" && <Numbers sx={{ fontSize: 16, color: config.borderColor }} />}
                      {type === "string" && <TextFields sx={{ fontSize: 16, color: config.borderColor }} />}
                      {type === "categorical" && <Category sx={{ fontSize: 16, color: config.borderColor }} />}
                    </Box>
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </Typography>
                    {hasMissingData && (
                      <Tooltip title={`${stats?.nullCount} missing values`}>
                        <Warning sx={{ fontSize: 16, color: "#ff9800", flexShrink: 0 }} />
                      </Tooltip>
                    )}
                  </Box>

                  {/* Type Selector - Compact */}
                  <ToggleButtonGroup
                    value={type}
                    exclusive
                    onChange={(_, newType) => newType && onColumnTypeChange(col, newType as ColumnType)}
                    size="small"
                    sx={{ flexShrink: 0 }}
                  >
                    <ToggleButton
                      value="number"
                      sx={{
                        py: 0.25,
                        px: 1,
                        fontSize: "0.7rem",
                        "&.Mui-selected": { bgcolor: "#e3f2fd", color: "#1976d2" },
                      }}
                    >
                      <Numbers sx={{ fontSize: 14, mr: 0.5 }} />
                      Num
                    </ToggleButton>
                    <ToggleButton
                      value="string"
                      sx={{
                        py: 0.25,
                        px: 1,
                        fontSize: "0.7rem",
                        "&.Mui-selected": { bgcolor: "#f5f5f5", color: "#616161" },
                      }}
                    >
                      <TextFields sx={{ fontSize: 14, mr: 0.5 }} />
                      Text
                    </ToggleButton>
                    <ToggleButton
                      value="categorical"
                      sx={{
                        py: 0.25,
                        px: 1,
                        fontSize: "0.7rem",
                        "&.Mui-selected": { bgcolor: "#f3e5f5", color: "#9c27b0" },
                      }}
                    >
                      <Category sx={{ fontSize: 14, mr: 0.5 }} />
                      Cat
                    </ToggleButton>
                    <ToggleButton
                      value="date"
                      sx={{
                        py: 0.25,
                        px: 1,
                        fontSize: "0.7rem",
                        "&.Mui-selected": { bgcolor: "#e1f5fe", color: "#0288d1" },
                      }}
                    >
                      <CalendarMonth sx={{ fontSize: 14, mr: 0.5 }} />
                      Date
                    </ToggleButton>
                  </ToggleButtonGroup>

                  {/* Stats */}
                  <Box display="flex" gap={1} flexShrink={0}>
                    <Chip
                      label={`${stats?.uniqueCount || 0} unique`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.65rem", height: 20 }}
                    />
                    <Chip
                      label={`${stats?.nullCount || 0} empty`}
                      size="small"
                      variant="outlined"
                      color={hasMissingData ? "warning" : "default"}
                      sx={{ fontSize: "0.65rem", height: 20 }}
                    />
                  </Box>

                  {/* Sample Values */}
                  <Box display="flex" gap={0.5} alignItems="center" flex={1} minWidth={150}>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      Samples:
                    </Typography>
                    {stats?.sampleValues.slice(0, 3).map((val, idx) => (
                      <Chip
                        key={idx}
                        label={val.length > 10 ? val.substring(0, 10) + "…" : val}
                        size="small"
                        sx={{
                          fontSize: "0.6rem",
                          height: 18,
                          bgcolor: "#f5f5f5",
                          "& .MuiChip-label": { px: 0.75 },
                        }}
                      />
                    ))}
                    {(stats?.sampleValues.length || 0) > 3 && (
                      <Tooltip title={stats?.sampleValues.slice(3).join(", ")}>
                        <Chip
                          label={`+${(stats?.sampleValues.length || 0) - 3}`}
                          size="small"
                          sx={{
                            fontSize: "0.6rem",
                            height: 18,
                            bgcolor: "#e0e0e0",
                            "& .MuiChip-label": { px: 0.75 },
                          }}
                        />
                      </Tooltip>
                    )}
                    {(!stats?.sampleValues || stats.sampleValues.length === 0) && (
                      <Typography variant="caption" color="text.disabled" fontStyle="italic">
                        No values
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Paper>
            )
          })}
        </Box>
      )}

      {/* Info Box */}
      <Paper elevation={0} sx={{ mt: 3, p: 2, bgcolor: "#f8f9fa", border: "1px solid #ececf1", borderRadius: 2 }}>
        <Box display="flex" gap={1.5} alignItems="flex-start">
          <Info sx={{ color: "#1976d2", fontSize: 20, mt: 0.25 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
              Column Type Guide
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
              <Box flex={1} minWidth={200}>
                <Box display="flex" alignItems="center" gap={0.5} mb={0.25}>
                  <Numbers sx={{ fontSize: 14, color: "#1976d2" }} />
                  <Typography variant="body2" fontWeight={600} color="#1976d2">Numeric</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  For numbers (age, scores). Enables &gt;, &lt;, between operators.
                </Typography>
              </Box>
              <Box flex={1} minWidth={200}>
                <Box display="flex" alignItems="center" gap={0.5} mb={0.25}>
                  <Category sx={{ fontSize: 14, color: "#9c27b0" }} />
                  <Typography variant="body2" fontWeight={600} color="#9c27b0">Categorical</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  For limited values (gender, status). Shows dropdown in filters.
                </Typography>
              </Box>
              <Box flex={1} minWidth={200}>
                <Box display="flex" alignItems="center" gap={0.5} mb={0.25}>
                  <TextFields sx={{ fontSize: 14, color: "#616161" }} />
                  <Typography variant="body2" fontWeight={600} color="#616161">Text</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  For free-form text (names, IDs). Enables text search.
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Duplicates Modal */}
      <DuplicatesModal
        open={isDuplicatesModalOpen}
        onClose={() => setIsDuplicatesModalOpen(false)}
        columnName={selectedPatientIdColumn}
        duplicates={currentDuplicates}
        totalRows={data.length}
      />

      {/* Missing Data Details Dialog */}
      <Dialog
        open={missingDataDialogOpen}
        onClose={() => setMissingDataDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <CleaningServices sx={{ color: "#ff9800" }} />
            <Typography variant="h6" fontWeight={600}>Missing Data Details</Typography>
          </Box>
          <IconButton size="small" onClick={() => setMissingDataDialogOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {/* Summary */}
          <Box display="flex" gap={2} mb={3}>
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                p: 2,
                bgcolor: "rgba(255, 152, 0, 0.08)",
                border: "1px solid #ff9800",
                borderRadius: 2,
              }}
            >
              <Typography variant="caption" color="text.secondary">Total Records with Missing Data</Typography>
              <Typography variant="h4" fontWeight={600} color="#ff9800">
                {dirtyDataStats?.totalDirtyRecords || 0}
              </Typography>
            </Paper>
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                p: 2,
                bgcolor: excludeDirtyData ? "rgba(255, 152, 0, 0.08)" : "rgba(102, 187, 106, 0.08)",
                border: `1px solid ${excludeDirtyData ? "#ff9800" : "#4caf50"}`,
                borderRadius: 2,
              }}
            >
              <Typography variant="caption" color="text.secondary">Current Status</Typography>
              <Typography variant="h6" fontWeight={600} color={excludeDirtyData ? "#ff9800" : "#4caf50"}>
                {excludeDirtyData ? "Excluded from Analysis" : "Included in Analysis"}
              </Typography>
            </Paper>
          </Box>

          {/* Column Breakdown */}
          <Typography variant="subtitle2" fontWeight={600} mb={2}>
            Missing Values by Column
          </Typography>

          {dirtyDataStats && Object.keys(dirtyDataStats.columnStats).length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {Object.entries(dirtyDataStats.columnStats)
                .sort(([, a], [, b]) => b - a)
                .map(([column, count]) => {
                  const percentage = data.length > 0 ? (count / data.length) * 100 : 0
                  const hasIssue = count > 0
                  return (
                    <Box key={column}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight={500}>
                            {column}
                          </Typography>
                          {hasIssue && (
                            <Chip
                              label={`${count} missing`}
                              size="small"
                              color="warning"
                              sx={{ height: 20, fontSize: "0.65rem" }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {percentage.toFixed(1)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: "#e0e0e0",
                          "& .MuiLinearProgress-bar": {
                            bgcolor: hasIssue ? "#ff9800" : "#4caf50",
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>
                  )
                })}
            </Box>
          ) : (
            <Box
              sx={{
                p: 3,
                textAlign: "center",
                bgcolor: "rgba(102, 187, 106, 0.08)",
                border: "1px dashed #4caf50",
                borderRadius: 2,
              }}
            >
              <CheckCircle sx={{ fontSize: 40, color: "#4caf50", mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No missing data found in your dataset
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Box display="flex" alignItems="center" gap={2} width="100%" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">
                {excludeDirtyData ? "Exclude" : "Include"} missing data:
              </Typography>
              <Switch
                checked={excludeDirtyData}
                onChange={(e) => onExcludeDirtyDataChange?.(e.target.checked)}
                size="small"
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": {
                    color: "#ff9800",
                  },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: "#ff9800",
                  },
                }}
              />
            </Box>
            <Button variant="contained" onClick={() => setMissingDataDialogOpen(false)}>
              Close
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
