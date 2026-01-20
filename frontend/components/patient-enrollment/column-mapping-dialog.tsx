"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material"
import {
  CheckCircle,
  Warning,
  Close,
  AutoAwesome,
} from "@mui/icons-material"
import type { SchemaValidationResult } from "@/types/cohort.types"

interface ColumnMappingDialogProps {
  open: boolean
  onClose: () => void
  validation: SchemaValidationResult | null
  onConfirm: (mappings: Record<string, string>) => void
}

/**
 * Column Mapping Dialog
 *
 * Allows users to map missing required columns to existing dataset columns.
 * Provides smart suggestions based on case-insensitive matching and similarity.
 */
export function ColumnMappingDialog({
  open,
  onClose,
  validation,
  onConfirm
}: ColumnMappingDialogProps) {
  // Column mappings: missing column -> existing column
  const [mappings, setMappings] = useState<Record<string, string>>({})

  // Initialize mappings when validation changes
  useEffect(() => {
    if (!validation || validation.isValid) {
      setMappings({})
      return
    }

    // Auto-suggest mappings based on case-insensitive matches
    const autoMappings: Record<string, string> = {}

    validation.missingColumns.forEach(missingCol => {
      // Check if there's a case mismatch suggestion
      const caseMismatch = validation.caseMismatchColumns?.find(
        cm => cm.required === missingCol
      )

      if (caseMismatch && caseMismatch.available.length > 0) {
        // Auto-map to the first case-insensitive match
        autoMappings[missingCol] = caseMismatch.available[0]
      } else {
        // Find similar column names (fuzzy matching)
        const similar = findSimilarColumns(missingCol, validation.availableColumns)
        if (similar.length > 0) {
          autoMappings[missingCol] = similar[0]
        }
      }
    })

    setMappings(autoMappings)
  }, [validation])

  // Find similar column names using simple string similarity
  const findSimilarColumns = (target: string, available: string[]): string[] => {
    const targetLower = target.toLowerCase().replace(/[_-]/g, "")

    return available
      .map(col => ({
        col,
        score: calculateSimilarity(targetLower, col.toLowerCase().replace(/[_-]/g, ""))
      }))
      .filter(({ score }) => score > 0.5) // At least 50% similar
      .sort((a, b) => b.score - a.score)
      .map(({ col }) => col)
  }

  // Simple string similarity (Levenshtein-like)
  const calculateSimilarity = (s1: string, s2: string): number => {
    if (s1 === s2) return 1
    if (s1.includes(s2) || s2.includes(s1)) return 0.8

    const longer = s1.length > s2.length ? s1 : s2
    const shorter = s1.length > s2.length ? s2 : s1

    if (longer.length === 0) return 1

    let matches = 0
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++
    }

    return matches / longer.length
  }

  const handleMappingChange = (missingColumn: string, targetColumn: string) => {
    setMappings(prev => ({
      ...prev,
      [missingColumn]: targetColumn
    }))
  }

  const handleConfirm = () => {
    // Only include mappings that are actually set
    const validMappings = Object.entries(mappings)
      .filter(([_, target]) => target !== "")
      .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {})

    onConfirm(validMappings)
    onClose()
  }

  const allMapped = validation?.missingColumns.every(col => mappings[col] && mappings[col] !== "")

  if (!validation || validation.isValid) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="warning" />
            <Typography variant="h6">Column Mapping Required</Typography>
          </Box>
          <IconButton size="small" onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            Your dataset is missing <strong>{validation.missingColumns.length}</strong> required column{validation.missingColumns.length !== 1 ? 's' : ''}. Please map the required columns to your dataset columns below.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Your dataset has <strong>{validation.availableColumns.length}</strong> available columns. Use the dropdowns below to map each required column to an existing column in your dataset.
          </Typography>
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Available Columns in Your Dataset ({validation.availableColumns.length}):
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, p: 2, bgcolor: "grey.50", borderRadius: 1, maxHeight: 120, overflowY: "auto" }}>
            {validation.availableColumns.map(col => (
              <Chip key={col} label={col} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 1 }}>
          <Table size="medium">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ py: 2, width: "25%" }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Required Column
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 2, width: "15%" }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Suggestions
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 2, width: "45%" }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Map to Dataset Column
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ py: 2, width: "15%" }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Status
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {validation.missingColumns.map(missingCol => {
                const currentMapping = mappings[missingCol]
                const caseMismatch = validation.caseMismatchColumns?.find(
                  cm => cm.required === missingCol
                )
                const suggestions = caseMismatch?.available ||
                                  findSimilarColumns(missingCol, validation.availableColumns)

                return (
                  <TableRow
                    key={missingCol}
                    sx={{
                      "&:hover": { bgcolor: "action.hover" }
                    }}
                  >
                    <TableCell>
                      <Chip
                        label={missingCol}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                      {caseMismatch && (
                        <Tooltip title="Case-insensitive match found">
                          <Chip
                            label="Case Mismatch"
                            size="small"
                            color="info"
                            sx={{ ml: 1, fontSize: "0.7rem" }}
                          />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      {suggestions.length > 0 ? (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                          {suggestions.slice(0, 3).map((col, idx) => (
                            <Chip
                              key={col}
                              label={col}
                              size="small"
                              color={idx === 0 ? "success" : "default"}
                              variant="outlined"
                              sx={{ fontSize: "0.75rem" }}
                              icon={idx === 0 ? <AutoAwesome sx={{ fontSize: 14 }} /> : undefined}
                            />
                          ))}
                          {suggestions.length > 3 && (
                            <Typography variant="caption" color="text.secondary">
                              +{suggestions.length - 3} more
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No suggestions
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <InputLabel>Select column</InputLabel>
                        <Select
                          value={currentMapping || ""}
                          label="Select column"
                          onChange={(e) => handleMappingChange(missingCol, e.target.value)}
                          renderValue={(selected) => {
                            if (!selected) return <em>-- Select a column --</em>
                            // Check if this is a suggested column
                            const isSuggested = suggestions.includes(selected as string)
                            return (
                              <Box display="flex" alignItems="center" gap={1}>
                                {isSuggested && <AutoAwesome fontSize="small" sx={{ color: "primary.main" }} />}
                                <Typography component="span" fontWeight={isSuggested ? 600 : 400}>
                                  {selected}
                                </Typography>
                              </Box>
                            )
                          }}
                          sx={{
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: currentMapping ? "success.main" : "grey.300",
                              borderWidth: currentMapping ? 2 : 1
                            },
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: currentMapping ? "success.dark" : "primary.main"
                            }
                          }}
                        >
                          <MenuItem value="">
                            <em>-- Select a column --</em>
                          </MenuItem>
                          {suggestions.length > 0 && (
                            <>
                              <MenuItem disabled>
                                <Typography variant="caption" color="primary.main" fontWeight={600}>
                                  Suggested:
                                </Typography>
                              </MenuItem>
                              {suggestions.map(col => (
                                <MenuItem key={`suggested-${col}`} value={col}>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <AutoAwesome fontSize="small" sx={{ color: "primary.main" }} />
                                    <Typography fontWeight={600}>{col}</Typography>
                                  </Box>
                                </MenuItem>
                              ))}
                              {validation.availableColumns.length > suggestions.length && (
                                <MenuItem disabled>
                                  <Typography variant="caption" color="text.secondary">
                                    Other columns:
                                  </Typography>
                                </MenuItem>
                              )}
                            </>
                          )}
                          {validation.availableColumns
                            .filter(col => !suggestions.includes(col))
                            .map(col => (
                              <MenuItem key={col} value={col}>
                                {col}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="center">
                      {currentMapping ? (
                        <CheckCircle color="success" fontSize="small" />
                      ) : (
                        <Warning color="primary" fontSize="small" />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {!allMapped && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Please map all missing columns to proceed, or close this dialog and select a different dataset.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, display: "flex", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Progress:
          </Typography>
          <Chip
            label={`${Object.values(mappings).filter(v => v).length} / ${validation.missingColumns.length} mapped`}
            size="small"
            color={allMapped ? "success" : "default"}
            sx={{ fontWeight: 600 }}
          />
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={onClose} variant="outlined" color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color="primary"
            disabled={!allMapped}
            startIcon={<CheckCircle />}
          >
            Apply Mappings ({Object.values(mappings).filter(v => v).length}/{validation.missingColumns.length})
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}
