"use client";

import { useState } from "react";
import { Box, Typography, Button, TextField, InputAdornment } from "@mui/material";
import { IconPlus, IconRefresh, IconSearch } from "@tabler/icons-react";
import TrialFormModal from "./trial-form-modal";

interface TrialsHeaderProps {
  onRefresh?: () => void;
  onTrialCreated?: () => void;
  onSearch?: (keyword: string) => void;
}

const TrialsHeader = ({ onRefresh, onTrialCreated, onSearch }: TrialsHeaderProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleTrialCreated = () => {
    handleCloseModal();
    onTrialCreated?.();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          pt: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Study Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Create and manage Study configurations for enterprises
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          {onRefresh && (
            <Button
              variant="outlined"
              startIcon={<IconRefresh size={18} />}
              onClick={onRefresh}
              size="small"
            >
              Refresh
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={18} />}
            onClick={handleOpenModal}
          >
            Add Study
          </Button>
        </Box>
      </Box>

      <TrialFormModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleTrialCreated}
        mode="create"
      />
    </>
  );
};

export default TrialsHeader;
