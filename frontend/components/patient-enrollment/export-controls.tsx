"use client"

import { useState } from "react"
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material"
import { FileDownload, DataObject, TableChart, Description } from "@mui/icons-material"
import * as XLSX from "xlsx"
import type { PatientData } from "@/lib/screening-logic"

interface ExportControlsProps {
  data: PatientData[]
}

export function ExportControls({ data }: ExportControlsProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const exportAsJSON = () => {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `filtered-patients-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setAnchorEl(null)
  }

  const exportAsCSV = () => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvRows = [headers.join(","), ...data.map((row) => headers.map((header) => row[header]).join(","))]
    const csv = csvRows.join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `filtered-patients-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setAnchorEl(null)
  }

  const exportAsExcel = () => {
    if (data.length === 0) return

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Patient Data")

    // Auto-size columns
    const maxWidth = 20
    const colWidths = Object.keys(data[0]).map((key) => ({
      wch: Math.min(maxWidth, Math.max(key.length, ...data.map((row) => String(row[key] || "").length)))
    }))
    worksheet["!cols"] = colWidths

    XLSX.writeFile(workbook, `filtered-patients-${Date.now()}.xlsx`)
    setAnchorEl(null)
  }

  return (
    <>
      <Button
        variant="contained"
        size="small"
        startIcon={<FileDownload />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        Export
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={exportAsJSON}>
          <ListItemIcon>
            <DataObject fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as JSON</ListItemText>
        </MenuItem>
        <MenuItem onClick={exportAsCSV}>
          <ListItemIcon>
            <TableChart fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as CSV</ListItemText>
        </MenuItem>
        <MenuItem onClick={exportAsExcel}>
          <ListItemIcon>
            <Description fontSize="small" sx={{ color: "success.main" }} />
          </ListItemIcon>
          <ListItemText>Export as Excel (.xlsx)</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
