"use client";
import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Checkbox,
  Stack,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { ComparePatient, PATIENT_TABLE_COLUMNS } from "@/utils/compare/compare-config";

interface PatientPreviewTableProps {
  patients: ComparePatient[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onClearPatients?: () => void;
  maxHeight?: string;
}

const PatientPreviewTable: React.FC<PatientPreviewTableProps> = ({
  patients,
  selectedIds,
  onSelectionChange,
  onClearPatients,
  maxHeight = "400px",
}) => {
  const allSelected =
    patients.length > 0 && selectedIds.length === patients.length;
  const someSelected =
    selectedIds.length > 0 && selectedIds.length < patients.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(patients.map((p) => p.patient_id));
    }
  };

  const handleSelectOne = (patientId: string) => {
    if (selectedIds.includes(patientId)) {
      onSelectionChange(selectedIds.filter((id) => id !== patientId));
    } else {
      onSelectionChange([...selectedIds, patientId]);
    }
  };

  const getResponseColor = (response: string): "success" | "warning" | "error" | "info" => {
    switch (response) {
      case "CR":
        return "success";
      case "PR":
        return "info";
      case "SD":
        return "warning";
      case "PD":
        return "error";
      default:
        return "info";
    }
  };

  const columns = useMemo(() => PATIENT_TABLE_COLUMNS, []);

  if (patients.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 4,
          textAlign: "center",
          background: "var(--gray-50, #fafbfc)",
        }}
      >
        <Typography color="text.secondary">
          No patient data loaded. Click "Load Patient Data" to get started.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--gray-50, #fafbfc)",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle2" fontWeight={600}>
            Patient Data
          </Typography>
          <Chip
            size="small"
            label={`${patients.length} patients`}
            sx={{ height: 22 }}
          />
          {selectedIds.length > 0 && selectedIds.length !== patients.length && (
            <Chip
              size="small"
              label={`${selectedIds.length} selected`}
              color="primary"
              sx={{ height: 22 }}
            />
          )}
        </Stack>
        {onClearPatients && (
          <Tooltip title="Clear all patients">
            <IconButton size="small" onClick={onClearPatients}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Table */}
      <Box sx={{ overflowX: "auto" }}>
        <Box
          sx={{
            maxHeight,
            overflowY: "auto",
            minWidth: 900,
          }}
        >
          {/* Table Header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              px: 1,
              py: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
              background: "var(--gray-50, #fafbfc)",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <Checkbox
              size="small"
              checked={allSelected}
              indeterminate={someSelected}
              onChange={handleSelectAll}
              sx={{ mr: 1 }}
            />
            {columns.map((col) => (
              <Box
                key={col.field}
                sx={{
                  width: col.width || 100,
                  minWidth: col.width || 100,
                  px: 1,
                }}
              >
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  {col.headerName}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Table Body */}
          {patients.map((patient) => {
            const isSelected = selectedIds.includes(patient.patient_id);
            return (
              <Box
                key={patient.patient_id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 1,
                  py: 0.75,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                  background: isSelected ? "var(--indigo-50, #eef2ff)" : "transparent",
                  "&:hover": {
                    background: isSelected
                      ? "var(--indigo-100, #e0e7ff)"
                      : "var(--gray-50, #fafbfc)",
                  },
                }}
                onClick={() => handleSelectOne(patient.patient_id)}
              >
                <Checkbox
                  size="small"
                  checked={isSelected}
                  onChange={() => handleSelectOne(patient.patient_id)}
                  onClick={(e) => e.stopPropagation()}
                  sx={{ mr: 1 }}
                />
                {columns.map((col) => {
                  const value = patient[col.field];
                  return (
                    <Box
                      key={col.field}
                      sx={{
                        width: col.width || 100,
                        minWidth: col.width || 100,
                        px: 1,
                      }}
                    >
                      {col.field === "best_response" ? (
                        <Chip
                          size="small"
                          label={value}
                          color={getResponseColor(value)}
                          sx={{ height: 20, fontSize: 11 }}
                        />
                      ) : (
                        <Typography variant="body2" noWrap>
                          {value}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Paper>
  );
};

export default PatientPreviewTable;
