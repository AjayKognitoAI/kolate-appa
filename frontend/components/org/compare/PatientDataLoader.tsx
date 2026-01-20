"use client";
import React, { useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Button,
  Paper,
  Divider,
  Alert,
  Stack,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { toast } from "react-toastify";
import { ComparePatient } from "@/utils/compare/compare-config";
import { PATIENT_CSV_TEMPLATE } from "@/utils/compare/mock-data";
import compareService from "@/services/compare/compare-service";

interface PatientDataLoaderProps {
  open: boolean;
  onClose: () => void;
  onPatientsLoaded: (patients: ComparePatient[]) => void;
  drugId?: string;
}

const PatientDataLoader: React.FC<PatientDataLoaderProps> = ({
  open,
  onClose,
  onPatientsLoaded,
  drugId,
}) => {
  const [tab, setTab] = useState<"upload" | "sample">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const patients = await compareService.uploadPatientCsv(file);
      onPatientsLoaded(patients);
      toast.success(`Loaded ${patients.length} patients`);
      onClose();
      setFile(null);
    } catch (err) {
      setError("Failed to parse CSV file. Please check the format.");
      toast.error("Failed to upload CSV");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = async () => {
    if (!drugId) {
      toast.error("Please select a drug first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const patients = await compareService.getSamplePatients(drugId);
      onPatientsLoaded(patients);
      toast.success(`Loaded ${patients.length} sample patients`);
      onClose();
    } catch (err) {
      setError("Failed to load sample data");
      toast.error("Failed to load sample data");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([PATIENT_CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patient_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 480 },
          borderRadius: "16px 0 0 16px",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          pb: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          Load Patient Data
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, pt: 1 }}>
        <Tab label="Upload CSV" value="upload" />
        <Tab label="Sample Data" value="sample" />
      </Tabs>

      <Divider sx={{ mb: 2 }} />

      {/* Content */}
      <Box sx={{ px: 3, pb: 3, pt: 0, overflowY: "auto", flex: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {tab === "upload" && (
          <Box>
            <Typography fontWeight={600} mb={1} variant="h6">
              Upload patient data
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Upload a CSV file containing patient data. Required columns:
              patient_id, age, gender, ecog, ldh, ipi_score, diagnosis,
              prior_lines, best_response, pfs_months, os_months.
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                borderStyle: "dashed",
                borderWidth: 2,
                p: 4,
                textAlign: "center",
                background: "var(--gray-50, #fafbfc)",
                cursor: "pointer",
                mb: 2,
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "primary.main",
                  background: "var(--gray-100, #f5f5f5)",
                },
              }}
              onClick={() =>
                document.getElementById("patient-csv-upload")?.click()
              }
            >
              <input
                id="patient-csv-upload"
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <CloudUploadOutlinedIcon
                color="primary"
                sx={{ fontSize: 40, mb: 1 }}
              />
              <Typography fontWeight={500}>
                {file ? file.name : "Click to upload or drag and drop"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                CSV files only
              </Typography>
            </Paper>

            <Button
              variant="text"
              size="small"
              startIcon={<DescriptionOutlinedIcon />}
              onClick={downloadTemplate}
              sx={{ mb: 2 }}
            >
              Download CSV template
            </Button>
          </Box>
        )}

        {tab === "sample" && (
          <Box>
            <Typography fontWeight={600} mb={1} variant="h6">
              Use sample dataset
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Load a pre-generated sample dataset to explore the comparison
              feature. The sample contains realistic patient data for testing
              purposes.
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                p: 3,
                textAlign: "center",
                background: "var(--gray-50, #fafbfc)",
              }}
            >
              <Stack spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "var(--indigo-100)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <DescriptionOutlinedIcon
                    sx={{ fontSize: 28, color: "var(--indigo-700)" }}
                  />
                </Box>
                <Box>
                  <Typography fontWeight={500}>Sample Patient Dataset</Typography>
                  <Typography variant="caption" color="text.secondary">
                    20-50 patients with randomized outcomes
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          pb: 3,
          pt: 1,
          display: "flex",
          gap: 2,
          justifyContent: "flex-end",
          borderTop: "1px solid #eee",
        }}
      >
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        {tab === "upload" && (
          <Button
            variant="contained"
            disabled={!file || loading}
            onClick={handleUpload}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? "Uploading..." : "Upload"}
          </Button>
        )}
        {tab === "sample" && (
          <Button
            variant="contained"
            disabled={loading}
            onClick={handleLoadSample}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? "Loading..." : "Load Sample Data"}
          </Button>
        )}
      </Box>
    </Drawer>
  );
};

export default PatientDataLoader;
