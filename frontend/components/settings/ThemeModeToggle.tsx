"use client";

import React, { useContext } from "react";
import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { CustomizerContext } from "@/context/customizerContext";
import { useTranslation } from "react-i18next";

interface ThemeModeToggleProps {
  showLabel?: boolean;
}

export const ThemeModeToggle: React.FC<ThemeModeToggleProps> = ({
  showLabel = true,
}) => {
  const { activeMode, setActiveMode } = useContext(CustomizerContext);
  const { t } = useTranslation("settings");

  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: string | null
  ) => {
    if (newMode !== null) {
      setActiveMode(newMode);
    }
  };

  return (
    <Box>
      {showLabel && (
        <Typography variant="subtitle2" fontWeight={600} mb={1}>
          {t("appearance.theme")}
        </Typography>
      )}
      <ToggleButtonGroup
        value={activeMode}
        exclusive
        onChange={handleChange}
        aria-label="Theme mode"
        size="small"
      >
        <ToggleButton
          value="light"
          aria-label="Light mode"
          sx={{ px: 2, gap: 1 }}
        >
          <IconSun size={18} />
          {t("appearance.light")}
        </ToggleButton>
        <ToggleButton
          value="dark"
          aria-label="Dark mode"
          sx={{ px: 2, gap: 1 }}
        >
          <IconMoon size={18} />
          {t("appearance.dark")}
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

export default ThemeModeToggle;
