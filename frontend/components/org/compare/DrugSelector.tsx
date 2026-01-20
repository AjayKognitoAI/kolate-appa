"use client";
import React from "react";
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Chip,
  Stack,
  SelectChangeEvent,
} from "@mui/material";
import CustomFormLabel from "@/components/forms/theme-elements/CustomFormLabel";
import { Drug } from "@/utils/compare/compare-config";

interface DrugSelectorProps {
  label: string;
  value: string;
  onChange: (drugId: string) => void;
  drugs: Drug[];
  excludeDrugId?: string;
  placeholder?: string;
  helperText?: string;
}

const DrugSelector: React.FC<DrugSelectorProps> = ({
  label,
  value,
  onChange,
  drugs,
  excludeDrugId,
  placeholder = "Select a drug...",
  helperText,
}) => {
  const availableDrugs = excludeDrugId
    ? drugs.filter((d) => d.id !== excludeDrugId)
    : drugs;

  const selectedDrug = drugs.find((d) => d.id === value);

  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  const getCategoryColor = (
    category: Drug["category"]
  ): "primary" | "secondary" | "success" | "warning" => {
    switch (category) {
      case "CAR-T":
        return "primary";
      case "Antibody":
        return "secondary";
      case "Immunotherapy":
        return "success";
      case "Chemotherapy":
        return "warning";
      default:
        return "primary";
    }
  };

  return (
    <Box>
      <CustomFormLabel>{label}</CustomFormLabel>
      <FormControl fullWidth>
        <Select
          value={value}
          onChange={handleChange}
          displayEmpty
          sx={{
            minHeight: 44,
            "& .MuiSelect-select": {
              py: 1.5,
            },
          }}
          renderValue={(selected) => {
            if (!selected) {
              return (
                <Typography color="text.secondary">{placeholder}</Typography>
              );
            }
            return (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography>{selectedDrug?.shortName}</Typography>
                {selectedDrug && (
                  <Chip
                    size="small"
                    label={selectedDrug.category}
                    color={getCategoryColor(selectedDrug.category)}
                    sx={{ height: 20, fontSize: 11 }}
                  />
                )}
              </Stack>
            );
          }}
        >
          <MenuItem value="" disabled>
            <Typography color="text.secondary">{placeholder}</Typography>
          </MenuItem>
          {availableDrugs.map((drug) => (
            <MenuItem key={drug.id} value={drug.id}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                width="100%"
                spacing={2}
              >
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {drug.shortName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {drug.name}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    size="small"
                    label={drug.category}
                    color={getCategoryColor(drug.category)}
                    sx={{ height: 20, fontSize: 11 }}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ minWidth: 60 }}
                  >
                    {drug.indication}
                  </Typography>
                </Stack>
              </Stack>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export default DrugSelector;
