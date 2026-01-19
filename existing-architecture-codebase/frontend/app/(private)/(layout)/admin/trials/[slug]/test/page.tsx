"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Avatar,
  Skeleton,
} from "@mui/material";
import {
  IconPlayerPlay,
  IconArrowLeft,
  IconFlask,
  IconBrain,
  IconUpload,
  IconFileTypeCsv,
  IconDownload,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { mlEvaluationAdminService } from "@/services/admin/ml-evaluation-admin-service";
import { trialsService } from "@/services/admin/trials-service";
import type {
  PredictionResponse,
  FieldMetadataResponse,
} from "@/types/ml-evaluation-admin.types";
import { toast } from "react-toastify";
import PageContainer from "@/components/container/PageContainer";

export default function TestModelPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [testData, setTestData] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<PredictionResponse | null>(null);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fieldMetadata, setFieldMetadata] = useState<FieldMetadataResponse | null>(null);
  const [trialName, setTrialName] = useState<string>("");
  const [moduleName, setModuleName] = useState<string>("");

  // CSV batch testing
  const [testMode, setTestMode] = useState<"single" | "batch">("single");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [batchResults, setBatchResults] = useState<Array<{ data: Record<string, any>; result: PredictionResponse }>>([]);
  const [csvData, setCsvData] = useState<Array<Record<string, any>>>([]);
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [currentBatchResultIndex, setCurrentBatchResultIndex] = useState(0);

  useEffect(() => {
    if (slug) {
      fetchTrialAndMetadata();
    }
  }, [slug]);

  const fetchTrialAndMetadata = async () => {
    setLoading(true);
    try {
      // Fetch trial info
      const trialResponse = await trialsService.getTrialBySlug(slug);
      if (!trialResponse.trials || trialResponse.trials.length === 0) {
        toast.error("Study not found");
        router.push("/admin/trials");
        return;
      }

      const trial = trialResponse.trials[0];
      setTrialName(trial.name);
      setModuleName(trial.module_name);

      // Fetch field metadata
      const response = await mlEvaluationAdminService.getFieldMetadata(slug, trial.module_name);
      setFieldMetadata(response);
    } catch (error: any) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load test page");
      router.push("/admin/trials");
    } finally {
      setLoading(false);
    }
  };

  const handleTestInputChange = (fieldName: string, value: any) => {
    setTestData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleRunTest = async () => {
    if (!fieldMetadata?.data?.length) {
      toast.error("No fields defined for testing");
      return;
    }

    // Check required fields
    const missingRequired = fieldMetadata.data
      .filter((f) => f.validation?.required)
      .filter((f) => !testData[f.name] && testData[f.name] !== 0)
      .map((f) => f.name);

    if (missingRequired.length > 0) {
      toast.error(`Missing required fields: ${missingRequired.join(", ")}`);
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await mlEvaluationAdminService.testPredict(
        slug,
        moduleName,
        testData,
        "test-project"
      );

      setTestResult(result);
      toast.success("Test prediction completed successfully");
    } catch (error: any) {
      console.error("Test prediction failed:", error);
      toast.error(error.response?.data?.message || error.response?.data?.detail || "Test prediction failed");
    } finally {
      setTesting(false);
    }
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setCsvFile(file);

    // Parse CSV
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast.error('CSV file must have headers and at least one data row');
      return;
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim());

    // Validate headers match field names
    const fieldNames = fieldMetadata?.data?.map(f => f.name) || [];
    const missingFields = fieldNames.filter(name => !headers.includes(name));
    if (missingFields.length > 0) {
      toast.warning(`CSV is missing fields: ${missingFields.join(', ')}`);
    }

    // Parse data rows
    const parsedData: Array<Record<string, any>> = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const rowData: Record<string, any> = {};

      headers.forEach((header, index) => {
        const field = fieldMetadata?.data?.find(f => f.name === header);
        let value: string | number = values[index];

        // Type conversion
        if (field?.type === 'number') {
          value = parseFloat(value);
        }

        rowData[header] = value;
      });

      parsedData.push(rowData);
    }

    setCsvData(parsedData);
    setCurrentRowIndex(0);
    toast.success(`CSV loaded: ${parsedData.length} rows`);
  };

  const handleBatchTest = async () => {
    if (!csvFile || !fieldMetadata?.data) {
      toast.error('Please upload a CSV file first');
      return;
    }

    setTesting(true);
    setBatchResults([]);

    try {
      // Parse CSV
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());

      const results: Array<{ data: Record<string, any>; result: PredictionResponse }> = [];

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const rowData: Record<string, any> = {};

        headers.forEach((header, index) => {
          const field = fieldMetadata.data.find(f => f.name === header);
          let value: string | number = values[index];

          // Type conversion
          if (field?.type === 'number') {
            value = parseFloat(value);
          }

          rowData[header] = value;
        });

        try {
          const result = await mlEvaluationAdminService.testPredict(
            slug,
            moduleName,
            rowData,
            "test-project"
          );
          results.push({ data: rowData, result });
        } catch (error) {
          console.error(`Failed to predict row ${i}:`, error);
        }
      }

      setBatchResults(results);
      toast.success(`Batch prediction completed: ${results.length} predictions`);
    } catch (error: any) {
      console.error('Batch test failed:', error);
      toast.error('Failed to process CSV file');
    } finally {
      setTesting(false);
    }
  };

  const downloadBatchResults = () => {
    if (batchResults.length === 0) return;

    // Create CSV content
    const headers = ['Row', ...Object.keys(batchResults[0].data), 'Model', 'Prediction', 'Confidence'];
    const rows = batchResults.flatMap((result, rowIndex) =>
      result.result.predictions.map(pred => [
        rowIndex + 1,
        ...Object.values(result.data),
        pred.model_name,
        pred.prediction_label || pred.prediction,
        `${Number(pred.confidence).toFixed(2)}%`
      ])
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predictions_${trialName}_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Results downloaded');
  };

  const getRequiredFieldsInfo = () => {
    if (!fieldMetadata?.data) return { filled: 0, total: 0 };
    const requiredFields = fieldMetadata.data.filter((f) => f.validation?.required);
    const filledRequired = requiredFields.filter((f) => testData[f.name] || testData[f.name] === 0);
    return { filled: filledRequired.length, total: requiredFields.length };
  };

  if (loading) {
    return (
      <PageContainer title="Test Model" description="Loading...">
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
            <Skeleton variant="circular" width={48} height={48} />
            <Box>
              <Skeleton variant="text" width={300} height={32} />
              <Skeleton variant="text" width={200} height={20} />
            </Box>
          </Box>
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        </Container>
      </PageContainer>
    );
  }

  const { filled, total } = getRequiredFieldsInfo();
  const allRequiredFilled = filled === total;

  return (
    <PageContainer title={`Test Model - ${trialName}`} description="Test model predictions">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Button
              variant="text"
              startIcon={<IconArrowLeft size={18} />}
              onClick={() => router.push("/admin/trials")}
            >
              Back to Studies
            </Button>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: "primary.main",
                width: 48,
                height: 48,
              }}
            >
              <IconFlask size={28} />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Test Model - {trialName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {csvFile
                  ? "Navigate through CSV rows and run batch predictions"
                  : "Enter test data manually or upload a CSV file for batch testing"}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Unified Navigation - Shown when CSV is loaded */}
        {csvFile && csvData.length > 0 && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: "primary.main", color: "white" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button
                variant="outlined"
                size="medium"
                startIcon={<IconChevronLeft size={20} />}
                onClick={() => {
                  const newIndex = Math.max(0, currentRowIndex - 1);
                  setCurrentRowIndex(newIndex);
                  setCurrentBatchResultIndex(newIndex);
                }}
                disabled={currentRowIndex === 0}
                sx={{
                  color: "white",
                  borderColor: "white",
                  bgcolor: "rgba(255,255,255,0.15)",
                  '&:hover': { borderColor: "white", bgcolor: "rgba(255,255,255,0.25)" },
                  '&.Mui-disabled': { color: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.3)", bgcolor: "transparent" }
                }}
              >
                Previous
              </Button>

              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h6" fontWeight="600">
                  Row {currentRowIndex + 1} of {csvData.length}
                </Typography>
                {batchResults.length > 0 && (
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Showing input data and prediction results
                  </Typography>
                )}
                {batchResults.length === 0 && (
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Viewing CSV data - Run batch test to see predictions
                  </Typography>
                )}
              </Box>

              <Button
                variant="outlined"
                size="medium"
                endIcon={<IconChevronRight size={20} />}
                onClick={() => {
                  const newIndex = Math.min(csvData.length - 1, currentRowIndex + 1);
                  setCurrentRowIndex(newIndex);
                  setCurrentBatchResultIndex(newIndex);
                }}
                disabled={currentRowIndex === csvData.length - 1}
                sx={{
                  color: "white",
                  borderColor: "white",
                  bgcolor: "rgba(255,255,255,0.15)",
                  '&:hover': { borderColor: "white", bgcolor: "rgba(255,255,255,0.25)" },
                  '&.Mui-disabled': { color: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.3)", bgcolor: "transparent" }
                }}
              >
                Next
              </Button>
            </Box>
          </Paper>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
          {/* Left Column - Input Fields (70%) */}
          <Box>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: "1px solid",
                borderColor: "grey.300",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1), 0 0 10px rgba(0,0,0,0.05)",
                bgcolor: "white",
              }}
            >
              {/* Title with CSV Upload button */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography variant="h6" fontWeight="600">
                    Input Fields
                  </Typography>
                  {!csvFile && fieldMetadata?.data?.length && (
                    <Chip
                      label={`${filled} / ${total} required`}
                      color={allRequiredFilled ? "success" : "warning"}
                      size="small"
                    />
                  )}
                </Box>
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={<IconUpload size={16} />}
                  disabled={testing}
                >
                  Upload CSV
                  <input
                    type="file"
                    hidden
                    accept=".csv"
                    onChange={handleCSVUpload}
                  />
                </Button>
              </Box>

              {/* CSV Data Preview */}
              {csvFile && csvData.length > 0 && (
                <Card elevation={3} sx={{ mb: 3, bgcolor: "primary.light" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <IconFileTypeCsv size={20} />
                        <Typography variant="subtitle2" fontWeight="600">
                          {csvFile.name}
                        </Typography>
                        <Chip label={`${csvData.length} rows`} size="small" color="primary" />
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => {
                            setCsvFile(null);
                            setCsvData([]);
                            setBatchResults([]);
                            setCurrentRowIndex(0);
                            setTestMode("single");
                          }}
                          color="error"
                        >
                          Clear
                        </Button>
                        {batchResults.length > 0 && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<IconDownload size={16} />}
                            onClick={downloadBatchResults}
                          >
                            Download Results
                          </Button>
                        )}
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {/* Data Display */}
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: 2,
                        p: 2,
                        bgcolor: "background.paper",
                        borderRadius: 1,
                        maxHeight: "300px",
                        overflowY: "auto",
                      }}
                    >
                      {Object.entries(csvData[currentRowIndex] || {}).map(([key, value]) => (
                        <Box key={key}>
                          <Typography variant="caption" color="text.secondary" fontWeight="600">
                            {key}
                          </Typography>
                          <Typography variant="body2">
                            {value !== null && value !== undefined ? String(value) : "-"}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* Run Batch Test Button */}
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      sx={{ mt: 2 }}
                      startIcon={
                        testing ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <IconPlayerPlay size={18} />
                        )
                      }
                      onClick={handleBatchTest}
                      disabled={testing}
                    >
                      {testing ? `Processing... (${batchResults.length}/${csvData.length})` : "Run Batch Test"}
                    </Button>

                    {batchResults.length > 0 && !testing && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        Batch testing completed! {batchResults.length} predictions generated. Click "Download Results" to export.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {!fieldMetadata?.data?.length && (
                <Alert severity="warning">
                  No fields defined for this study. Please configure the study first.
                </Alert>
              )}

              {fieldMetadata?.data?.length && !csvFile && (
                <>
                  {/* Scrollable Fields Container */}
                  <Box
                    sx={{
                      maxHeight: "calc(100vh - 400px)",
                      overflowY: "auto",
                      pr: 1,
                      mb: 3,
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                        gap: 3,
                        pt: 2,
                      }}
                    >
                      {fieldMetadata.data.map((field) => (
                        <Box key={field.name}>
                          {field.type === "categorical" && field.validation?.allowed_values ? (
                            <FormControl fullWidth required={field.validation?.required}>
                              <InputLabel>
                                {field.name}
                                {field.validation?.required && " *"}
                              </InputLabel>
                              <Select
                                value={testData[field.name] || ""}
                                label={`${field.name}${field.validation?.required ? " *" : ""}`}
                                onChange={(e) => handleTestInputChange(field.name, e.target.value)}
                                error={field.validation?.required && !testData[field.name]}
                              >
                                {field.validation.allowed_values.map((v) => (
                                  <MenuItem key={v} value={v}>
                                    {v}
                                  </MenuItem>
                                ))}
                              </Select>
                              {field.description && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                  {field.description}
                                </Typography>
                              )}
                            </FormControl>
                          ) : (
                            <TextField
                              fullWidth
                              label={field.name}
                              type={field.type === "number" ? "number" : "text"}
                              value={testData[field.name] ?? ""}
                              onChange={(e) =>
                                handleTestInputChange(
                                  field.name,
                                  field.type === "number" ? parseFloat(e.target.value) : e.target.value
                                )
                              }
                              required={field.validation?.required}
                              error={
                                field.validation?.required &&
                                !testData[field.name] &&
                                testData[field.name] !== 0
                              }
                              helperText={
                                field.description || (field.validation?.required ? "Required" : "")
                              }
                            />
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  {/* Button stays visible outside scroll area */}
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={
                      testing ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <IconPlayerPlay size={18} />
                      )
                    }
                    onClick={handleRunTest}
                    disabled={testing || !allRequiredFilled}
                    fullWidth
                  >
                    {testing ? "Running Test..." : "Run Test Prediction"}
                  </Button>
                </>
              )}
            </Paper>
          </Box>

          {/* Right Column - Results (30%) */}
          <Box>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                position: "sticky",
                top: 24,
                border: "1px solid",
                borderColor: "grey.300",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1), 0 0 10px rgba(0,0,0,0.05)",
                bgcolor: "white",
              }}
            >
              <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
                Prediction Results
              </Typography>

              {!testResult && batchResults.length === 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 8,
                    textAlign: "center",
                  }}
                >
                  <IconBrain size={64} style={{ color: "#9e9e9e", marginBottom: 16 }} />
                  <Typography variant="body1" color="text.secondary">
                    {csvFile
                      ? "Run batch test to see predictions for all CSV rows"
                      : "Fill in the input fields and click 'Run Test Prediction' to see results"}
                  </Typography>
                </Box>
              ) : batchResults.length > 0 ? (
                <Box>
                  {/* Batch Results Alert */}
                  <Alert severity="success" sx={{ mb: 3 }}>
                    Batch results: {batchResults.length} predictions completed
                  </Alert>

                  {/* Predictions */}
                  <Box sx={{ display: "grid", gap: 2 }}>
                    {batchResults[currentBatchResultIndex]?.result.predictions.map((pred, index) => (
                      <Card
                        key={index}
                        elevation={0}
                        sx={{
                          border: "1px solid",
                          borderColor: "grey.300",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.1), 0 0 10px rgba(0,0,0,0.05)",
                          bgcolor: "#ffffff",
                          overflow: "hidden"
                        }}
                      >
                        <Box sx={{ bgcolor: "primary.main", color: "white", px: 3, py: 2 }}>
                          <Typography variant="h6" fontWeight="600">
                            {pred.model_name}
                          </Typography>
                        </Box>
                        <CardContent>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Prediction
                              </Typography>
                              <Typography variant="body1" fontWeight="600">
                                {pred.prediction_label || pred.prediction}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                              <Typography variant="caption" color="text.secondary">
                                Confidence
                              </Typography>
                              <Box>
                                <Chip
                                  label={`${Number(pred.confidence ?? 0).toFixed(2)}%`}
                                  color={
                                    (pred.confidence ?? 0) >= 80
                                      ? "success"
                                      : (pred.confidence ?? 0) >= 60
                                      ? "warning"
                                      : "error"
                                  }
                                  size="small"
                                />
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {pred.confidence_label}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              ) : testResult ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 3 }}>
                    {testResult.message}
                  </Alert>

                  <Box sx={{ display: "grid", gap: 2 }}>
                    {testResult.predictions.map((pred, index) => (
                      <Card
                        key={index}
                        elevation={0}
                        sx={{
                          border: "1px solid",
                          borderColor: "grey.300",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.1), 0 0 10px rgba(0,0,0,0.05)",
                          bgcolor: "#ffffff",
                          overflow: "hidden"
                        }}
                      >
                        <Box sx={{ bgcolor: "primary.main", color: "white", px: 3, py: 2 }}>
                          <Typography variant="h6" fontWeight="600">
                            {pred.model_name}
                          </Typography>
                        </Box>
                        <CardContent>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Prediction
                              </Typography>
                              <Typography variant="body1" fontWeight="600">
                                {pred.prediction_label || pred.prediction}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                              <Typography variant="caption" color="text.secondary">
                                Confidence
                              </Typography>
                              <Box>
                                <Chip
                                  label={`${Number(pred.confidence ?? 0).toFixed(2)}%`}
                                  color={
                                    (pred.confidence ?? 0) >= 80
                                      ? "success"
                                      : (pred.confidence ?? 0) >= 60
                                      ? "warning"
                                      : "error"
                                  }
                                  size="small"
                                />
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {pred.confidence_label}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              ) : null}
            </Paper>
          </Box>
        </Box>
      </Container>
    </PageContainer>
  );
}
