/**
 * DataTable Component
 *
 * Reusable table component with sorting, pagination, and action support.
 * Reduces boilerplate for data tables throughout the app.
 */

"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Typography,
  Checkbox,
  Tooltip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { IconDotsVertical, IconEdit, IconTrash, IconEye } from "@tabler/icons-react";
import { EmptyState, SkeletonTable, ErrorState } from "../states";

// =============================================================================
// Types
// =============================================================================

export interface Column<T> {
  id: string;
  label: string;
  width?: number | string;
  minWidth?: number;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface RowAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  show?: (row: T) => boolean;
  color?: "primary" | "error" | "warning";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  // State
  isLoading?: boolean;
  error?: Error | string | null;
  // Pagination
  page?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  // Sorting
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  // Selection
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  // Actions
  actions?: RowAction<T>[];
  // Empty state
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  // Misc
  stickyHeader?: boolean;
  maxHeight?: number | string;
  onRetry?: () => void;
}

// =============================================================================
// Styled Components
// =============================================================================

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontSize: 14,
  padding: "12px 16px",
}));

const StyledTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: theme.palette.grey[50],
  "& .MuiTableCell-head": {
    fontWeight: 600,
    color: theme.palette.text.secondary,
  },
}));

// =============================================================================
// Component
// =============================================================================

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  isLoading,
  error,
  page = 0,
  pageSize = 10,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 25, 50],
  sortBy,
  sortOrder = "asc",
  onSort,
  selectable,
  selectedIds = new Set(),
  onSelectionChange,
  actions,
  emptyTitle,
  emptyDescription,
  emptyAction,
  stickyHeader,
  maxHeight,
  onRetry,
}: DataTableProps<T>): React.ReactElement {
  // Action menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeRow, setActiveRow] = useState<T | null>(null);

  // Handlers
  const handleOpenMenu = useCallback((event: React.MouseEvent<HTMLElement>, row: T) => {
    setAnchorEl(event.currentTarget);
    setActiveRow(row);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
    setActiveRow(null);
  }, []);

  const handleSort = useCallback(
    (columnId: string) => {
      onSort?.(columnId);
    },
    [onSort]
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!onSelectionChange) return;
      if (checked) {
        const allIds = new Set(data.map((row) => String(row[keyField])));
        onSelectionChange(allIds);
      } else {
        onSelectionChange(new Set());
      }
    },
    [data, keyField, onSelectionChange]
  );

  const handleSelectRow = useCallback(
    (id: string, checked: boolean) => {
      if (!onSelectionChange) return;
      const newSelected = new Set(selectedIds);
      if (checked) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      onSelectionChange(newSelected);
    },
    [selectedIds, onSelectionChange]
  );

  // Loading state
  if (isLoading) {
    return <SkeletonTable rows={pageSize} columns={columns.length} />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyAction?.label}
        onAction={emptyAction?.onClick}
      />
    );
  }

  const isAllSelected = data.length > 0 && selectedIds.size === data.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < data.length;

  return (
    <Box>
      <TableContainer
        component={Paper}
        sx={{ maxHeight: maxHeight, boxShadow: "none", border: "1px solid", borderColor: "divider" }}
      >
        <Table stickyHeader={stickyHeader} size="small">
          <StyledTableHead>
            <TableRow>
              {selectable && (
                <StyledTableCell padding="checkbox">
                  <Checkbox
                    indeterminate={isSomeSelected}
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    inputProps={{ "aria-label": "Select all" }}
                  />
                </StyledTableCell>
              )}
              {columns.map((column) => (
                <StyledTableCell
                  key={column.id}
                  align={column.align}
                  style={{ width: column.width, minWidth: column.minWidth }}
                >
                  {column.sortable && onSort ? (
                    <TableSortLabel
                      active={sortBy === column.id}
                      direction={sortBy === column.id ? sortOrder : "asc"}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </StyledTableCell>
              ))}
              {actions && actions.length > 0 && (
                <StyledTableCell align="right" style={{ width: 60 }}>
                  Actions
                </StyledTableCell>
              )}
            </TableRow>
          </StyledTableHead>
          <TableBody>
            {data.map((row) => {
              const rowId = String(row[keyField]);
              const isSelected = selectedIds.has(rowId);

              return (
                <TableRow
                  key={rowId}
                  hover
                  selected={isSelected}
                  sx={{ "&:last-child td": { borderBottom: 0 } }}
                >
                  {selectable && (
                    <StyledTableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(rowId, e.target.checked)}
                        inputProps={{ "aria-label": `Select row ${rowId}` }}
                      />
                    </StyledTableCell>
                  )}
                  {columns.map((column) => (
                    <StyledTableCell key={column.id} align={column.align}>
                      {column.render ? column.render(row) : String(row[column.id] ?? "")}
                    </StyledTableCell>
                  ))}
                  {actions && actions.length > 0 && (
                    <StyledTableCell align="right">
                      <Tooltip title="Actions">
                        <IconButton
                          size="small"
                          onClick={(e) => handleOpenMenu(e, row)}
                          aria-label="Row actions"
                        >
                          <IconDotsVertical size={18} />
                        </IconButton>
                      </Tooltip>
                    </StyledTableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {onPageChange && totalItems !== undefined && (
        <TablePagination
          component="div"
          count={totalItems}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={pageSizeOptions}
          onPageChange={(_, newPage) => onPageChange(newPage)}
          onRowsPerPageChange={(e) => onPageSizeChange?.(parseInt(e.target.value, 10))}
          labelDisplayedRows={({ from, to, count }) =>
            `Showing ${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
          }
        />
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {actions?.map(
          (action) =>
            (!action.show || (activeRow && action.show(activeRow))) && (
              <MenuItem
                key={action.label}
                onClick={() => {
                  if (activeRow) action.onClick(activeRow);
                  handleCloseMenu();
                }}
                sx={{ color: action.color ? `${action.color}.main` : undefined }}
              >
                {action.icon && <Box mr={1} display="flex">{action.icon}</Box>}
                {action.label}
              </MenuItem>
            )
        )}
      </Menu>
    </Box>
  );
}

// =============================================================================
// Preset Actions
// =============================================================================

export const viewAction = <T extends Record<string, unknown>>(
  onClick: (row: T) => void
): RowAction<T> => ({
  label: "View",
  icon: <IconEye size={18} />,
  onClick,
});

export const editAction = <T extends Record<string, unknown>>(
  onClick: (row: T) => void
): RowAction<T> => ({
  label: "Edit",
  icon: <IconEdit size={18} />,
  onClick,
});

export const deleteAction = <T extends Record<string, unknown>>(
  onClick: (row: T) => void
): RowAction<T> => ({
  label: "Delete",
  icon: <IconTrash size={18} />,
  onClick,
  color: "error",
});

export default DataTable;
