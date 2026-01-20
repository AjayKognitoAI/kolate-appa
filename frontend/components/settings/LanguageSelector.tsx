"use client";

import React, { useContext } from "react";
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { CustomizerContext } from "@/context/customizerContext";
import { SUPPORTED_LANGUAGES, LANGUAGE_STORAGE_KEY } from "@/utils/i18n";

// Flag emojis for languages
const FLAG_EMOJIS: Record<string, string> = {
  US: "\uD83C\uDDFA\uD83C\uDDF8",
  FR: "\uD83C\uDDEB\uD83C\uDDF7",
  DE: "\uD83C\uDDE9\uD83C\uDDEA",
  ES: "\uD83C\uDDEA\uD83C\uDDF8",
};

interface LanguageSelectorProps {
  showLabel?: boolean;
  size?: "small" | "medium";
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  showLabel = true,
  size = "small",
}) => {
  const { i18n, t } = useTranslation("settings");
  const { setIsLanguage } = useContext(CustomizerContext);

  const handleChange = (event: SelectChangeEvent) => {
    const newLanguage = event.target.value;
    i18n.changeLanguage(newLanguage);
    setIsLanguage(newLanguage);

    // Also persist to localStorage for i18next detector
    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
    }
  };

  return (
    <Box>
      {showLabel && (
        <Typography variant="subtitle2" fontWeight={600} mb={1}>
          {t("appearance.language")}
        </Typography>
      )}
      <FormControl size={size} sx={{ minWidth: 180 }}>
        <Select
          value={i18n.language?.substring(0, 2) || "en"}
          onChange={handleChange}
          aria-label="Select language"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <MenuItem key={lang.code} value={lang.code}>
              <Box display="flex" alignItems="center" gap={1}>
                <span>{FLAG_EMOJIS[lang.flag]}</span>
                <span>{lang.nativeName}</span>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default LanguageSelector;
