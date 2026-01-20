"use client"

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
} from "@mui/material"
import { Warning } from "@mui/icons-material"
import type { DuplicateEntry } from "@/utils/patient-id-utils"

interface DuplicatesModalProps {
  open: boolean
  onClose: () => void
  columnName: string
  duplicates: DuplicateEntry[]
  totalRows: number
}

export function DuplicatesModal({
  open,
  onClose,
  columnName,
  duplicates,
  totalRows,
}: DuplicatesModalProps) {
  const totalDuplicateRows = duplicates.reduce((sum, dup) => sum + dup.count, 0)
  const duplicatePercentage = ((totalDuplicateRows / totalRows) * 100).toFixed(1)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Warning color="error" />
          Duplicate Values Detected
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            The column "{columnName}" contains duplicate values and cannot be used as a unique patient identifier.
          </Typography>
          <Typography variant="body2">
            Found {duplicates.length} duplicate value{duplicates.length !== 1 ? "s" : ""} affecting {totalDuplicateRows} rows ({duplicatePercentage}% of data).
          </Typography>
        </Alert>

        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Duplicate Values:
        </Typography>

        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #ececf1", maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}>Value</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#fafbfc" }} align="right">
                  Count
                </TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}>Row Numbers</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {duplicates.map((duplicate, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {String(duplicate.value)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={duplicate.count}
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {duplicate.indices.slice(0, 10).map((rowIndex) => (
                        <Chip
                          key={rowIndex}
                          label={rowIndex + 1}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.7rem" }}
                        />
                      ))}
                      {duplicate.indices.length > 10 && (
                        <Chip
                          label={`+${duplicate.indices.length - 10} more`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.7rem" }}
                        />
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box mt={3}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Recommended Actions:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mt: 1 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              Choose a different column that has unique values for each patient
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Clean your data to remove or resolve duplicate patient identifiers
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Create a new unique ID column if your data doesn't have one
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
