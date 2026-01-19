"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Alert,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  LinearProgress,
  Tooltip,
  TextField,
  InputAdornment,
  Menu,
  Snackbar,
} from "@mui/material"
import {
  FilterList,
  AutoAwesome,
  CheckCircle,
  Warning,
  Error,
  ArrowForward,
  Close,
  Search,
  BookmarkBorder,
  Info,
  Edit,
  Refresh,
  Delete,
  MoreVert,
} from "@mui/icons-material"
import cohortService from "@/services/patient-enrollment/cohort-service"
import type {
  SavedFilterApi,
  FilterGroup,
  ColumnMapping,
  FilterMappingResponse,
  ColumnType,
} from "@/types/cohort.types"

interface SavedFilterSelectorProps {
  targetColumns: string[]
  columnTypes: Record<string, ColumnType>
  onFilterSelected: (filter: FilterGroup, mappingInfo?: FilterMappingResponse) => void
  onCancel?: () => void
  disabled?: boolean
}

export function SavedFilterSelector({
  targetColumns,
  columnTypes,
  onFilterSelected,
  onCancel,
  disabled = false,
}: SavedFilterSelectorProps) {
  const { data: session } = useSession()
  const enterpriseId = session?.user?.orgId || ""

  // State for filters list
  const [filters, setFilters] = useState<SavedFilterApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // State for selection
  const [selectedFilter, setSelectedFilter] = useState<SavedFilterApi | null>(null)

  // State for AI mapping
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false)
  const [mappingResult, setMappingResult] = useState<FilterMappingResponse | null>(null)
  const [isMappingLoading, setIsMappingLoading] = useState(false)
  const [mappingError, setMappingError] = useState<string | null>(null)

  // State for filter menu
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuFilter, setMenuFilter] = useState<SavedFilterApi | null>(null)

  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [filterToDelete, setFilterToDelete] = useState<SavedFilterApi | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // State for snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: "success" | "error"
  }>({ open: false, message: "", severity: "success" })

  // Fetch saved filters on mount
  useEffect(() => {
    if (enterpriseId) {
      fetchFilters()
    }
  }, [enterpriseId])

  const fetchFilters = async () => {
    if (!enterpriseId) return
    try {
      setLoading(true)
      setError(null)
      const response = await cohortService.getFilters({
        enterprise_id: enterpriseId,
        include_templates: true
      })
      setFilters(response.data.content)
    } catch (err) {
      setError("Failed to load saved filters")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Filter the list based on search
  const filteredFilters = useMemo(() => {
    if (!searchQuery.trim()) return filters
    const query = searchQuery.toLowerCase()
    return filters.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        (f.description && f.description.toLowerCase().includes(query))
    )
  }, [filters, searchQuery])

  // Extract columns from a filter
  const extractFilterColumns = (filter: FilterGroup): string[] => {
    const columns = new Set<string>()
    const extractFromRules = (rules: FilterGroup["rules"]) => {
      for (const rule of rules) {
        if ("logic" in rule && "rules" in rule) {
          extractFromRules((rule as FilterGroup).rules)
        } else if ("field" in rule) {
          columns.add((rule as { field: string }).field)
        }
      }
    }
    extractFromRules(filter.rules)
    return Array.from(columns)
  }

  // Count rules in a filter
  const countRules = (filter: FilterGroup): number => {
    let count = 0
    const countFromRules = (rules: FilterGroup["rules"]) => {
      for (const rule of rules) {
        if ("logic" in rule && "rules" in rule) {
          countFromRules((rule as FilterGroup).rules)
        } else {
          count++
        }
      }
    }
    countFromRules(filter.rules)
    return count
  }

  // Handle filter selection
  const handleFilterSelect = async (filter: SavedFilterApi) => {
    setSelectedFilter(filter)

    // Check if columns match directly
    const filterColumns = extractFilterColumns(filter.filter)
    const targetColumnSet = new Set(targetColumns)
    const allColumnsMatch = filterColumns.every((col) => targetColumnSet.has(col))

    if (allColumnsMatch) {
      // Columns match - no mapping needed
      onFilterSelected(filter.filter)
    } else {
      // Columns don't match - open mapping dialog
      setMappingDialogOpen(true)
      await performAIMapping(filter)
    }
  }

  // Perform AI column mapping
  // NOTE: AI column mapping is not available in current API version
  const performAIMapping = async (_filter: SavedFilterApi) => {
    setIsMappingLoading(true)
    setMappingError(null)
    setMappingResult(null)

    // Simulate a brief delay then show error
    await new Promise((resolve) => setTimeout(resolve, 500))
    setMappingError(
      "AI column mapping is not available in the current API version. " +
      "Please manually adjust the filter columns to match your data."
    )
    setIsMappingLoading(false)
  }

  // Get confidence color
  const getConfidenceColor = (confidence: number): "success" | "warning" | "error" => {
    if (confidence >= 0.8) return "success"
    if (confidence >= 0.5) return "warning"
    return "error"
  }

  // Get confidence icon
  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle color="success" fontSize="small" />
    if (confidence >= 0.5) return <Warning color="warning" fontSize="small" />
    return <Error color="error" fontSize="small" />
  }

  // Apply the mapped filter
  const handleApplyMappedFilter = () => {
    if (mappingResult) {
      onFilterSelected(mappingResult.adaptedFilter, mappingResult)
      setMappingDialogOpen(false)
    }
  }

  // Close mapping dialog
  const handleCloseMappingDialog = () => {
    setMappingDialogOpen(false)
    setMappingResult(null)
    setMappingError(null)
    setSelectedFilter(null)
  }

  // Handle filter menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, filter: SavedFilterApi) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setMenuFilter(filter)
  }

  // Handle filter menu close
  const handleMenuClose = () => {
    setMenuAnchor(null)
    setMenuFilter(null)
  }

  // Handle delete filter
  const handleDeleteClick = () => {
    if (menuFilter) {
      setFilterToDelete(menuFilter)
      setDeleteDialogOpen(true)
      handleMenuClose()
    }
  }

  const handleDeleteConfirm = async () => {
    if (!filterToDelete) return

    setIsDeleting(true)
    try {
      await cohortService.deleteFilter(filterToDelete.id)
      setSnackbar({
        open: true,
        message: `Filter "${filterToDelete.name}" deleted successfully`,
        severity: "success",
      })
      // Refresh the filters list
      await fetchFilters()
      setDeleteDialogOpen(false)
      setFilterToDelete(null)
    } catch (err) {
      const errorMessage = (err as Error)?.message || "Unknown error"
      setSnackbar({
        open: true,
        message: `Failed to delete filter: ${errorMessage}`,
        severity: "error",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setFilterToDelete(null)
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" ml={2}>
          Loading saved filters...
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={fetchFilters}>
          Retry
        </Button>
      }>
        {error}
      </Alert>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <FilterList color="primary" />
          <Typography variant="h6">Select Saved Filter</Typography>
        </Box>
        {onCancel && (
          <IconButton onClick={onCancel} size="small">
            <Close />
          </IconButton>
        )}
      </Box>

      {/* Info Alert */}
      <Alert severity="info" icon={<AutoAwesome />} sx={{ mb: 2 }}>
        Select a saved filter to apply. If the column names don&apos;t match your data,
        AI will automatically map them for you.
      </Alert>

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search filters..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* Filters List */}
      {filteredFilters.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
          <FilterList sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography color="text.secondary">
            {searchQuery ? "No filters match your search" : "No saved filters available"}
          </Typography>
        </Paper>
      ) : (
        <List sx={{ maxHeight: 400, overflow: "auto" }}>
          {filteredFilters.map((filter) => {
            const ruleCount = countRules(filter.filter)
            const filterColumns = extractFilterColumns(filter.filter)

            return (
              <Paper
                key={filter.id}
                variant="outlined"
                sx={{
                  mb: 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.6 : 1,
                  "&:hover": disabled ? {} : {
                    borderColor: "primary.main",
                    bgcolor: "action.hover",
                  },
                }}
                onClick={() => !disabled && handleFilterSelect(filter)}
              >
                <ListItem>
                  <ListItemIcon>
                    {filter.is_template ? (
                      <Tooltip title="Template filter">
                        <BookmarkBorder color="primary" />
                      </Tooltip>
                    ) : (
                      <FilterList color="action" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1" fontWeight={500}>
                          {filter.name}
                        </Typography>
                        {filter.is_template && (
                          <Chip label="Template" size="small" color="primary" variant="outlined" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        {filter.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {filter.description}
                          </Typography>
                        )}
                        <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
                          <Chip
                            label={`${ruleCount} rule${ruleCount !== 1 ? "s" : ""}`}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={`${filterColumns.length} column${filterColumns.length !== 1 ? "s" : ""}`}
                            size="small"
                            variant="outlined"
                          />
                          {filter.usage_count > 0 && (
                            <Chip
                              label={`Used ${filter.usage_count}x`}
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Tooltip title="More options">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => handleMenuOpen(e, filter)}
                          disabled={disabled}
                        >
                          <MoreVert />
                        </IconButton>
                      </Tooltip>
                      <ArrowForward color="action" />
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              </Paper>
            )
          })}
        </List>
      )}

      {/* Filter Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete Filter</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Filter?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the filter &quot;{filterToDelete?.name}&quot;?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : <Delete />}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* AI Mapping Dialog */}
      <Dialog
        open={mappingDialogOpen}
        onClose={handleCloseMappingDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AutoAwesome color="primary" />
            <Typography variant="h6">AI Column Mapping</Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {isMappingLoading ? (
            <Box textAlign="center" py={4}>
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography variant="body1" gutterBottom>
                Analyzing column names and mapping filter...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Using AI to find the best matches between filter columns and your data
              </Typography>
            </Box>
          ) : mappingError ? (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<Refresh />}
                  onClick={() => selectedFilter && performAIMapping(selectedFilter)}
                >
                  Retry
                </Button>
              }
            >
              {mappingError}
            </Alert>
          ) : mappingResult ? (
            <Box>
              {/* Summary */}
              <Alert
                severity={
                  mappingResult.unmappedFields.length === 0
                    ? "success"
                    : mappingResult.unmappedFields.length < mappingResult.mappings.length / 2
                    ? "warning"
                    : "error"
                }
                sx={{ mb: 3 }}
              >
                {mappingResult.unmappedFields.length === 0 ? (
                  "All filter columns were successfully mapped to your data columns!"
                ) : (
                  `${mappingResult.mappings.length - mappingResult.unmappedFields.length} of ${mappingResult.mappings.length} columns mapped. ${mappingResult.unmappedFields.length} column(s) could not be mapped.`
                )}
              </Alert>

              {/* Mapping Table */}
              <Typography variant="subtitle2" gutterBottom>
                Column Mappings
              </Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Filter Column</TableCell>
                    <TableCell align="center">Mapped To</TableCell>
                    <TableCell>Your Data Column</TableCell>
                    <TableCell align="center">Confidence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mappingResult.mappings.map((mapping, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {mapping.originalField}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {mapping.mappedField ? (
                          <ArrowForward color="success" fontSize="small" />
                        ) : (
                          <Close color="error" fontSize="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        {mapping.mappedField ? (
                          <Typography variant="body2" fontFamily="monospace" color="success.main">
                            {mapping.mappedField}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="error">
                            Not mapped
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {mapping.mappedField && (
                          <Box display="flex" alignItems="center" gap={0.5}>
                            {getConfidenceIcon(mapping.confidence)}
                            <Typography
                              variant="body2"
                              color={`${getConfidenceColor(mapping.confidence)}.main`}
                            >
                              {Math.round(mapping.confidence * 100)}%
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Unmapped Fields Warning */}
              {mappingResult.unmappedFields.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={500} gutterBottom>
                    Unmapped columns will be removed from the filter:
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {mappingResult.unmappedFields.map((field) => (
                      <Chip
                        key={field}
                        label={field}
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Alert>
              )}

              {/* Alternative Suggestions */}
              {mappingResult.mappings.some((m) => m.suggestions.length > 1) && (
                <Collapse in>
                  <Typography variant="subtitle2" gutterBottom>
                    Alternative Suggestions
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    If the automatic mapping is incorrect, consider these alternatives:
                  </Typography>
                  {mappingResult.mappings
                    .filter((m) => m.suggestions.length > 1)
                    .map((mapping, idx) => (
                      <Box key={idx} display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Typography variant="body2" fontFamily="monospace">
                          {mapping.originalField}:
                        </Typography>
                        {mapping.suggestions.slice(0, 3).map((suggestion, sIdx) => (
                          <Chip
                            key={sIdx}
                            label={suggestion}
                            size="small"
                            variant={suggestion === mapping.mappedField ? "filled" : "outlined"}
                            color={suggestion === mapping.mappedField ? "primary" : "default"}
                          />
                        ))}
                      </Box>
                    ))}
                </Collapse>
              )}
            </Box>
          ) : null}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseMappingDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApplyMappedFilter}
            disabled={!mappingResult || mappingResult.unmappedFields.length === mappingResult.mappings.length}
            startIcon={<CheckCircle />}
          >
            Apply Mapped Filter
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default SavedFilterSelector
