"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  Alert,
  IconButton,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  LinearProgress,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  IconX,
  IconChartBar,
  IconInfoCircle,
  IconAlertTriangle,
} from "@tabler/icons-react";
import {
  EdaFeatureRanking,
  EdaColumnInfo,
  EdaNumericStats,
  EdaDistributionResponse,
  dataPipelineService,
} from "@/services/data-pipeline/data-pipeline-service";

interface FeatureReasoningModalProps {
  open: boolean;
  onClose: () => void;
  feature: EdaFeatureRanking | null;
  columnInfo?: EdaColumnInfo | null;
  numericStats?: EdaNumericStats | null;
  filename?: string;
}

const FeatureReasoningModal = ({
  open,
  onClose,
  feature,
  columnInfo,
  numericStats,
  filename,
}: FeatureReasoningModalProps) => {
  const [distribution, setDistribution] = useState<EdaDistributionResponse | null>(null);
  const [loadingDistribution, setLoadingDistribution] = useState(false);
  const [distributionError, setDistributionError] = useState<string | null>(null);

  useEffect(() => {
    if (open && feature && filename) {
      fetchDistribution();
    }
    return () => {
      setDistribution(null);
      setDistributionError(null);
    };
  }, [open, feature, filename]);

  const fetchDistribution = async () => {
    if (!feature || !filename) return;

    setLoadingDistribution(true);
    setDistributionError(null);

    try {
      const data = await dataPipelineService.getEdaDistribution(filename, feature.column);
      setDistribution(data);
    } catch (error: any) {
      setDistributionError(error.response?.data?.detail || "Failed to load distribution data");
    } finally {
      setLoadingDistribution(false);
    }
  };

  const getImportanceColor = (level: string): "error" | "warning" | "info" | "default" => {
    switch (level) {
      case "High":
        return "error";
      case "Medium":
        return "warning";
      case "Low":
        return "info";
      default:
        return "default";
    }
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const formatNumber = (value: number | undefined): string => {
    if (value === undefined || value === null) return "N/A";
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toFixed(4);
  };

  if (!feature) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconChartBar size={24} />
            <Typography variant="h5" fontWeight="bold">
              Feature Details
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <IconX size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Feature Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              {feature.column}
            </Typography>
            <Chip
              label={`${feature.importance_level} Importance`}
              color={getImportanceColor(feature.importance_level)}
              size="medium"
            />
            <Chip
              label={`Score: ${feature.importance_score.toFixed(1)}`}
              variant="outlined"
              size="medium"
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Data Type: <strong>{feature.dtype}</strong>
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* AI Reasoning Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <IconInfoCircle size={20} color="#1976d2" />
            <Typography variant="subtitle1" fontWeight="bold">
              AI Reasoning
            </Typography>
          </Box>
          <Alert severity="info" icon={false} sx={{ bgcolor: "primary.lighter" }}>
            <Typography variant="body2">{feature.reasoning}</Typography>
          </Alert>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Statistics Section */}
        <Grid container spacing={3}>
          {/* Basic Stats */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Basic Statistics
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" sx={{ fontWeight: 500 }}>
                      Data Type
                    </TableCell>
                    <TableCell>{feature.dtype}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" sx={{ fontWeight: 500 }}>
                      Missing Values
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {formatPercentage(feature.missing_percent)}
                        {feature.missing_percent > 10 && (
                          <IconAlertTriangle size={16} color="#ed6c02" />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" sx={{ fontWeight: 500 }}>
                      Unique Values
                    </TableCell>
                    <TableCell>{feature.unique_count.toLocaleString()}</TableCell>
                  </TableRow>
                  {feature.correlation_with_target !== undefined && (
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 500 }}>
                        Correlation (Target)
                      </TableCell>
                      <TableCell>{formatNumber(feature.correlation_with_target)}</TableCell>
                    </TableRow>
                  )}
                  {columnInfo && (
                    <>
                      <TableRow>
                        <TableCell component="th" sx={{ fontWeight: 500 }}>
                          Non-null Count
                        </TableCell>
                        <TableCell>{columnInfo.non_null_count.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" sx={{ fontWeight: 500 }}>
                          Null Count
                        </TableCell>
                        <TableCell>{columnInfo.null_count.toLocaleString()}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* Numeric Stats (if available) */}
          {numericStats && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Numeric Statistics
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 500 }}>
                        Mean
                      </TableCell>
                      <TableCell>{formatNumber(numericStats.mean)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 500 }}>
                        Std Dev
                      </TableCell>
                      <TableCell>{formatNumber(numericStats.std)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 500 }}>
                        Min
                      </TableCell>
                      <TableCell>{formatNumber(numericStats.min)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 500 }}>
                        Max
                      </TableCell>
                      <TableCell>{formatNumber(numericStats.max)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 500 }}>
                        Median
                      </TableCell>
                      <TableCell>{formatNumber(numericStats.median)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 500 }}>
                        Q1 / Q3
                      </TableCell>
                      <TableCell>
                        {formatNumber(numericStats.q1)} / {formatNumber(numericStats.q3)}
                      </TableCell>
                    </TableRow>
                    {numericStats.skewness !== undefined && (
                      <TableRow>
                        <TableCell component="th" sx={{ fontWeight: 500 }}>
                          Skewness
                        </TableCell>
                        <TableCell>{formatNumber(numericStats.skewness)}</TableCell>
                      </TableRow>
                    )}
                    {numericStats.kurtosis !== undefined && (
                      <TableRow>
                        <TableCell component="th" sx={{ fontWeight: 500 }}>
                          Kurtosis
                        </TableCell>
                        <TableCell>{formatNumber(numericStats.kurtosis)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          )}
        </Grid>

        {/* Distribution Section */}
        {filename && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Distribution
              </Typography>

              {loadingDistribution && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              )}

              {distributionError && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  {distributionError}
                </Alert>
              )}

              {distribution && !loadingDistribution && (
                <Box>
                  {/* Histogram visualization (simplified bar representation) */}
                  {distribution.histogram && distribution.histogram.counts.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Value Distribution (Histogram)
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5, alignItems: "flex-end", height: 120 }}>
                        {distribution.histogram.counts.map((count, idx) => {
                          const maxCount = Math.max(...distribution.histogram!.counts);
                          const heightPercent = (count / maxCount) * 100;
                          return (
                            <Box
                              key={idx}
                              sx={{
                                flex: 1,
                                bgcolor: "primary.main",
                                height: `${heightPercent}%`,
                                minHeight: 4,
                                borderRadius: "2px 2px 0 0",
                                transition: "height 0.3s ease",
                                "&:hover": {
                                  bgcolor: "primary.dark",
                                },
                              }}
                              title={`Count: ${count}`}
                            />
                          );
                        })}
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatNumber(distribution.histogram.bins[0])}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatNumber(distribution.histogram.bins[distribution.histogram.bins.length - 1])}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Value counts for categorical data */}
                  {distribution.value_counts && Object.keys(distribution.value_counts).length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Top Values
                      </Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                        <Table size="small" stickyHeader>
                          <TableBody>
                            {Object.entries(distribution.value_counts)
                              .slice(0, 10)
                              .map(([value, count]) => {
                                const total = Object.values(distribution.value_counts!).reduce(
                                  (sum, c) => sum + c,
                                  0
                                );
                                const percent = (count / total) * 100;
                                return (
                                  <TableRow key={value}>
                                    <TableCell sx={{ fontWeight: 500 }}>{value}</TableCell>
                                    <TableCell align="right">{count.toLocaleString()}</TableCell>
                                    <TableCell align="right" sx={{ width: 100 }}>
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <LinearProgress
                                          variant="determinate"
                                          value={percent}
                                          sx={{ flex: 1, height: 6, borderRadius: 3 }}
                                        />
                                        <Typography variant="caption" sx={{ minWidth: 40 }}>
                                          {percent.toFixed(1)}%
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </>
        )}

        {/* Missing Value Alert */}
        {feature.missing_percent > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Alert
              severity={feature.missing_percent > 20 ? "warning" : "info"}
              icon={<IconAlertTriangle size={20} />}
            >
              <Typography variant="body2">
                This feature has <strong>{formatPercentage(feature.missing_percent)}</strong> missing
                values. Consider imputation strategies or evaluate if this feature should be included
                in your model.
              </Typography>
            </Alert>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeatureReasoningModal;