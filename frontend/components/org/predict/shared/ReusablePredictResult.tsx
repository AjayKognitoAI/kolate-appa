import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Button,
  Chip,
  LinearProgress,
  Grid,
  Tabs,
  Tab,
} from "@mui/material";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { ResultDisplayConfig } from "@/utils/predict/predict-trials.config";
import PatientDataTable from "./PatientDataTable";
import SegregatedAETable from "./SegregatedAETable";

interface Props {
  result: { patient: any; result: any };
  onBack: () => void;
  config: ResultDisplayConfig;
  setResult?: (r: any) => void;
}

// PredictCard component for cards display type
interface PredictCardProps {
  title: string;
  confidence: string;
  confidenceColor: "success" | "error";
  value: string | number;
  progress?: number;
  progressValue?: string;
  showProgressBar?: boolean;
}

const PredictCard: React.FC<PredictCardProps> = ({
  title,
  confidence,
  confidenceColor,
  value,
  progress,
  progressValue,
  showProgressBar = false,
}) => (
  <Paper
    sx={{
      borderRadius: 2,
      p: 3,
      boxShadow: "none",
      display: "flex",
      flexDirection: "column",
      gap: 1,
      minHeight: showProgressBar ? 180 : 160,
    }}
  >
    <Typography fontWeight={600} variant="h6" mb={0.5}>
      {title}
    </Typography>
    <Box
      display="flex"
      alignItems="center"
      gap={1}
      mb={0.5}
      justifyContent="space-between"
    >
      <Typography fontWeight={600} variant="h5">
        {typeof value === "number" ? value.toFixed(2) : value}
      </Typography>
      <Chip
        label={`${confidence ?? ""} Confidence`}
        size="small"
        sx={{
          fontWeight: 500,
          fontSize: 12,
          height: 24,
          borderRadius: 1,
          background: confidenceColor === "success" ? "#219653" : "#FFF6ED",
          color: confidenceColor === "success" ? "#fff" : "#B76E00",
        }}
      />
    </Box>
    {showProgressBar && progress !== undefined && (
      <>
        <Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 10,
              borderRadius: 5,
              background: "#F1F2F6",
              "& .MuiLinearProgress-bar": {
                background: "#1755F6",
                borderRadius: 5,
              },
            }}
          />
        </Box>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
          mt={1}
        >
          <Typography fontSize={13} minWidth={120} fontWeight={600}>
            Prediction Accuracy
          </Typography>
          <Typography fontSize={13} minWidth={32} fontWeight={600}>
            {progressValue}
          </Typography>
        </Box>
      </>
    )}
  </Paper>
);

// Donut chart component for donut display type
const Donut: React.FC<{
  percent: number;
  size?: number;
  ringWidth?: number;
}> = ({ percent, size = 160, ringWidth = 18 }) => {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  const innerSize = size - ringWidth * 2;

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: `conic-gradient(from 225deg, #22C55E 0%, #EAB308 25%, #F97316 50%, #EF4444 75%, #E9EEF6 ${pct}%, #E9EEF6 100%)`,
        boxShadow: "0 6px 18px rgba(17,24,39,0.06)",
        transition: "background 400ms ease",
      }}
    >
      <Box
        sx={{
          width: innerSize,
          height: innerSize,
          borderRadius: "50%",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 1px 0 rgba(0,0,0,0.04)",
          textAlign: "center",
          p: 1,
        }}
      >
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ fontSize: 12, color: "text.secondary", mb: 0.5 }}
          >
            Confidence
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {pct % 1 === 0 ? `${pct.toFixed(0)}%` : `${pct.toFixed(1)}%`}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

function getRiskMeta(
  prediction: string,
  confidence: number,
  confidence_label?: string
) {
  const pct = Number(confidence || 0);
  if (prediction?.toLowerCase?.() === "yes") {
    if (
      pct >= 85 ||
      (confidence_label && confidence_label.toLowerCase() === "high")
    ) {
      return {
        title: "Prediction: Positive",
        message:
          "Based on smoking history and current symptoms, urgent screening is required.",
        color: "#E74C3C",
      };
    } else if (
      pct >= 50 ||
      (confidence_label && confidence_label.toLowerCase() === "moderate")
    ) {
      return {
        title: "Prediction: Moderate Risk",
        message:
          "Patient shows concerning factors including smoking history. Regular monitoring and preventive screening recommended.",
        color: "#F2994A",
      };
    } else {
      return {
        title: "Prediction: Low Risk",
        message:
          "Patient shows minimal risk factors. Continue routine preventive care and annual check-ups.",
        color: "#2ECC71",
      };
    }
  }

  if (pct >= 80) {
    return {
      title: "Prediction: Low Risk",
      message:
        "Patient shows minimal risk factors. Continue routine preventive care and annual check-ups.",
      color: "#2ECC71",
    };
  }

  return {
    title: "Prediction",
    message:
      "No immediate concerns detected. Continue routine monitoring as appropriate.",
    color: "#2ECC71",
  };
}

// Patient Header component
const PatientHeader: React.FC<{
  patient: any;
  config: ResultDisplayConfig;
  onBack: () => void;
}> = ({ patient, config, onBack }) => {
  const patientId = patient?.[config.patientIdField];
  const displayId = config.patientIdPrefix
    ? `${config.patientIdPrefix}${patientId}`
    : patientId || "Unknown ID";

  const age = patient?.[config.ageField];
  const sex = patient?.[config.sexField] || "Unknown";

  return (
    <Paper
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 3,
        py: 2,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        background:
          config.displayType === "donut"
            ? "rgba(59,53,233,0.04)"
            : "var(--indigo-100)",
      }}
      elevation={0}
    >
      <Box display="flex" alignItems="center" gap={2}>
        <Avatar
          sx={{
            bgcolor:
              config.displayType === "donut"
                ? "rgba(59,53,233,0.16)"
                : "var(--indigo-400)",
            color:
              config.displayType === "donut"
                ? "rgba(59,53,233,1)"
                : "var(--indigo-700)",
            width: 48,
            height: 48,
            fontWeight: 500,
            fontSize: 16,
          }}
        >
          P
        </Avatar>
        <Box>
          <Typography fontWeight={500} variant="body1">
            {displayId}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {age ? `${age} yrs` : ""} | {sex}
          </Typography>
        </Box>
      </Box>
      <Button
        endIcon={<ArrowForwardIosIcon sx={{ width: "14px" }} />}
        onClick={onBack}
      >
        Change Patient
      </Button>
    </Paper>
  );
};

// Cards variant renderer
const CardsRenderer: React.FC<{
  result: any;
  config: ResultDisplayConfig;
}> = ({ result, config }) => {
  const predictions = result?.result;

  const getPrediction = (key: string) => {
    if (config.dataAccessPattern === "array") {
      return Array.isArray(predictions)
        ? predictions.find((r: any) => r.model_name === key)
        : null;
    }
    return predictions?.[key];
  };

  return (
    <Paper
      sx={{
        borderRadius: 1,
        p: 0,
        mb: 3,
        boxShadow: "none",
        mt: 3,
      }}
      variant="outlined"
    >
      <Box sx={{ background: "var(--gray-50)" }} py={2}>
        <Typography fontWeight={600} variant="h5" px={3}>
          Predict Results
        </Typography>
      </Box>
      <Grid container spacing={4} px={3} py={config.showSegregatedAETable ? 2 : 4}>
        {config.predictionMetrics?.map(({ key, title, valueField, showProgressBar }) => {
          const pred = getPrediction(key);
          if (!pred) return null;

          const value =
            valueField === "prediction_label"
              ? pred?.prediction_label || pred?.prediction
              : pred?.prediction;
          const confidence = pred?.confidence_label || pred?.confidence;
          const confidenceValue =
            typeof pred?.confidence === "number"
              ? Math.round(pred.confidence)
              : 0;

          return (
            <Grid key={key} component={Grid} size={{ xs: 12, sm: 6 }}>
              <PredictCard
                title={title}
                confidence={
                  typeof confidence === "string" ? confidence : `${confidenceValue}%`
                }
                confidenceColor={
                  (typeof confidence === "string" && confidence === "High") ||
                  confidenceValue >= 70
                    ? "success"
                    : "error"
                }
                value={value}
                progress={showProgressBar ? confidenceValue : undefined}
                progressValue={showProgressBar ? `${confidenceValue}%` : undefined}
                showProgressBar={showProgressBar}
              />
            </Grid>
          );
        })}
      </Grid>

      {/* Segregated AE Table for Squamous */}
      {config.showSegregatedAETable && predictions?.segregated_ae_types && (
        <Box px={3} pb={3}>
          <SegregatedAETable
            title="Results for AE Types"
            prediction={predictions.segregated_ae_types.prediction ?? {}}
            confidence={predictions.segregated_ae_types.confidence ?? {}}
            overall_confidence={predictions.segregated_ae_types.overall_confidence}
          />
        </Box>
      )}
    </Paper>
  );
};

// Donut variant renderer
const DonutRenderer: React.FC<{
  result: any;
  config: ResultDisplayConfig;
  setResult?: (r: any) => void;
}> = ({ result, config, setResult }) => {
  const [tab, setTab] = useState(0);
  const screens = config.screens || [];

  const patient = useMemo(() => result.patient ?? {}, [result]);

  // Handle multi-screen data
  const [allScreens, setAllScreens] = useState<Record<string, any> | null>(null);
  const [currentResult, setCurrentResult] = useState(result);

  useEffect(() => {
    const maybe = result?.result;
    if (maybe && typeof maybe === "object" && screens.length > 0) {
      const hasAllScreens = screens.every((s) =>
        Object.prototype.hasOwnProperty.call(maybe, s.key)
      );
      if (hasAllScreens) {
        setAllScreens(maybe);
        const screenPred = maybe[screens[tab]?.key];
        const normalizedResult = { patient: result.patient, result: screenPred };
        setCurrentResult(normalizedResult);
        setResult?.(normalizedResult);
        return;
      }
    }
    setAllScreens(null);
    setCurrentResult(result);
  }, [result, tab, setResult, screens]);

  const displayedPrediction =
    (allScreens ? allScreens[screens[tab]?.key] : null) ??
    currentResult?.result ??
    null;

  const pct = Number(displayedPrediction?.confidence ?? 0);
  const predictionText = String(displayedPrediction?.prediction ?? "Unknown");
  const meta = getRiskMeta(
    predictionText,
    pct,
    displayedPrediction?.confidence_label
  );

  return (
    <Box>
      {/* Screen Tabs */}
      {screens.length > 0 && (
        <Box sx={{ px: 3, pb: 4, display: "flex", justifyContent: "center" }}>
          <Tabs
            value={tab}
            onChange={(_, v) => {
              setTab(v);
              const newPred = allScreens ? allScreens[screens[v]?.key] : null;
              if (newPred) {
                const updated = { patient, result: newPred };
                setCurrentResult(updated);
                setResult?.(updated);
              }
            }}
            sx={{
              bgcolor: "#F4F6FA",
              borderRadius: "8px",
              minHeight: "auto",
              "& .MuiTabs-flexContainer": { gap: 0 },
              "& .MuiTabs-indicator": { display: "none" },
              "& .MuiTab-root": {
                minHeight: "30px",
                px: 5,
                py: 1,
                fontSize: "14px",
                color: "#6B7280",
                textTransform: "none",
                borderRadius: "6px",
                margin: "4px",
                transition: "all 0.2s ease",
                "&.Mui-selected": { bgcolor: "primary.main", color: "#fff" },
                "&:hover:not(.Mui-selected)": {
                  bgcolor: "rgba(59, 130, 246, 0.1)",
                  color: "primary.main",
                },
              },
            }}
          >
            {screens.map((screen) => (
              <Tab key={screen.key} label={screen.label} />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Predictions area */}
      <Paper
        sx={{ borderRadius: 1, p: 0, mb: 3, boxShadow: "none", mt: 5 }}
        variant="outlined"
      >
        <Box sx={{ background: "#F8FAFD" }} py={2}>
          <Typography fontWeight={600} variant="h5" px={3}>
            Predictions
          </Typography>
        </Box>

        <Grid container spacing={4} px={3} py={4} alignItems="center">
          <Grid component={Grid} size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2">Prediction</Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {predictionText}
                </Typography>
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2">Confidence (%)</Typography>
                  <Typography variant="h5" sx={{ mt: 1 }}>
                    {pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ width: 180, display: "flex", justifyContent: "center" }}>
                <Donut percent={pct} size={160} ringWidth={18} />
              </Box>
            </Box>
          </Grid>

          <Grid component={Grid} size={12}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 0,
                boxShadow: "none",
                borderLeft: `4px solid ${meta.color}`,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {meta.title}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                {meta.message}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

// Main ReusablePredictResult component
const ReusablePredictResult: React.FC<Props> = ({
  result,
  onBack,
  config,
  setResult,
}) => {
  const patient = result?.patient;

  if (config.displayType === "donut") {
    return (
      <DonutRendererWithHeader
        result={result}
        config={config}
        onBack={onBack}
        setResult={setResult}
      />
    );
  }

  // Cards display type
  return (
    <Box>
      <PatientHeader patient={patient} config={config} onBack={onBack} />
      {patient && <PatientDataTable patientData={patient} />}
      <CardsRenderer result={result} config={config} />
    </Box>
  );
};

// Donut variant with header - handles the complete layout
const DonutRendererWithHeader: React.FC<{
  result: any;
  config: ResultDisplayConfig;
  onBack: () => void;
  setResult?: (r: any) => void;
}> = ({ result, config, onBack, setResult }) => {
  const [tab, setTab] = useState(0);
  const screens = config.screens || [];

  const patient = useMemo(() => result.patient ?? {}, [result]);

  // Handle multi-screen data
  const [allScreens, setAllScreens] = useState<Record<string, any> | null>(null);
  const [currentResult, setCurrentResult] = useState(result);

  useEffect(() => {
    const maybe = result?.result;
    if (maybe && typeof maybe === "object" && screens.length > 0) {
      const hasAllScreens = screens.every((s) =>
        Object.prototype.hasOwnProperty.call(maybe, s.key)
      );
      if (hasAllScreens) {
        setAllScreens(maybe);
        const screenPred = maybe[screens[tab]?.key];
        const normalizedResult = { patient: result.patient, result: screenPred };
        setCurrentResult(normalizedResult);
        setResult?.(normalizedResult);
        return;
      }
    }
    setAllScreens(null);
    setCurrentResult(result);
  }, [result, tab, setResult, screens]);

  const displayedPrediction =
    (allScreens ? allScreens[screens[tab]?.key] : null) ??
    currentResult?.result ??
    null;

  const pct = Number(displayedPrediction?.confidence ?? 0);
  const predictionText = String(displayedPrediction?.prediction ?? "Unknown");
  const meta = getRiskMeta(
    predictionText,
    pct,
    displayedPrediction?.confidence_label
  );

  return (
    <Box>
      {/* Screen Tabs */}
      {screens.length > 0 && (
        <Box sx={{ px: 3, pb: 4, display: "flex", justifyContent: "center" }}>
          <Tabs
            value={tab}
            onChange={(_, v) => {
              setTab(v);
              const newPred = allScreens ? allScreens[screens[v]?.key] : null;
              if (newPred) {
                const updated = { patient, result: newPred };
                setCurrentResult(updated);
                setResult?.(updated);
              }
            }}
            sx={{
              bgcolor: "#F4F6FA",
              borderRadius: "8px",
              minHeight: "auto",
              "& .MuiTabs-flexContainer": { gap: 0 },
              "& .MuiTabs-indicator": { display: "none" },
              "& .MuiTab-root": {
                minHeight: "30px",
                px: 5,
                py: 1,
                fontSize: "14px",
                color: "#6B7280",
                textTransform: "none",
                borderRadius: "6px",
                margin: "4px",
                transition: "all 0.2s ease",
                "&.Mui-selected": { bgcolor: "primary.main", color: "#fff" },
                "&:hover:not(.Mui-selected)": {
                  bgcolor: "rgba(59, 130, 246, 0.1)",
                  color: "primary.main",
                },
              },
            }}
          >
            {screens.map((screen) => (
              <Tab key={screen.key} label={screen.label} />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Patient Header */}
      <PatientHeader patient={patient} config={config} onBack={onBack} />

      {/* Patient Data Table */}
      {patient && <PatientDataTable patientData={patient} />}

      {/* Predictions area */}
      <Paper
        sx={{ borderRadius: 1, p: 0, mb: 3, boxShadow: "none", mt: 5 }}
        variant="outlined"
      >
        <Box sx={{ background: "#F8FAFD" }} py={2}>
          <Typography fontWeight={600} variant="h5" px={3}>
            Predictions
          </Typography>
        </Box>

        <Grid container spacing={4} px={3} py={4} alignItems="center">
          <Grid component={Grid} size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2">Prediction</Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {predictionText}
                </Typography>
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2">Confidence (%)</Typography>
                  <Typography variant="h5" sx={{ mt: 1 }}>
                    {pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ width: 180, display: "flex", justifyContent: "center" }}>
                <Donut percent={pct} size={160} ringWidth={18} />
              </Box>
            </Box>
          </Grid>

          <Grid component={Grid} size={12}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 0,
                boxShadow: "none",
                borderLeft: `4px solid ${meta.color}`,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {meta.title}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                {meta.message}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ReusablePredictResult;
