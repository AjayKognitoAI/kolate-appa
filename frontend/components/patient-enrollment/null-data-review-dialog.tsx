"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
} from "@mui/material"
import {
  Warning,
  CheckCircle,
  Close,
  Save,
  Refresh,
} from "@mui/icons-material"
import cohortService, {
  type NullRecord,
  type NullValueEdit,
} from "@/services/patient-enrollment/cohort-service"

interface NullDataReviewDialogProps {
  open: boolean
  onClose: () => void
  masterDataId: string
  masterDataName: string
  onEditComplete: (newMasterDataId: string, version: number) => void
  onSkip: () => void
}

export function NullDataReviewDialog({
  open,
  onClose,
  masterDataId,
  masterDataName,
  onEditComplete,
  onSkip,
}: NullDataReviewDialogProps) {
  console.log("🔵 NullDataReviewDialog rendered with:", { open, masterDataId, masterDataName })

  const { data: session } = useSession()
  const enterpriseId = session?.user?.orgId || ""
  const userId = session?.user?.sub || ""
  const userName = session?.user?.firstName
    ? `${session.user.firstName} ${session.user.lastName || ""}`.trim()
    : session?.user?.email || ""

  const [loading, setLoading] = useState(true)
  const [nullRecords, setNullRecords] = useState<NullRecord[]>([])
  const [nullCountByColumn, setNullCountByColumn] = useState<Record<string, number>>({})
  const [totalRows, setTotalRows] = useState(0)
  const [rowsWithNulls, setRowsWithNulls] = useState(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // Edits state: map of "rowIndex-columnName" to new value
  const [edits, setEdits] = useState<Map<string, string | number>>(new Map())
  const [isSaving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch null records
  useEffect(() => {
    console.log("🟡 useEffect triggered:", { open, masterDataId, enterpriseId, page })
    if (open && masterDataId && enterpriseId) {
      console.log("✅ Conditions met, calling fetchNullRecords")
      fetchNullRecords()
    } else {
      console.log("❌ Conditions NOT met:", { open, masterDataId, enterpriseId })
    }
  }, [open, masterDataId, enterpriseId, page])

  const fetchNullRecords = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("Fetching null records for master_data_id:", masterDataId)
      const response = await cohortService.getNullRecords(masterDataId, enterpriseId, page, 100)
      console.log("=== NULL RECORDS RESPONSE ===")
      console.log("Full response:", response)
      console.log("Null records count:", response.data.null_records?.length)
      console.log("Null records data:", response.data.null_records)
      console.log("Rows with nulls:", response.data.rows_with_nulls)
      console.log("Null count by column:", response.data.null_count_by_column)

      if (response.data.null_records && response.data.null_records.length > 0) {
        console.log("First record sample:", response.data.null_records[0])
        console.log("First record's record_data:", response.data.null_records[0].record_data)
        console.log("First record's null_columns:", response.data.null_records[0].null_columns)
      }

      setNullRecords(response.data.null_records || [])
      setNullCountByColumn(response.data.null_count_by_column || {})
      setTotalRows(response.data.total_rows || 0)
      setRowsWithNulls(response.data.rows_with_nulls || 0)
      setHasMore(response.data.has_more || false)
    } catch (err) {
      console.error("Error fetching null records:", err)
      setError(err instanceof Error ? err.message : "Failed to load null records")
    } finally {
      setLoading(false)
    }
  }

  // Get all unique columns from records
  const allColumns = useMemo(() => {
    const cols = new Set<string>()
    nullRecords.forEach((record) => {
      Object.keys(record.record_data).forEach((col) => cols.add(col))
    })
    return Array.from(cols)
  }, [nullRecords])

  // Calculate actual null counts per column from the data
  // Use the backend's null_columns array if available, otherwise check the value
  const actualNullCountsByColumn = useMemo(() => {
    const counts: Record<string, number> = {}
    allColumns.forEach(col => {
      counts[col] = nullRecords.filter(record => {
        // Prioritize backend's null_columns array
        if (record.null_columns?.includes(col)) {
          return true
        }
        // Fallback to value checking
        const value = record.record_data[col]
        return value === null ||
               value === undefined ||
               value === "" ||
               (typeof value === "string" && value.trim() === "")
      }).length
    })
    return counts
  }, [nullRecords, allColumns])

  // Handle inline edit
  const handleCellEdit = (rowIndex: number, columnName: string, value: string) => {
    console.log("handleCellEdit called:", { rowIndex, columnName, value })
    const key = `${rowIndex}-${columnName}`
    const newEdits = new Map(edits)
    if (value.trim() === "") {
      newEdits.delete(key)
    } else {
      newEdits.set(key, value)
    }
    console.log("Updated edits map:", newEdits)
    setEdits(newEdits)
  }

  // Check if a cell has been edited
  const getCellValue = (rowIndex: number, columnName: string, originalValue: unknown): string => {
    const key = `${rowIndex}-${columnName}`
    if (edits.has(key)) {
      return String(edits.get(key))
    }
    return originalValue === null || originalValue === undefined ? "" : String(originalValue)
  }

  const isCellEdited = (rowIndex: number, columnName: string): boolean => {
    const key = `${rowIndex}-${columnName}`
    return edits.has(key)
  }

  // Save edits
  const handleSaveEdits = async () => {
    if (edits.size === 0) {
      setError("No edits to save")
      return
    }

    setSaving(true)
    setError(null)
    try {
      // Convert edits map to array
      const editsArray: NullValueEdit[] = Array.from(edits.entries()).map(([key, value]) => {
        const [rowIndex, columnName] = key.split("-")
        return {
          row_index: parseInt(rowIndex),
          column_name: columnName,
          new_value: value,
        }
      })

      const response = await cohortService.editNullValues(masterDataId, {
        edits: editsArray,
        enterprise_id: enterpriseId,
        user_id: userId,
        user_name: userName,
        description: `Edited ${editsArray.length} null value(s) in ${masterDataName}`,
      })

      setSuccess(true)
      // Call parent callback with new master data ID
      setTimeout(() => {
        onEditComplete(response.data.new_master_data_id, response.data.version)
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save edits")
    } finally {
      setSaving(false)
    }
  }

  const nullPercentage = totalRows > 0 ? ((rowsWithNulls / totalRows) * 100).toFixed(1) : 0

  return (
    <Dialog
      open={open}
      onClose={() => !isSaving && onClose()}
      maxWidth="xl"
      fullWidth
      PaperProps={{ sx: { height: "90vh" } }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Warning color="warning" />
            <Box>
              <Typography variant="h6">Review & Edit Missing Values</Typography>
              <Typography variant="caption" color="text.secondary">
                {masterDataName}
              </Typography>
            </Box>
          </Box>
          {!isSaving && (
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Summary */}
        <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={500} gutterBottom>
            {rowsWithNulls} records ({nullPercentage}%) have missing values
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
            {Object.entries(nullCountByColumn).map(([col, count]) => (
              <Chip
                key={col}
                label={`${col}: ${count}`}
                size="small"
                color="warning"
                variant="outlined"
              />
            ))}
          </Box>
        </Alert>

        {success && (
          <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
            <Typography variant="body2">
              Successfully saved {edits.size} edit(s). Creating new version...
            </Typography>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} action={
            <Button color="inherit" size="small" onClick={() => setError(null)}>
              Dismiss
            </Button>
          }>
            {error}
          </Alert>
        )}

        {/* Table */}
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : nullRecords.length === 0 ? (
          <Alert severity="info">
            <Typography variant="body2" fontWeight={500} gutterBottom>
              No records with missing values found
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total rows: {totalRows} | Rows with nulls reported: {rowsWithNulls}
            </Typography>
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Row</TableCell>
                  {allColumns.map((col) => {
                    const nullCount = actualNullCountsByColumn[col] || 0
                    return (
                    <TableCell key={col} sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>
                      {col}
                      {nullCount > 0 && (
                        <Chip
                          label={nullCount}
                          size="small"
                          color="warning"
                          sx={{ ml: 1, height: 16, fontSize: "0.65rem" }}
                        />
                      )}
                    </TableCell>
                  )})}
                </TableRow>
              </TableHead>
              <TableBody>
                {nullRecords.map((record, recordIdx) => {
                  if (recordIdx === 0) {
                    console.log("First record:", record)
                    console.log("Null columns for first record:", record.null_columns)
                  }
                  return (
                  <TableRow key={`row-${record.row_index}-${recordIdx}`} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{record.row_index + 1}</TableCell>
                    {allColumns.map((col, colIdx) => {
                      const originalValue = record.record_data[col]
                      // Use the backend's null_columns array to determine if this cell should be editable
                      const isNull = record.null_columns?.includes(col) ||
                                    originalValue === null ||
                                    originalValue === undefined ||
                                    originalValue === "" ||
                                    (typeof originalValue === "string" && originalValue.trim() === "")
                      const displayValue = getCellValue(record.row_index, col, originalValue)
                      const edited = isCellEdited(record.row_index, col)

                      // Log first record and first 3 columns to debug
                      if (recordIdx === 0 && colIdx < 3) {
                        console.log(`[Row 0, Col ${col}]:`, {
                          originalValue,
                          type: typeof originalValue,
                          isInNullColumns: record.null_columns?.includes(col),
                          isNull,
                          willRenderTextField: isNull,
                          nullColumnsArray: record.null_columns,
                          isSaving
                        })
                      }

                      return (
                        <TableCell
                          key={`cell-${recordIdx}-${col}`}
                          sx={{
                            bgcolor: isNull
                              ? edited
                                ? "rgba(76, 175, 80, 0.1)"
                                : "rgba(255, 152, 0, 0.1)"
                              : "transparent",
                            borderLeft: isNull ? "3px solid #ff9800" : "none",
                            position: "relative",
                          }}
                        >
                          {isNull ? (
                            <>
                              {recordIdx === 0 && colIdx < 3 && console.log(`Rendering TextField for ${col}`)}
                              <TextField
                                size="small"
                                fullWidth
                                value={displayValue}
                                onChange={(e) => {
                                  console.log("TextField onChange triggered for", col, "with value:", e.target.value)
                                  handleCellEdit(record.row_index, col, e.target.value)
                                }}
                                placeholder="Enter value"
                                disabled={isSaving}
                                variant="outlined"
                                inputProps={{
                                  readOnly: false,
                                  autoComplete: "off",
                                }}
                                sx={{
                                  "& .MuiInputBase-input": {
                                    fontSize: "0.85rem",
                                    py: 0.5,
                                    cursor: "text",
                                  },
                                }}
                              />
                            </>
                          ) : (
                            <>
                              {recordIdx === 0 && colIdx < 3 && console.log(`Rendering Typography for ${col}`)}
                              <Typography variant="body2" fontSize="0.85rem">
                                {displayValue || "-"}
                              </Typography>
                            </>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination info */}
        {!loading && hasMore && (
          <Box mt={2} textAlign="center">
            <Typography variant="caption" color="text.secondary">
              Showing first 100 records. More records available.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Box flex={1} display="flex" alignItems="center" gap={1}>
          {edits.size > 0 && (
            <Chip
              label={`${edits.size} edit(s) pending`}
              color="primary"
              size="small"
            />
          )}
        </Box>
        <Button onClick={onSkip} disabled={isSaving}>
          Skip & Continue with Missing Values
        </Button>
        <Button
          onClick={handleSaveEdits}
          variant="contained"
          disabled={isSaving || edits.size === 0 || success}
          startIcon={isSaving ? <CircularProgress size={16} /> : <Save />}
        >
          {isSaving ? "Saving..." : `Save ${edits.size} Edit(s) & Continue`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
