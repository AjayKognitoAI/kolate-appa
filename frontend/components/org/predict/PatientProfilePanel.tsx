import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Divider,
  Paper,
  Avatar,
  Skeleton,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import { Description } from "@mui/icons-material";
import { toast } from "react-toastify";

import predictService from "@/services/predict/predict-service";
import squamousService from "@/services/predict/squamous-service";
import lungCancerService from "@/services/predict/lung-cancer-service";
import lungCancerTherapySService from "@/services/predict/lung-cancer-therapy-s-service";
import { useRouter } from "next/navigation";

interface PatientProfilePanelProps {
  modelName: string;
  trialSlug: string;
  openModal: (tab: "csv" | "manual") => void;
  allowManual?: boolean;
  runPrediction: (
    patient: any,
    projectId: string,
    trialSlug: string
  ) => Promise<any>;
  projectId: string;
}

const PatientProfilePanel: React.FC<PatientProfilePanelProps> = ({
  modelName,
  trialSlug,
  openModal,
  allowManual = true,
  runPrediction,
  projectId,
}) => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  // fetch sample dataset
  useEffect(() => {
    const fetchSamples = async () => {
      setLoading(true);
      try {
        let res;
        let patientsData;

        if (trialSlug === "car-t-cell-therapy-b") {
          res = await predictService.getSamplePatients();
          patientsData = res?.data?.slice(0, 2) || [];
        } else if (trialSlug === "squamous-lung-therapy-n") {
          res = await squamousService.getSamplePatients();
          patientsData = res?.data?.slice(0, 2) || [];
        } else if (trialSlug === "lung-cancer-risk") {
          res = await lungCancerService.getSampleData();
          // Flatten file objects to get individual patients
          const allPatients = res?.data?.flatMap((file: any) =>
            file.data?.map((patient: any) => ({ data: [patient] }))
          ) || [];
          patientsData = allPatients.slice(0, 2);
        } else if (trialSlug === "lung-cancer-therapy-s") {
          res = await lungCancerTherapySService.getSampleData();
          // Flatten file objects to get individual patients
          const allPatients = res?.data?.flatMap((file: any) =>
            file.data?.map((patient: any) => ({ data: [patient] }))
          ) || [];
          patientsData = allPatients.slice(0, 2);
        }

        setPatients(patientsData || []);
      } catch (err) {
        toast.error("Failed to load sample patients");
      } finally {
        setLoading(false);
      }
    };
    fetchSamples();
  }, [trialSlug]);

  const handleRunPrediction = async (patient: any) => {
    const loadingToastId = toast.loading("Running prediction...");
    try {
      const prediction = await runPrediction(patient, projectId, trialSlug);
      console.log("Prediction", prediction);
      router.push(`/predict/${trialSlug}/${prediction?.execution_id}`);
      toast.dismiss(loadingToastId);
      toast.success("Prediction completed successfully!");
    } catch {
      toast.dismiss(loadingToastId);
      toast.error("Failed to run prediction.");
    }
  };

  const getSampleDisplay = (p: any, i: number, trialSlug: string) => {
    const pd = p?.data?.[0] || {};

    if (trialSlug === "car-t-cell-therapy-b") {
      return {
        name: `Patient ${i + 1}`,
        age: pd.ptage || "-",
        gender: pd.sex_id || "Unknown",
      };
    }

    if (trialSlug === "squamous-lung-therapy-n") {
      return {
        name: pd.ALTPATID || `Patient ${i + 1}`,
        age: pd.age_cat || "-",
        gender: pd.SEX || "Unknown",
      };
    }

    if (trialSlug === "lung-cancer-risk") {
      return {
        name: pd.Patient_ID || `Patient ${i + 1}`,
        age: pd.Age,

        gender: pd.Gender || "Unknown",
      };
    }

    if (trialSlug === "lung-cancer-therapy-s") {
      return {
        name: `Patient ${i + 1}`,
        age: pd.agecat || "-",
        gender: pd.sex || "Unknown",
      };
    }

    // fallback
    return {
      name: `Patient ${i + 1}`,
      age: pd.ptage || pd.age_cat || "-",
      gender: pd.sex_id || pd.SEX || "Unknown",
    };
  };

  return (
    <Paper
      elevation={0}
      sx={{ borderRadius: 1, mt: 2, overflow: "hidden" }}
      variant="outlined"
    >
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={3}
        py={1}
        sx={{ background: "var(--gray-100)", borderRadius: 0 }}
        flexDirection={{ xs: "column", sm: "row" }}
      >
        <Typography variant="h6" fontWeight={600}>
          Patient profile ({modelName})
        </Typography>

        <Button onClick={() => openModal("csv")}>
          <CloudUploadOutlinedIcon sx={{ mr: 1, fontSize: 20 }} /> Upload
          patient profiles
        </Button>
      </Box>

      <Box
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        gap={2}
        my={3}
      >
        {/* Left Section - Sample Patients */}
        <Box
          flex={1}
          display="flex"
          flexDirection="column"
          alignItems="center"
          px={4}
          pb={4}
        >
          <Description color="primary" sx={{ fontSize: 40, mb: 1 }} />
          <Typography fontWeight={600} mb={2}>
            Try KolateAI data
          </Typography>
          <Typography
            color="text.secondary"
            align="center"
            mb={2}
            maxWidth={400}
            variant="body2"
          >
            Explore KolateAI instantly with pre-loaded patient profiles. Perfect
            for testing and learning.
          </Typography>

          <Typography>KolateAI Dataset</Typography>

          {loading ? (
            <Box display="flex" gap={2}>
              {[1, 2].map((i) => (
                <Paper key={i} sx={{ p: 2, minWidth: 150, borderRadius: 1 }}>
                  <Skeleton variant="circular" width={30} height={30} />
                  <Skeleton width="80%" />
                </Paper>
              ))}
            </Box>
          ) : (
            <Box display="flex" gap={2} mt={1}>
              {patients.map((p, i) => {
                const pd = getSampleDisplay(p, i, trialSlug);

                const displayName = pd?.name;
                const age = pd?.age || "-";
                const gender = pd?.gender || "Unknown";

                return (
                  <Paper
                    key={i}
                    variant="outlined"
                    sx={{
                      p: "10px 20px",
                      minWidth: 160,
                      borderRadius: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      cursor: "pointer",
                    }}
                    onClick={() => handleRunPrediction(p?.data?.[0])}
                  >
                    <Avatar
                      sx={{
                        bgcolor: "#E6E6FA",
                        color: "#7B61FF",
                        fontSize: "16px",
                      }}
                    >
                      P
                    </Avatar>
                    <Box>
                      <Typography fontWeight={500} variant="body2">
                        {displayName}
                      </Typography>
                      <Typography fontSize={12} color="text.secondary">
                        {age} yrs | {gender}
                      </Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>

        {/* Divider */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "row", md: "column" },
            alignItems: "center",
            gap: 1,
            justifyContent: "center",
          }}
        >
          <Divider
            orientation="horizontal"
            sx={{
              display: { xs: "block", md: "none" },
              mx: 1,
              flex: 1,
              borderStyle: "dashed",
              borderWidth: 1.5,
            }}
          />
          <Divider
            orientation="vertical"
            sx={{
              display: { xs: "none", md: "block" },
              mx: 1,
              flex: 1,
              borderStyle: "dashed",
              borderWidth: 1.5,
            }}
          />
          <Typography variant="caption" fontWeight={600}>
            (Or)
          </Typography>
          <Divider
            orientation="horizontal"
            sx={{
              display: { xs: "block", md: "none" },
              mx: 1,
              flex: 1,
              borderStyle: "dashed",
              borderWidth: 1.5,
            }}
          />
          <Divider
            orientation="vertical"
            sx={{
              display: { xs: "none", md: "block" },
              mx: 1,
              flex: 1,
              borderStyle: "dashed",
              borderWidth: 1.5,
            }}
          />
        </Box>

        {/* Right Section - Upload / Manual */}
        <Box
          flex={1}
          display="flex"
          flexDirection="column"
          alignItems="center"
          px={4}
          pb={4}
        >
          <Description color="primary" sx={{ fontSize: 40, mb: 1 }} />
          <Typography fontWeight={600} mb={2}>
            Add your own patients
          </Typography>
          <Typography
            color="text.secondary"
            align="center"
            mb={2}
            maxWidth={400}
            variant="body2"
          >
            Upload files or manually enter patient data for personalized AI
            analysis.
          </Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => openModal("csv")}
            >
              Upload patient
            </Button>
            {allowManual && (
              <Button variant="outlined" onClick={() => openModal("manual")}>
                Add manually enter
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default PatientProfilePanel;
