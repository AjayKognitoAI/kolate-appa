"use client";
import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Slider,
  Chip,
  Button,
  Stack,
  Collapse,
  IconButton,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  FilterState,
  COMPARISON_FILTERS,
  DEFAULT_FILTER_STATE,
} from "@/utils/compare/compare-config";

interface ComparisonFilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  patientCount?: number;
  filteredCount?: number;
}

const ComparisonFilterPanel: React.FC<ComparisonFilterPanelProps> = ({
  filters,
  onFiltersChange,
  patientCount = 0,
  filteredCount = 0,
}) => {
  const [expanded, setExpanded] = useState(true);

  const hasActiveFilters = () => {
    return (
      filters.ldh[0] !== DEFAULT_FILTER_STATE.ldh[0] ||
      filters.ldh[1] !== DEFAULT_FILTER_STATE.ldh[1] ||
      filters.age[0] !== DEFAULT_FILTER_STATE.age[0] ||
      filters.age[1] !== DEFAULT_FILTER_STATE.age[1] ||
      filters.ecog.length > 0 ||
      filters.ipi.length > 0 ||
      filters.gender.length > 0 ||
      filters.priorLines[0] !== DEFAULT_FILTER_STATE.priorLines[0] ||
      filters.priorLines[1] !== DEFAULT_FILTER_STATE.priorLines[1]
    );
  };

  const handleRangeChange = (
    filterId: "ldh" | "age" | "priorLines",
    value: number | number[]
  ) => {
    onFiltersChange({
      ...filters,
      [filterId]: value as [number, number],
    });
  };

  const handleMultiSelectChange = (
    filterId: "ecog" | "ipi" | "gender",
    value: string
  ) => {
    const currentValues = filters[filterId];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    onFiltersChange({
      ...filters,
      [filterId]: newValues,
    });
  };

  const handleReset = () => {
    onFiltersChange(DEFAULT_FILTER_STATE);
  };

  const filterConfig = COMPARISON_FILTERS;

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--gray-50, #fafbfc)",
          borderBottom: expanded ? "1px solid" : "none",
          borderColor: "divider",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <FilterAltIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight={600}>
            Filters
          </Typography>
          {hasActiveFilters() && (
            <Chip
              size="small"
              label="Active"
              color="primary"
              sx={{ height: 20, fontSize: 11 }}
            />
          )}
          {patientCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              ({filteredCount} of {patientCount} patients)
            </Typography>
          )}
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          {hasActiveFilters() && (
            <Button
              size="small"
              startIcon={<RestartAltIcon fontSize="small" />}
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
            >
              Reset
            </Button>
          )}
          <IconButton size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Stack>
      </Box>

      {/* Filter Content */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          <Stack spacing={3}>
            {/* LDH Range */}
            <Box>
              <Typography variant="body2" fontWeight={500} mb={1}>
                LDH Level (U/L)
              </Typography>
              <Box sx={{ px: 1 }}>
                <Slider
                  value={filters.ldh}
                  onChange={(_, v) => handleRangeChange("ldh", v)}
                  min={0}
                  max={1000}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 0, label: "0" },
                    { value: 500, label: "500" },
                    { value: 1000, label: "1000" },
                  ]}
                />
              </Box>
            </Box>

            {/* Age Range */}
            <Box>
              <Typography variant="body2" fontWeight={500} mb={1}>
                Age (years)
              </Typography>
              <Box sx={{ px: 1 }}>
                <Slider
                  value={filters.age}
                  onChange={(_, v) => handleRangeChange("age", v)}
                  min={18}
                  max={90}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 18, label: "18" },
                    { value: 50, label: "50" },
                    { value: 90, label: "90" },
                  ]}
                />
              </Box>
            </Box>

            {/* Prior Lines Range */}
            <Box>
              <Typography variant="body2" fontWeight={500} mb={1}>
                Prior Lines of Therapy
              </Typography>
              <Box sx={{ px: 1 }}>
                <Slider
                  value={filters.priorLines}
                  onChange={(_, v) => handleRangeChange("priorLines", v)}
                  min={0}
                  max={10}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 0, label: "0" },
                    { value: 5, label: "5" },
                    { value: 10, label: "10" },
                  ]}
                />
              </Box>
            </Box>

            {/* ECOG Status */}
            <Box>
              <Typography variant="body2" fontWeight={500} mb={1}>
                ECOG Performance Status
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {["0", "1", "2", "3", "4"].map((value) => (
                  <Chip
                    key={value}
                    label={`ECOG ${value}`}
                    onClick={() => handleMultiSelectChange("ecog", value)}
                    variant={filters.ecog.includes(value) ? "filled" : "outlined"}
                    color={filters.ecog.includes(value) ? "primary" : "default"}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
              </Stack>
            </Box>

            {/* IPI Score */}
            <Box>
              <Typography variant="body2" fontWeight={500} mb={1}>
                IPI Score
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {["0-1", "2", "3", "4-5"].map((value) => (
                  <Chip
                    key={value}
                    label={value}
                    onClick={() => handleMultiSelectChange("ipi", value)}
                    variant={filters.ipi.includes(value) ? "filled" : "outlined"}
                    color={filters.ipi.includes(value) ? "primary" : "default"}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Gender */}
            <Box>
              <Typography variant="body2" fontWeight={500} mb={1}>
                Gender
              </Typography>
              <FormGroup row>
                {["Male", "Female"].map((value) => (
                  <FormControlLabel
                    key={value}
                    control={
                      <Checkbox
                        size="small"
                        checked={filters.gender.includes(value)}
                        onChange={() => handleMultiSelectChange("gender", value)}
                      />
                    }
                    label={value}
                  />
                ))}
              </FormGroup>
            </Box>
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default ComparisonFilterPanel;
