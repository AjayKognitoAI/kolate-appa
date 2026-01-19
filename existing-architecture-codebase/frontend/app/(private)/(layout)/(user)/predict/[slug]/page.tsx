"use client";
import { use, useEffect, useState } from "react";
import { ReusablePredictPage } from "@/components/org/predict/ReusablePredictPage";
import { getTrialConfig, TRIAL_CONFIGS, TrialConfig } from "@/utils/predict/predict-trials.config";
import { Box, CircularProgress, Typography, Alert } from "@mui/material";

/**
 * Study Page - Prediction interface for a trial
 *
 * NOTE: This page currently uses a default moduleId for backward compatibility.
 * The URL structure will be migrated to /predict/[slug]/modules/[moduleId] in a future update.
 * For now, the page attempts to find the trial config using the slug with "default" moduleId,
 * or falls back to checking all TRIAL_CONFIGS entries for a matching trialSlug.
 */
export default function StudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [config, setConfig] = useState<TrialConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      setError(null);

      try {
        // First try with composite key (slug:default)
        const compositeKey = `${slug}:default`;
        if (TRIAL_CONFIGS[compositeKey]) {
          setConfig(TRIAL_CONFIGS[compositeKey]);
          setLoading(false);
          return;
        }

        // Try to find any config that matches the trialSlug
        const matchingConfig = Object.values(TRIAL_CONFIGS).find(
          (c) => c.trialSlug === slug
        );
        if (matchingConfig) {
          setConfig(matchingConfig);
          setLoading(false);
          return;
        }

        // Try dynamic loading with default moduleId
        const dynamicConfig = await getTrialConfig(slug, "default");
        if (dynamicConfig) {
          setConfig(dynamicConfig);
          setLoading(false);
          return;
        }

        setError(`Trial configuration not found for: ${slug}`);
      } catch (err) {
        console.error("Failed to load trial config:", err);
        setError("Failed to load trial configuration");
      } finally {
        setLoading(false);
      }
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

  if (error || !config) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          <Typography variant="h6">Trial Not Found</Typography>
          <Typography>{error || `No configuration found for trial: ${slug}`}</Typography>
        </Alert>
      </Box>
    );
  }

  return <ReusablePredictPage config={config} />;
}
