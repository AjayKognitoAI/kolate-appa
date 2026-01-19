"use client";
import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Checkbox,
  Button,
  Stack,
  InputAdornment,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { ComparePatient } from "@/utils/compare/compare-config";

interface PatientIdSelectorProps {
  patients: ComparePatient[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxHeight?: string;
}

const PatientIdSelector: React.FC<PatientIdSelectorProps> = ({
  patients,
  selectedIds,
  onChange,
  maxHeight = "300px",
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const query = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.patient_id.toLowerCase().includes(query) ||
        p.diagnosis.toLowerCase().includes(query) ||
        p.gender.toLowerCase().includes(query)
    );
  }, [patients, searchQuery]);

  const handleSelectAll = () => {
    const allFilteredIds = filteredPatients.map((p) => p.patient_id);
    const allSelected = allFilteredIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      // Deselect all filtered
      onChange(selectedIds.filter((id) => !allFilteredIds.includes(id)));
    } else {
      // Select all filtered
      const newIds = new Set([...selectedIds, ...allFilteredIds]);
      onChange(Array.from(newIds));
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleToggle = (patientId: string) => {
    if (selectedIds.includes(patientId)) {
      onChange(selectedIds.filter((id) => id !== patientId));
    } else {
      onChange([...selectedIds, patientId]);
    }
  };

  const allFilteredSelected =
    filteredPatients.length > 0 &&
    filteredPatients.every((p) => selectedIds.includes(p.patient_id));

  const someFilteredSelected =
    filteredPatients.some((p) => selectedIds.includes(p.patient_id)) &&
    !allFilteredSelected;

  if (patients.length === 0) {
    return null;
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
          background: "var(--gray-50, #fafbfc)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={1.5}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle2" fontWeight={600}>
              Patient Selection
            </Typography>
            {selectedIds.length > 0 && (
              <Chip
                size="small"
                label={`${selectedIds.length} selected`}
                color="primary"
                sx={{ height: 22 }}
              />
            )}
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={handleSelectAll}>
              {allFilteredSelected ? "Deselect All" : "Select All"}
            </Button>
            {selectedIds.length > 0 && (
              <Button size="small" color="error" onClick={handleClearAll}>
                Clear
              </Button>
            )}
          </Stack>
        </Stack>

        <TextField
          size="small"
          fullWidth
          placeholder="Search by ID, diagnosis, or gender..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              background: "#fff",
            },
          }}
        />
      </Box>

      {/* List */}
      <Box sx={{ maxHeight, overflowY: "auto" }}>
        {filteredPatients.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No patients match your search
            </Typography>
          </Box>
        ) : (
          filteredPatients.map((patient) => {
            const isSelected = selectedIds.includes(patient.patient_id);
            return (
              <Box
                key={patient.patient_id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  py: 1,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                  background: isSelected
                    ? "var(--indigo-50, #eef2ff)"
                    : "transparent",
                  "&:hover": {
                    background: isSelected
                      ? "var(--indigo-100, #e0e7ff)"
                      : "var(--gray-50, #fafbfc)",
                  },
                }}
                onClick={() => handleToggle(patient.patient_id)}
              >
                <Checkbox
                  size="small"
                  checked={isSelected}
                  onChange={() => handleToggle(patient.patient_id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <Box sx={{ ml: 1, flex: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {patient.patient_id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {patient.age}y {patient.gender} | {patient.diagnosis} | ECOG{" "}
                    {patient.ecog}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={patient.best_response}
                  sx={{ height: 20, fontSize: 11 }}
                />
              </Box>
            );
          })
        )}
      </Box>

      {/* Footer */}
      {selectedIds.length === 0 && patients.length > 0 && (
        <Box
          sx={{
            px: 2,
            py: 1,
            background: "var(--gray-50, #fafbfc)",
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            All {patients.length} patients will be included in comparison
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default PatientIdSelector;
