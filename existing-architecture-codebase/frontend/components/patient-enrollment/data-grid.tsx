"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Button,
} from "@mui/material"
import { Visibility, KeyboardArrowLeft, KeyboardArrowRight } from "@mui/icons-material"
import type { PatientData } from "@/lib/screening-logic"
import type { ColumnType } from "@/types/cohort.types"

interface DataGridProps {
  data: PatientData[]
  columns: Record<string, ColumnType>
}

export function DataGrid({ data, columns }: DataGridProps) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [orderBy, setOrderBy] = useState<string | null>(null)
  const [order, setOrder] = useState<"asc" | "desc">("asc")
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({})
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  useEffect(() => {
    setVisibleColumns(
      Object.keys(columns).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {},
      ),
    )
  }, [columns])

  const sortedData = useMemo(() => {
    if (!orderBy) return data

    return [...data].sort((a, b) => {
      const aVal = a[orderBy]
      const bVal = b[orderBy]

      if (typeof aVal === "number" && typeof bVal === "number") {
        return order === "asc" ? aVal - bVal : bVal - aVal
      }

      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()

      return order === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    })
  }, [data, orderBy, order])

  const handleSort = (column: string) => {
    const isAsc = orderBy === column && order === "asc"
    setOrder(isAsc ? "desc" : "asc")
    setOrderBy(column)
  }

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const toggleColumn = (column: string) => {
    setVisibleColumns((prev) => ({ ...prev, [column]: !prev[column] }))
  }

  const visibleColumnKeys = Object.keys(columns).filter(
    (key) => visibleColumns[key],
  )

  const paginatedData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  if (data.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height={256}
      >
        <Typography color="text.secondary">No data to display</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        p={2}
        borderBottom="1px solid #ececf1"
      >
        <Typography variant="body2" color="text.secondary">
          Showing {page * rowsPerPage + 1}-
          {Math.min((page + 1) * rowsPerPage, sortedData.length)} of{" "}
          {sortedData.length} patients
        </Typography>

        <Button
          variant="outlined"
          size="small"
          startIcon={<Visibility />}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          Columns
        </Button>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          {Object.keys(columns).map((column) => (
            <MenuItem key={column} dense>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={visibleColumns[column] || false}
                    onChange={() => toggleColumn(column)}
                    size="small"
                  />
                }
                label={column}
              />
            </MenuItem>
          ))}
        </Menu>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#fafbfc" }}>
              {visibleColumnKeys.map((column) => (
                <TableCell
                  key={column}
                  sortDirection={orderBy === column ? order : false}
                  sx={{ fontWeight: 600 }}
                >
                  <TableSortLabel
                    active={orderBy === column}
                    direction={orderBy === column ? order : "asc"}
                    onClick={() => handleSort(column)}
                  >
                    {column}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedData.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                hover
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                {visibleColumnKeys.map((column) => (
                  <TableCell key={column}>{String(row[column])}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={sortedData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  )
}
