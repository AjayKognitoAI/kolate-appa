"use client";
import React from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  IconButton,
  Chip,
  Tooltip,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Drug } from "@/utils/compare/compare-config";

interface DrugIteratorControlsProps {
  drugs: Drug[];
  currentDrugId: string;
  onDrugChange: (drugId: string) => void;
  excludeDrugId?: string;
  label?: string;
}

const DrugIteratorControls: React.FC<DrugIteratorControlsProps> = ({
  drugs,
  currentDrugId,
  onDrugChange,
  excludeDrugId,
  label = "Compare with:",
}) => {
  const availableDrugs = excludeDrugId
    ? drugs.filter((d) => d.id !== excludeDrugId)
    : drugs;

  const currentIndex = availableDrugs.findIndex((d) => d.id === currentDrugId);
  const currentDrug = availableDrugs[currentIndex];

  const handlePrevious = () => {
    const newIndex =
      currentIndex <= 0 ? availableDrugs.length - 1 : currentIndex - 1;
    onDrugChange(availableDrugs[newIndex].id);
  };

  const handleNext = () => {
    const newIndex =
      currentIndex >= availableDrugs.length - 1 ? 0 : currentIndex + 1;
    onDrugChange(availableDrugs[newIndex].id);
  };

  if (!currentDrug) {
    return null;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Tooltip title="Previous drug">
            <IconButton
              size="small"
              onClick={handlePrevious}
              sx={{
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Box
            sx={{
              minWidth: 200,
              textAlign: "center",
              px: 2,
              py: 0.5,
              background: "var(--gray-50, #fafbfc)",
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" fontWeight={500}>
              {currentDrug.shortName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentDrug.indication}
            </Typography>
          </Box>

          <Tooltip title="Next drug">
            <IconButton
              size="small"
              onClick={handleNext}
              sx={{
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Drug indicator dots */}
      <Stack direction="row" spacing={0.5}>
        {availableDrugs.map((drug, index) => (
          <Tooltip key={drug.id} title={drug.shortName}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background:
                  index === currentIndex
                    ? "var(--indigo-600)"
                    : "var(--gray-300)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "scale(1.2)",
                },
              }}
              onClick={() => onDrugChange(drug.id)}
            />
          </Tooltip>
        ))}
      </Stack>
    </Paper>
  );
};

export default DrugIteratorControls;
