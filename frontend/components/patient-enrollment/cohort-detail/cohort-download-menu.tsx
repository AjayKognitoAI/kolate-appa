"use client"

import { useState } from "react"
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
} from "@mui/material"
import {
  FileDownload,
  DataObject,
  TableChart,
  Description,
  FilterList,
} from "@mui/icons-material"
import * as XLSX from "xlsx"
import type { PatientData } from "@/lib/screening-logic"

interface CohortDownloadMenuProps {
  cohortId: string
  cohortName: string
  masterData: PatientData[]
  screenedData: PatientData[]
}

export function CohortDownloadMenu({
  cohortName,
  masterData,
  screenedData,
}: CohortDownloadMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [masterAnchorEl, setMasterAnchorEl] = useState<null | HTMLElement>(null)

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleMasterClose = () => {
    setMasterAnchorEl(null)
  }

  // Client-side export functions
  const exportAsJSON = (data: PatientData[], type: "master" | "screened") => {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${cohortName}_${type}_data_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    if (type === "screened") {
      handleClose()
    } else {
      handleMasterClose()
    }
  }

  const exportAsCSV = (data: PatientData[], type: "master" | "screened") => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header]
            // Escape commas and quotes
            const strValue = String(value ?? "")
            if (strValue.includes(",") || strValue.includes('"')) {
              return `"${strValue.replace(/"/g, '""')}"`
            }
            return strValue
          })
          .join(",")
      ),
    ]
    const csv = csvRows.join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${cohortName}_${type}_data_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    if (type === "screened") {
      handleClose()
    } else {
      handleMasterClose()
    }
  }

  const exportAsExcel = (data: PatientData[], type: "master" | "screened") => {
    if (data.length === 0) return

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      type === "master" ? "Master Data" : "Screened Data"
    )

    // Auto-size columns
    const maxWidth = 25
    const colWidths = Object.keys(data[0]).map((key) => ({
      wch: Math.min(
        maxWidth,
        Math.max(key.length, ...data.map((row) => String(row[key] || "").length))
      ),
    }))
    worksheet["!cols"] = colWidths

    XLSX.writeFile(workbook, `${cohortName}_${type}_data_${Date.now()}.xlsx`)
    if (type === "screened") {
      handleClose()
    } else {
      handleMasterClose()
    }
  }

  return (
    <>
      {/* Filtered Data Download Button */}
      <Button
        variant="contained"
        size="small"
        startIcon={<FileDownload />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ textTransform: "none" }}
      >
        Download Filtered Data
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{ sx: { minWidth: 280 } }}
      >
        <Box px={2} py={1}>
          <Typography variant="overline" color="primary.main" fontWeight={600}>
            Filtered Patients ({screenedData.length.toLocaleString()} records)
          </Typography>
        </Box>

        <MenuItem onClick={() => exportAsCSV(screenedData, "screened")}>
          <ListItemIcon>
            <TableChart fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Download as CSV"
            secondary="Comma-separated values"
          />
        </MenuItem>

        <MenuItem onClick={() => exportAsExcel(screenedData, "screened")}>
          <ListItemIcon>
            <Description fontSize="small" sx={{ color: "primary.main" }} />
          </ListItemIcon>
          <ListItemText
            primary="Download as Excel"
            secondary=".xlsx format"
          />
        </MenuItem>

        <MenuItem onClick={() => exportAsJSON(screenedData, "screened")}>
          <ListItemIcon>
            <DataObject fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Download as JSON"
            secondary="JavaScript Object Notation"
          />
        </MenuItem>
      </Menu>

      {/* Master Data Download Button */}
      <Button
        variant="outlined"
        size="small"
        startIcon={<FileDownload />}
        onClick={(e) => setMasterAnchorEl(e.currentTarget)}
        sx={{ textTransform: "none" }}
      >
        View/Download Master Data
      </Button>

      <Menu
        anchorEl={masterAnchorEl}
        open={Boolean(masterAnchorEl)}
        onClose={handleMasterClose}
        PaperProps={{ sx: { minWidth: 280 } }}
      >
        <Box px={2} py={1}>
          <Typography variant="overline" color="text.secondary" fontWeight={600}>
            All Master Data ({masterData.length.toLocaleString()} records)
          </Typography>
        </Box>

        <MenuItem onClick={() => exportAsCSV(masterData, "master")}>
          <ListItemIcon>
            <TableChart fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Download as CSV"
            secondary="Comma-separated values"
          />
        </MenuItem>

        <MenuItem onClick={() => exportAsExcel(masterData, "master")}>
          <ListItemIcon>
            <Description fontSize="small" sx={{ color: "success.main" }} />
          </ListItemIcon>
          <ListItemText
            primary="Download as Excel"
            secondary=".xlsx format"
          />
        </MenuItem>

        <MenuItem onClick={() => exportAsJSON(masterData, "master")}>
          <ListItemIcon>
            <DataObject fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Download as JSON"
            secondary="JavaScript Object Notation"
          />
        </MenuItem>
      </Menu>
    </>
  )
}
