"use client"

import { useState, useMemo } from "react"
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
  TextField,
  InputAdornment,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  ListItemText,
  Button,
} from "@mui/material"
import { Search, ViewColumn, FileDownload } from "@mui/icons-material"
import * as XLSX from "xlsx"
import type { PatientData } from "@/lib/screening-logic"
import type { ColumnType } from "@/types/cohort.types"

interface PatientDataGridProps {
  data: PatientData[]
  columns: Record<string, ColumnType>
}

type Order = "asc" | "desc"

export function PatientDataGrid({ data, columns }: PatientDataGridProps) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState("")
  const [orderBy, setOrderBy] = useState<string>("")
  const [order, setOrder] = useState<Order>("asc")
  const [visibleColumns, setVisibleColumns] = useState<string[]>(Object.keys(columns))
  const [columnAnchor, setColumnAnchor] = useState<null | HTMLElement>(null)

  const columnKeys = Object.keys(columns)

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data
    return data.filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }, [data, searchTerm])

  // Sort data
  const sortedData = useMemo(() => {
    if (!orderBy) return filteredData
    return [...filteredData].sort((a, b) => {
      const aVal = a[orderBy]
      const bVal = b[orderBy]

      if (columns[orderBy] === "number") {
        return order === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal)
      }

      return order === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })
  }, [filteredData, orderBy, order, columns])

  // Paginate data
  const paginatedData = useMemo(() => {
    return sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [sortedData, page, rowsPerPage])

  const handleSort = (column: string) => {
    const isAsc = orderBy === column && order === "asc"
    setOrder(isAsc ? "desc" : "asc")
    setOrderBy(column)
  }

  const handleColumnToggle = (column: string) => {
    setVisibleColumns((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column]
    )
  }

  const exportToExcel = () => {
    const exportData = filteredData.map((row) => {
      const filtered: Record<string, any> = {}
      visibleColumns.forEach((col) => {
        filtered[col] = row[col]
      })
      return filtered
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Patient Data")
    XLSX.writeFile(workbook, `patient-data-${Date.now()}.xlsx`)
  }

  if (data.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Typography color="text.secondary">No data to display</Typography>
      </Box>
    )
  }

  return (
    <Box>
      {/* Toolbar */}
      <Box p={2} display="flex" gap={2} alignItems="center" borderBottom="1px solid #ececf1">
        <TextField
          size="small"
          placeholder="Search patients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />

        <Box flex={1} />

        <IconButton size="small" onClick={(e) => setColumnAnchor(e.currentTarget)}>
          <ViewColumn />
        </IconButton>
        <Menu
          anchorEl={columnAnchor}
          open={Boolean(columnAnchor)}
          onClose={() => setColumnAnchor(null)}
        >
          {columnKeys.map((col) => (
            <MenuItem key={col} onClick={() => handleColumnToggle(col)}>
              <Checkbox checked={visibleColumns.includes(col)} size="small" />
              <ListItemText primary={col} />
            </MenuItem>
          ))}
        </Menu>

        <Button
          size="small"
          variant="outlined"
          startIcon={<FileDownload />}
          onClick={exportToExcel}
        >
          Export
        </Button>
      </Box>

      {/* Table */}
      <TableContainer sx={{ maxHeight: 500 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {visibleColumns.map((col) => (
                <TableCell
                  key={col}
                  sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}
                  sortDirection={orderBy === col ? order : false}
                >
                  <TableSortLabel
                    active={orderBy === col}
                    direction={orderBy === col ? order : "asc"}
                    onClick={() => handleSort(col)}
                  >
                    {col}
                    <Chip
                      label={columns[col]}
                      size="small"
                      sx={{ ml: 1, height: 18, fontSize: "0.65rem" }}
                      color={columns[col] === "number" ? "primary" : "default"}
                    />
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, idx) => (
              <TableRow key={idx} hover>
                {visibleColumns.map((col) => (
                  <TableCell key={col}>
                    {columns[col] === "number" ? (
                      <Typography variant="body2" fontFamily="monospace">
                        {row[col]}
                      </Typography>
                    ) : (
                      String(row[col] ?? "")
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
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
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Box>
  )
}
