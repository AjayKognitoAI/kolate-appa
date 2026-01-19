"use client";

import React, { useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Slider,
  Stack,
  IconButton,
  Tooltip,
  Chip,
  Collapse,
} from "@mui/material";
import {
  IconInfoCircle,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconPlus,
} from "@tabler/icons-react";
import { Characteristic } from "./types";

interface CharacteristicsPanelProps {
  characteristics: Characteristic[];
  onCharacteristicChange: (id: string, value: number) => void;
  onRemoveCharacteristic: (id: string) => void;
  onAddFeatureClick: () => void;
  expanded?: boolean;
  onExpandToggle?: () => void;
}

const CharacteristicsPanel: React.FC<CharacteristicsPanelProps> = ({
  characteristics,
  onCharacteristicChange,
  onRemoveCharacteristic,
  onAddFeatureClick,
  expanded = true,
  onExpandToggle,
}) => {
  const handleSliderChange = useCallback(
    (id: string) => (_event: Event, value: number | number[]) => {
      onCharacteristicChange(id, value as number);
    },
    [onCharacteristicChange]
  );

  const formatValue = (char: Characteristic) => {
    const value = char.value;
    if (char.unit) {
      return `${value} ${char.unit}`;
    }
    return value.toString();
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        border: "1px solid var(--gray-200)",
        overflow: "hidden",
        transition: "box-shadow 0.2s ease",
        "&:hover": {
          boxShadow: "var(--shadow-sm)",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          bgcolor: "var(--gray-50)",
          borderBottom: "1px solid var(--gray-200)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: onExpandToggle ? "pointer" : "default",
        }}
        onClick={onExpandToggle}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={600} color="var(--gray-800)">
            Characteristics
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Adjust parameters to see how predictions change
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            label={`${characteristics.length} active`}
            sx={{
              bgcolor: "var(--primary-100)",
              color: "var(--primary-700)",
              fontWeight: 500,
            }}
          />
          {onExpandToggle && (
            <IconButton size="small" sx={{ color: "var(--gray-500)" }}>
              {expanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
            </IconButton>
          )}
        </Stack>
      </Box>

      {/* Sliders Content */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2.5 }}>
          <Stack spacing={2.5}>
            {characteristics.map((char) => (
              <Box
                key={char.id}
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: char.isUserDefined ? "var(--primary-50)" : "var(--gray-50)",
                  border: `1px solid ${
                    char.isUserDefined ? "var(--primary-200)" : "var(--gray-100)"
                  }`,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: char.isUserDefined ? "var(--primary-100)" : "var(--gray-100)",
                    borderColor: char.isUserDefined
                      ? "var(--primary-300)"
                      : "var(--gray-200)",
                  },
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  mb={1}
                >
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      color="var(--gray-800)"
                    >
                      {char.name}
                    </Typography>
                    {char.description && (
                      <Tooltip title={char.description} arrow placement="top">
                        <IconInfoCircle
                          size={14}
                          style={{ color: "var(--gray-400)", cursor: "help" }}
                        />
                      </Tooltip>
                    )}
                    {char.isUserDefined && (
                      <Chip
                        size="small"
                        label="Custom"
                        sx={{
                          ml: 1,
                          height: 18,
                          fontSize: 10,
                          bgcolor: "var(--primary-600)",
                          color: "#fff",
                        }}
                      />
                    )}
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="var(--primary-700)"
                      sx={{
                        minWidth: 60,
                        textAlign: "right",
                        bgcolor: "var(--primary-100)",
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                      }}
                    >
                      {formatValue(char)}
                    </Typography>
                    {char.isUserDefined && (
                      <Tooltip title="Remove characteristic">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveCharacteristic(char.id);
                          }}
                          sx={{
                            color: "var(--red-500)",
                            "&:hover": {
                              bgcolor: "var(--red-50)",
                              color: "var(--red-600)",
                            },
                          }}
                        >
                          <IconTrash size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Box>

                <Slider
                  value={char.value}
                  min={char.min}
                  max={char.max}
                  step={char.max <= 10 ? 0.1 : 1}
                  onChange={handleSliderChange(char.id)}
                  sx={{
                    color: "var(--primary-600)",
                    height: 6,
                    "& .MuiSlider-thumb": {
                      width: 16,
                      height: 16,
                      bgcolor: "#fff",
                      border: "2px solid var(--primary-600)",
                      "&:hover, &.Mui-focusVisible": {
                        boxShadow: "0 0 0 6px rgba(29, 79, 215, 0.15)",
                      },
                      "&.Mui-active": {
                        boxShadow: "0 0 0 10px rgba(29, 79, 215, 0.2)",
                      },
                    },
                    "& .MuiSlider-track": {
                      borderRadius: 3,
                      background: "var(--gradient-primary-horizontal)",
                    },
                    "& .MuiSlider-rail": {
                      borderRadius: 3,
                      bgcolor: "var(--gray-200)",
                    },
                  }}
                />

                <Box
                  display="flex"
                  justifyContent="space-between"
                  mt={0.5}
                >
                  <Typography variant="caption" color="text.secondary">
                    {char.min}
                    {char.unit && ` ${char.unit}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {char.max}
                    {char.unit && ` ${char.unit}`}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>

          {/* Add Feature Button */}
          <Box
            onClick={onAddFeatureClick}
            sx={{
              mt: 2.5,
              p: 2,
              borderRadius: 1.5,
              border: "2px dashed var(--gray-300)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: "var(--primary-400)",
                bgcolor: "var(--primary-50)",
              },
            }}
          >
            <IconPlus size={18} style={{ color: "var(--gray-500)" }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Add Custom Feature
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default CharacteristicsPanel;
