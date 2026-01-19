"use client";
import React, { use, useEffect, useState } from "react";
import Breadcrumb from "@/components/layout/shared/breadcrumb/Breadcrumb";
import { Box, Divider, Typography, CircularProgress, Alert } from "@mui/material";
import ReusableCharacteristicsResult from "@/components/org/predict/ReusableCharacteristicsResult";
import { TRIAL_CONFIGS, getTrialConfig, TrialConfig } from "@/utils/predict/predict-trials.config";

/**
 * Characteristics Page - Shows key characteristics of responders for a trial
 *
 * NOTE: Uses default moduleId for backward compatibility.
 * Will be migrated to /predict/[slug]/modules/[moduleId]/characteristics in a future update.
 */
export default function CharacteristicsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [trialConfig, setTrialConfig] = useState<TrialConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);

      // First try with composite key (slug:default)
      const compositeKey = `${slug}:default`;
      if (TRIAL_CONFIGS[compositeKey]) {
        setTrialConfig(TRIAL_CONFIGS[compositeKey]);
        setLoading(false);
        return;
      }

      // Try to find any config that matches the trialSlug
      const matchingConfig = Object.values(TRIAL_CONFIGS).find(
        (c) => c.trialSlug === slug
      );
      if (matchingConfig) {
        setTrialConfig(matchingConfig);
        setLoading(false);
        return;
      }

      // Try dynamic loading with default moduleId
      const dynamicConfig = await getTrialConfig(slug, "default");
      setTrialConfig(dynamicConfig);
      setLoading(false);
    }

    loadConfig();
  }, [slug]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!trialConfig?.characteristics) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="info">
          Characteristics data is not available for this trial.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box px={3} py={2} display="flex" alignItems="center">
        <Typography fontWeight={500} variant="h4">
          Predict
        </Typography>
      </Box>
      <Divider />
      <Box px={3} mt={3}>
        <Breadcrumb
          items={[
            { title: "Predict", to: "/predict" },
            {
              title: trialConfig?.modelName ?? slug,
              to: `/predict/${slug}`,
            },
            { title: "Key Characteristics of Responders" },
          ]}
        />
        <Box mt={5} pb={3}>
          <ReusableCharacteristicsResult config={trialConfig.characteristics} />
        </Box>
      </Box>
    </Box>
  );
}
