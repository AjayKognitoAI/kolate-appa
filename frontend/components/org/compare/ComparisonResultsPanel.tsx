"use client";
import React from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Divider,
  Grid,
  Tooltip,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { ComparisonResult, AVAILABLE_DRUGS } from "@/utils/compare/compare-config";
import {
  generateResponseRateData,
  formatSurvivalData,
} from "@/utils/compare/mock-data";

interface ComparisonResultsPanelProps {
  result: ComparisonResult | null;
  comparatorDrugId: string;
  targetDrugId: string;
}

const ComparisonResultsPanel: React.FC<ComparisonResultsPanelProps> = ({
  result,
  comparatorDrugId,
  targetDrugId,
}) => {
  if (!result) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 4,
          textAlign: "center",
          background: "var(--gray-50, #fafbfc)",
        }}
      >
        <Typography color="text.secondary">
          Configure your comparison and click "Run Comparison" to see results
        </Typography>
      </Paper>
    );
  }

  const comparatorDrug = AVAILABLE_DRUGS.find((d) => d.id === comparatorDrugId);
  const targetDrug = AVAILABLE_DRUGS.find((d) => d.id === targetDrugId);

  const responseData = generateResponseRateData(result);
  const survivalData = formatSurvivalData(result);

  const formatPValue = (p: number) => {
    if (p < 0.001) return "< 0.001";
    if (p < 0.05) return p.toFixed(3) + "*";
    return p.toFixed(3);
  };

  const isSignificant = (p: number) => p < 0.05;

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 1.5, boxShadow: 2 }}>
          <Typography variant="body2" fontWeight={500}>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography
              key={index}
              variant="caption"
              sx={{ color: entry.color, display: "block" }}
            >
              {entry.name}: {entry.value}
              {entry.dataKey.includes("Pfs") || entry.dataKey.includes("Os")
                ? "%"
                : "%"}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  return (
    <Stack spacing={3}>
      {/* Summary Stats Header */}
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Box
          sx={{
            px: 2,
            py: 1.5,
            background: "var(--gray-50, #fafbfc)",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle2" fontWeight={600}>
            Comparison Results
          </Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            {/* Comparator Stats */}
            <Grid component={Grid} size={{ xs: 12, md: 5 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  background: "var(--indigo-50, #eef2ff)",
                  borderColor: "var(--indigo-200)",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <Chip
                    size="small"
                    label="Comparator"
                    sx={{
                      background: "var(--indigo-600)",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  />
                  <Typography variant="body2" fontWeight={500}>
                    {comparatorDrug?.shortName}
                  </Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid component={Grid} size={4}>
                    <Typography variant="h5" fontWeight={600} color="primary.main">
                      {Math.round(result.comparator.orr * 100)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ORR
                    </Typography>
                  </Grid>
                  <Grid component={Grid} size={4}>
                    <Typography variant="h5" fontWeight={600} color="success.main">
                      {Math.round(result.comparator.cr * 100)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      CR
                    </Typography>
                  </Grid>
                  <Grid component={Grid} size={4}>
                    <Typography variant="h5" fontWeight={600}>
                      {result.comparator.patientCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Patients
                    </Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 1.5 }} />
                <Grid container spacing={2}>
                  <Grid component={Grid} size={6}>
                    <Typography variant="body2" fontWeight={500}>
                      {result.comparator.medianPfs} mo
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Median PFS
                    </Typography>
                  </Grid>
                  <Grid component={Grid} size={6}>
                    <Typography variant="body2" fontWeight={500}>
                      {result.comparator.medianOs} mo
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Median OS
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* VS Divider */}
            <Grid
              component={Grid}
              size={{ xs: 12, md: 2 }}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="h6"
                fontWeight={700}
                color="text.secondary"
                sx={{
                  px: 2,
                  py: 1,
                  background: "var(--gray-100)",
                  borderRadius: 2,
                }}
              >
                VS
              </Typography>
            </Grid>

            {/* Target Stats */}
            <Grid component={Grid} size={{ xs: 12, md: 5 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  background: "var(--orange-50, #fff7ed)",
                  borderColor: "var(--orange-200)",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <Chip
                    size="small"
                    label="Target"
                    sx={{
                      background: "var(--orange-600, #ea580c)",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  />
                  <Typography variant="body2" fontWeight={500}>
                    {targetDrug?.shortName}
                  </Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid component={Grid} size={4}>
                    <Typography variant="h5" fontWeight={600} color="primary.main">
                      {Math.round(result.target.orr * 100)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ORR
                    </Typography>
                  </Grid>
                  <Grid component={Grid} size={4}>
                    <Typography variant="h5" fontWeight={600} color="success.main">
                      {Math.round(result.target.cr * 100)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      CR
                    </Typography>
                  </Grid>
                  <Grid component={Grid} size={4}>
                    <Typography variant="h5" fontWeight={600}>
                      {result.target.patientCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Patients
                    </Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 1.5 }} />
                <Grid container spacing={2}>
                  <Grid component={Grid} size={6}>
                    <Typography variant="body2" fontWeight={500}>
                      {result.target.medianPfs} mo
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Median PFS
                    </Typography>
                  </Grid>
                  <Grid component={Grid} size={6}>
                    <Typography variant="body2" fontWeight={500}>
                      {result.target.medianOs} mo
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Median OS
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Statistical Significance */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} mb={2}>
          Statistical Significance
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Tooltip title="Overall Response Rate p-value">
            <Chip
              label={`ORR: p = ${formatPValue(result.statistics.orrPValue)}`}
              color={isSignificant(result.statistics.orrPValue) ? "success" : "default"}
              variant={isSignificant(result.statistics.orrPValue) ? "filled" : "outlined"}
            />
          </Tooltip>
          <Tooltip title="Complete Response p-value">
            <Chip
              label={`CR: p = ${formatPValue(result.statistics.crPValue)}`}
              color={isSignificant(result.statistics.crPValue) ? "success" : "default"}
              variant={isSignificant(result.statistics.crPValue) ? "filled" : "outlined"}
            />
          </Tooltip>
          <Tooltip title="Progression-Free Survival p-value">
            <Chip
              label={`PFS: p = ${formatPValue(result.statistics.pfsPValue)}`}
              color={isSignificant(result.statistics.pfsPValue) ? "success" : "default"}
              variant={isSignificant(result.statistics.pfsPValue) ? "filled" : "outlined"}
            />
          </Tooltip>
          <Tooltip title="Overall Survival p-value">
            <Chip
              label={`OS: p = ${formatPValue(result.statistics.osPValue)}`}
              color={isSignificant(result.statistics.osPValue) ? "success" : "default"}
              variant={isSignificant(result.statistics.osPValue) ? "filled" : "outlined"}
            />
          </Tooltip>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          * indicates statistical significance (p &lt; 0.05)
        </Typography>
      </Paper>

      {/* Response Rate Charts */}
      <Grid container spacing={3}>
        {/* Bar Chart - Response Rates */}
        <Grid component={Grid} size={{ xs: 12, lg: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={2}>
              Response Rates Comparison
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={responseData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="comparator"
                    name={comparatorDrug?.shortName || "Comparator"}
                    fill="#4f46e5"
                    radius={[4, 4, 0, 0]}
                    animationDuration={800}
                  />
                  <Bar
                    dataKey="target"
                    name={targetDrug?.shortName || "Target"}
                    fill="#ea580c"
                    radius={[4, 4, 0, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Line Chart - PFS Curves */}
        <Grid component={Grid} size={{ xs: 12, lg: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={2}>
              Progression-Free Survival
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={survivalData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    label={{
                      value: "Months",
                      position: "insideBottom",
                      offset: -5,
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    label={{
                      value: "Survival (%)",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 12,
                    }}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="stepAfter"
                    dataKey="comparatorPfs"
                    name={`${comparatorDrug?.shortName || "Comparator"} PFS`}
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={false}
                    animationDuration={1000}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="targetPfs"
                    name={`${targetDrug?.shortName || "Target"} PFS`}
                    stroke="#ea580c"
                    strokeWidth={2}
                    dot={false}
                    animationDuration={1000}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Line Chart - OS Curves */}
        <Grid component={Grid} size={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={2}>
              Overall Survival
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={survivalData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    label={{
                      value: "Months",
                      position: "insideBottom",
                      offset: -5,
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    label={{
                      value: "Survival (%)",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 12,
                    }}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="stepAfter"
                    dataKey="comparatorOs"
                    name={`${comparatorDrug?.shortName || "Comparator"} OS`}
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={false}
                    animationDuration={1000}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="targetOs"
                    name={`${targetDrug?.shortName || "Target"} OS`}
                    stroke="#ea580c"
                    strokeWidth={2}
                    dot={false}
                    animationDuration={1000}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default ComparisonResultsPanel;
