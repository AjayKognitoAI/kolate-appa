import React, { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  Skeleton,
  Stack,
  Switch,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import predictService from "@/services/predict/predict-service";

interface CharacteristicChartOptionsProps {
  open: boolean;
  onClose: () => void;
  onApply: (selectedTypes: string[]) => void;
  selectedChartTypes: string[];
  getChartTypes?: () => Promise<any>;
}

const CharacteristicChartOptions: React.FC<CharacteristicChartOptionsProps> = ({
  open,
  onClose,
  onApply,
  selectedChartTypes,
  getChartTypes,
}) => {
  const [chartTypes, setChartTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>(selectedChartTypes);

  useEffect(() => setChecked(selectedChartTypes), [selectedChartTypes]);

  useEffect(() => {
    if (!open) return;
    let canceled = false;
    const fetchChartTypes = async () => {
      try {
        setLoading(true);
        setError(null);
        const serviceMethod = getChartTypes || predictService.getChartTypes;
        const response = await serviceMethod();
        if (!canceled && response?.data?.data) {
          const types = response.data.data as string[];
          setChartTypes(types);
          if (selectedChartTypes.length === 0 && types.length > 0)
            setChecked(types);
        }
      } catch (err) {
        if (!canceled) {
          console.error(err);
          setError("Failed to load chart types. Please try again.");
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    fetchChartTypes();
    return () => {
      canceled = true;
    };
  }, [open, selectedChartTypes]);

  const allSelected = useMemo(
    () => chartTypes.length > 0 && checked.length === chartTypes.length,
    [chartTypes, checked]
  );

  const handleToggle = (option: string) =>
    setChecked((prev) =>
      prev.includes(option)
        ? prev.filter((p) => p !== option)
        : [...prev, option]
    );

  const handleSelectAll = () =>
    setChecked((prev) => (allSelected ? [] : [...chartTypes]));

  const handleApply = () => {
    onApply(checked);
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      container={() => document.body}
      PaperProps={{
        sx: {
          width: { xs: "100%" },
          borderRadius: "16px 0 0 16px",
          maxWidth: "480px",
          display: "flex",
          flexDirection: "column",
          boxShadow: (theme) => theme.shadows[8],
        },
      }}
      ModalProps={{ keepMounted: false, disableScrollLock: false }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Characteristics to view
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="close drawer">
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      {/* Subtitle */}
      <Box sx={{ px: 3, pt: 2 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 1,
            borderColor: (theme) => theme.palette.divider,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Choose an option to change
          </Typography>
          <Button
            size="small"
            onClick={handleSelectAll}
            sx={{ textTransform: "none", minWidth: 0, fontWeight: 600 }}
          >
            {allSelected ? "Deselect all" : "Select all"}
          </Button>
        </Paper>
      </Box>

      {/* Body */}
      <Box sx={{ px: 3, pt: 2, pb: 2, flex: 1, overflowY: "auto" }}>
        {loading ? (
          <Stack gap={2}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} height={48} />
            ))}
          </Stack>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <Paper
            variant="outlined"
            sx={{ mt: 1.5, p: 0, borderRadius: 1, overflow: "hidden" }}
            aria-label="characteristics list"
          >
            {chartTypes.map((option) => {
              const isChecked = checked.includes(option);
              return (
                <Box
                  key={option}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleToggle(option)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleToggle(option);
                    }
                  }}
                  sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    py: 2,
                    px: 3,
                    bgcolor: "background.paper",
                    textAlign: "left",
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                    "&:focus-visible": {
                      boxShadow: (theme) =>
                        `0 0 0 3px ${theme.palette.action.selected}`,
                    },
                  }}
                >
                  <Typography sx={{ color: "text.primary" }}>
                    {option}
                  </Typography>

                  <Switch
                    edge="end"
                    checked={isChecked}
                    // prevent the Switch click from bubbling to the row
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => handleToggle(option)}
                    inputProps={{ "aria-label": `${option} toggle` }}
                  />
                </Box>
              );
            })}
          </Paper>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          pb: 2,
          pt: 2,
          display: "flex",
          gap: 2,
          justifyContent: "flex-end",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          size="large"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={loading}
          size="large"
        >
          Apply
        </Button>
      </Box>
    </Drawer>
  );
};

export default CharacteristicChartOptions;
