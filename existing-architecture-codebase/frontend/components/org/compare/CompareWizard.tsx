"use client";
import React, { useState, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Grid,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Collapse,
  IconButton,
} from "@mui/material";
import { toast } from "react-toastify";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import DrugSelector from "./DrugSelector";
import PatientDataLoader from "./PatientDataLoader";
import PatientPreviewTable from "./PatientPreviewTable";
import PatientIdSelector from "./PatientIdSelector";
import ComparisonFilterPanel from "./ComparisonFilterPanel";
import ComparatorSummaryCard from "./ComparatorSummaryCard";
import ComparisonResultsPanel from "./ComparisonResultsPanel";
import ComparisonProgressIndicator from "./ComparisonProgressIndicator";
import DrugIteratorControls from "./DrugIteratorControls";
import { StudyOption } from "./CompareStudySelector";

import {
  ComparePatient,
  ComparisonResult,
  FilterState,
  AVAILABLE_DRUGS,
  DEFAULT_FILTER_STATE,
} from "@/utils/compare/compare-config";
import compareService from "@/services/compare/compare-service";

const STEPS = [
  { label: "Select Drugs", description: "Choose comparator and target drugs" },
  { label: "Load Patients", description: "Upload or load patient data" },
  { label: "Filter & Select", description: "Apply filters and select patients" },
  { label: "Run Comparison", description: "Execute and view results" },
];

interface CompareWizardProps {
  study: StudyOption;
  onBack: () => void;
}

const CompareWizard: React.FC<CompareWizardProps> = ({ study, onBack }) => {
  // Stepper state
  const [activeStep, setActiveStep] = useState(0);

  // Drug selection state
  const [comparatorDrugId, setComparatorDrugId] = useState("");
  const [targetDrugId, setTargetDrugId] = useState("");

  // Patient data state
  const [patients, setPatients] = useState<ComparePatient[]>([]);
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);

  // Filter state
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);

  // UI state
  const [dataLoaderOpen, setDataLoaderOpen] = useState(false);
  const [showPatientSelector, setShowPatientSelector] = useState(false);

  // Comparison state
  const [isComparing, setIsComparing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  // Filter available drugs based on study category
  const studyDrugs = useMemo(() => {
    return AVAILABLE_DRUGS.filter((d) => d.category === study.category);
  }, [study.category]);

  // Get selected drugs
  const comparatorDrug = AVAILABLE_DRUGS.find((d) => d.id === comparatorDrugId);
  const targetDrug = AVAILABLE_DRUGS.find((d) => d.id === targetDrugId);

  // Calculate filtered patient count
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      if (patient.ldh < filters.ldh[0] || patient.ldh > filters.ldh[1]) return false;
      if (patient.age < filters.age[0] || patient.age > filters.age[1]) return false;
      if (filters.ecog.length > 0 && !filters.ecog.includes(String(patient.ecog))) return false;
      if (filters.gender.length > 0 && !filters.gender.includes(patient.gender)) return false;
      if (patient.prior_lines < filters.priorLines[0] || patient.prior_lines > filters.priorLines[1]) return false;

      if (filters.ipi.length > 0) {
        const ipiCategory =
          patient.ipi_score <= 1
            ? "0-1"
            : patient.ipi_score === 2
            ? "2"
            : patient.ipi_score === 3
            ? "3"
            : "4-5";
        if (!filters.ipi.includes(ipiCategory)) return false;
      }

      return true;
    });
  }, [patients, filters]);

  // Effective selected count
  const effectiveSelectedCount =
    selectedPatientIds.length > 0
      ? filteredPatients.filter((p) => selectedPatientIds.includes(p.patient_id)).length
      : filteredPatients.length;

  // Check if can proceed to next step
  const canProceed = useMemo(() => {
    switch (activeStep) {
      case 0:
        return comparatorDrugId && targetDrugId;
      case 1:
        return patients.length > 0;
      case 2:
        return effectiveSelectedCount > 0;
      case 3:
        return true;
      default:
        return false;
    }
  }, [activeStep, comparatorDrugId, targetDrugId, patients.length, effectiveSelectedCount]);

  // Check if ready to compare
  const canCompare =
    comparatorDrugId && targetDrugId && patients.length > 0 && effectiveSelectedCount > 0;

  // Handle patient data loaded
  const handlePatientsLoaded = useCallback((newPatients: ComparePatient[]) => {
    setPatients(newPatients);
    setSelectedPatientIds([]);
    setComparisonResult(null);
  }, []);

  // Handle clear patients
  const handleClearPatients = useCallback(() => {
    setPatients([]);
    setSelectedPatientIds([]);
    setComparisonResult(null);
  }, []);

  // Handle step navigation
  const handleNext = () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  // Handle run comparison
  const handleRunComparison = async () => {
    if (!canCompare) return;

    setIsComparing(true);
    setProgressStep(0);
    setProgressMessage("Initializing...");
    setComparisonResult(null);

    try {
      const result = await compareService.runComparison(
        comparatorDrugId,
        targetDrugId,
        patients,
        filters,
        selectedPatientIds,
        (step, total, message) => {
          setProgressStep(step);
          setProgressMessage(message);
        }
      );

      setComparisonResult(result);
      toast.success("Comparison completed!");
    } catch (error) {
      toast.error("Comparison failed. Please try again.");
      console.error("Comparison error:", error);
    } finally {
      setIsComparing(false);
      setProgressStep(0);
    }
  };

  // Handle export results
  const handleExportResults = async () => {
    if (!comparisonResult) return;

    try {
      const csv = await compareService.exportResults(comparisonResult);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comparison_${comparatorDrug?.shortName}_vs_${targetDrug?.shortName}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Results exported!");
    } catch (error) {
      toast.error("Export failed");
    }
  };

  // Handle target drug iteration
  const handleTargetDrugChange = (newDrugId: string) => {
    setTargetDrugId(newDrugId);
    setComparisonResult(null);
  };

  // Render step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Select the drugs you want to compare within the {study.category} category.
            </Typography>
            <Grid container spacing={3}>
              <Grid component={Grid} size={{ xs: 12, md: 6 }}>
                <DrugSelector
                  label="Comparator Drug (Baseline)"
                  value={comparatorDrugId}
                  onChange={setComparatorDrugId}
                  drugs={studyDrugs}
                  excludeDrugId={targetDrugId}
                  placeholder="Select comparator drug..."
                  helperText="The baseline therapy to compare against"
                />
              </Grid>
              <Grid component={Grid} size={{ xs: 12, md: 6 }}>
                <DrugSelector
                  label="Target Drug"
                  value={targetDrugId}
                  onChange={setTargetDrugId}
                  drugs={studyDrugs}
                  excludeDrugId={comparatorDrugId}
                  placeholder="Select target drug..."
                  helperText="The therapy to compare with the baseline"
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
              <Typography variant="body2" color="text.secondary">
                Upload patient data from a CSV file or load sample data.
              </Typography>
              <Stack direction="row" spacing={1}>
                {patients.length > 0 && (
                  <Button variant="text" size="small" color="error" onClick={handleClearPatients}>
                    Clear Data
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<FileUploadOutlinedIcon />}
                  onClick={() => setDataLoaderOpen(true)}
                >
                  {patients.length > 0 ? "Replace Data" : "Load Patient Data"}
                </Button>
              </Stack>
            </Stack>

            <PatientPreviewTable
              patients={patients}
              selectedIds={selectedPatientIds}
              onSelectionChange={setSelectedPatientIds}
              onClearPatients={patients.length > 0 ? handleClearPatients : undefined}
              maxHeight="400px"
            />
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Apply filters to select specific patient subgroups for comparison.
            </Typography>
            <Grid container spacing={3}>
              <Grid component={Grid} size={{ xs: 12, lg: 8 }}>
                <Stack spacing={2}>
                  <ComparisonFilterPanel
                    filters={filters}
                    onFiltersChange={setFilters}
                    patientCount={patients.length}
                    filteredCount={filteredPatients.length}
                  />

                  <Button
                    variant="text"
                    onClick={() => setShowPatientSelector(!showPatientSelector)}
                    endIcon={showPatientSelector ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    {showPatientSelector ? "Hide" : "Show"} Patient Selection
                    {selectedPatientIds.length > 0 && ` (${selectedPatientIds.length} selected)`}
                  </Button>

                  <Collapse in={showPatientSelector}>
                    <PatientIdSelector
                      patients={filteredPatients}
                      selectedIds={selectedPatientIds}
                      onChange={setSelectedPatientIds}
                      maxHeight="250px"
                    />
                  </Collapse>
                </Stack>
              </Grid>

              <Grid component={Grid} size={{ xs: 12, lg: 4 }}>
                <ComparatorSummaryCard
                  drug={comparatorDrug}
                  patients={patients}
                  filteredCount={filteredPatients.length}
                  selectedCount={
                    selectedPatientIds.length > 0
                      ? selectedPatientIds.filter((id) =>
                          filteredPatients.some((p) => p.patient_id === id)
                        ).length
                      : 0
                  }
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Stack spacing={3}>
              {/* Drug Iterator Controls */}
              {targetDrugId && comparatorDrugId && (
                <DrugIteratorControls
                  drugs={studyDrugs}
                  currentDrugId={targetDrugId}
                  onDrugChange={handleTargetDrugChange}
                  excludeDrugId={comparatorDrugId}
                  label="Iterate target drug:"
                />
              )}

              {/* Validation Alerts */}
              {effectiveSelectedCount === 0 && (
                <Alert severity="warning">
                  No patients match current filters. Go back and adjust filters to include patients.
                </Alert>
              )}

              {/* Run Button */}
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleRunComparison}
                  disabled={!canCompare || isComparing}
                  sx={{ minWidth: 200 }}
                >
                  {isComparing ? "Running..." : "Run Comparison"}
                </Button>

                {comparisonResult && (
                  <Button
                    variant="outlined"
                    startIcon={<DownloadOutlinedIcon />}
                    onClick={handleExportResults}
                  >
                    Export Results
                  </Button>
                )}
              </Stack>

              {/* Results */}
              {comparisonResult && (
                <Box mt={2}>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Comparison Results
                  </Typography>
                  <ComparisonResultsPanel
                    result={comparisonResult}
                    comparatorDrugId={comparatorDrugId}
                    targetDrugId={targetDrugId}
                  />
                </Box>
              )}
            </Stack>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Back to Study Selection */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={onBack}
        sx={{ mb: 2 }}
        color="inherit"
      >
        Back to Study Selection
      </Button>

      {/* Study Title */}
      <Typography variant="h6" fontWeight={600} mb={3}>
        {study.name}
      </Typography>

      {/* Stepper */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                optional={
                  <Typography variant="caption" color="text.secondary">
                    {step.description}
                  </Typography>
                }
              >
                {step.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step Content */}
      <Paper sx={{ p: 3, mb: 3, minHeight: 300 }}>{renderStepContent()}</Paper>

      {/* Navigation Buttons */}
      <Box display="flex" justifyContent="space-between">
        <Button
          variant="outlined"
          onClick={handleBack}
          disabled={activeStep === 0}
          color="inherit"
        >
          Previous
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={!canProceed || activeStep === STEPS.length - 1}
        >
          Next
        </Button>
      </Box>

      {/* Patient Data Loader Drawer */}
      <PatientDataLoader
        open={dataLoaderOpen}
        onClose={() => setDataLoaderOpen(false)}
        onPatientsLoaded={handlePatientsLoaded}
        drugId={comparatorDrugId}
      />

      {/* Progress Indicator */}
      <ComparisonProgressIndicator
        open={isComparing}
        currentStep={progressStep}
        totalSteps={4}
        message={progressMessage}
        onCancel={() => setIsComparing(false)}
      />
    </Box>
  );
};

export default CompareWizard;
