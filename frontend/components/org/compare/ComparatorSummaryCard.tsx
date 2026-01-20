"use client";
import React from "react";
import { Box, Typography, Paper, Stack, Divider, Chip } from "@mui/material";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import { ComparePatient, Drug } from "@/utils/compare/compare-config";

interface ComparatorSummaryCardProps {
  drug?: Drug;
  patients: ComparePatient[];
  filteredCount: number;
  selectedCount: number;
}

const ComparatorSummaryCard: React.FC<ComparatorSummaryCardProps> = ({
  drug,
  patients,
  filteredCount,
  selectedCount,
}) => {
  // Calculate summary statistics
  const effectivePatients = patients.slice(0, selectedCount || filteredCount || patients.length);

  const avgAge =
    effectivePatients.length > 0
      ? Math.round(
          effectivePatients.reduce((sum, p) => sum + p.age, 0) /
            effectivePatients.length
        )
      : 0;

  const maleCount = effectivePatients.filter((p) => p.gender === "Male").length;
  const femaleCount = effectivePatients.filter((p) => p.gender === "Female").length;

  const ecogDistribution: Record<string, number> = {};
  effectivePatients.forEach((p) => {
    const key = String(p.ecog);
    ecogDistribution[key] = (ecogDistribution[key] || 0) + 1;
  });

  const responseDistribution: Record<string, number> = {};
  effectivePatients.forEach((p) => {
    responseDistribution[p.best_response] =
      (responseDistribution[p.best_response] || 0) + 1;
  });

  const avgLdh =
    effectivePatients.length > 0
      ? Math.round(
          effectivePatients.reduce((sum, p) => sum + p.ldh, 0) /
            effectivePatients.length
        )
      : 0;

  if (!drug) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          textAlign: "center",
          background: "var(--gray-50, #fafbfc)",
        }}
      >
        <Typography color="text.secondary">
          Select a comparator drug to see patient summary
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          background: "var(--gray-50, #fafbfc)",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <PeopleOutlineIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight={600}>
            Comparator Summary
          </Typography>
          <Chip
            size="small"
            label={drug.shortName}
            color="primary"
            sx={{ height: 22 }}
          />
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2 }}>
        {patients.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Load patient data to see summary
          </Typography>
        ) : (
          <Stack spacing={2}>
            {/* Patient Counts */}
            <Box>
              <Stack direction="row" spacing={3}>
                <Box>
                  <Typography variant="h4" fontWeight={600} color="primary.main">
                    {selectedCount || filteredCount || patients.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Patients in comparison
                  </Typography>
                </Box>
                {filteredCount !== patients.length && (
                  <Box>
                    <Typography variant="h4" fontWeight={600} color="text.secondary">
                      {patients.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total loaded
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Demographics */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                DEMOGRAPHICS
              </Typography>
              <Stack direction="row" spacing={3} mt={1}>
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {avgAge} years
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Avg. Age
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {avgLdh} U/L
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Avg. LDH
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Gender Distribution */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                GENDER
              </Typography>
              <Stack direction="row" spacing={1} mt={1}>
                <Chip
                  size="small"
                  label={`Male: ${maleCount} (${Math.round(
                    (maleCount / effectivePatients.length) * 100
                  )}%)`}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`Female: ${femaleCount} (${Math.round(
                    (femaleCount / effectivePatients.length) * 100
                  )}%)`}
                  variant="outlined"
                />
              </Stack>
            </Box>

            {/* ECOG Distribution */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                ECOG STATUS
              </Typography>
              <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
                {Object.entries(ecogDistribution)
                  .sort((a, b) => Number(a[0]) - Number(b[0]))
                  .map(([ecog, count]) => (
                    <Chip
                      key={ecog}
                      size="small"
                      label={`ECOG ${ecog}: ${count}`}
                      variant="outlined"
                    />
                  ))}
              </Stack>
            </Box>

            {/* Response Distribution */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                BEST RESPONSE
              </Typography>
              <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
                {Object.entries(responseDistribution).map(([response, count]) => (
                  <Chip
                    key={response}
                    size="small"
                    label={`${response}: ${count}`}
                    color={
                      response === "CR"
                        ? "success"
                        : response === "PR"
                        ? "info"
                        : response === "SD"
                        ? "warning"
                        : "error"
                    }
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        )}
      </Box>
    </Paper>
  );
};

export default ComparatorSummaryCard;
