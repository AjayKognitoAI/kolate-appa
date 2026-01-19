"use client";
import React, { useState, useEffect } from "react";
import { Box, Divider, Typography, Alert, Button, Stack } from "@mui/material";
import { IconAdjustments } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Breadcrumb from "@/components/layout/shared/breadcrumb/Breadcrumb";
import PatientProfilePanel from "@/components/org/predict/PatientProfilePanel";
import PatientTable from "@/components/org/predict/PatientTable";
import PredictSectionTabs from "@/components/org/predict/PredictSectionTabs";
import PatientHistoryComponent from "@/components/org/predict/PatientHistoryComponent";
import TrialSharesComponent from "@/components/org/predict/TrialSharesComponent";
import ShareExecutionModal from "@/components/org/predict/ShareExecutionModal";
import {
  getCurrentProject,
  getCurrentProjectPermission,
} from "@/store/slices/projectsSlice";
import { PatientRecord } from "@/services/predict/predict-service";
import { PatientTableSkeleton } from "./PatientTableSkeleton";
import { TrialConfig } from "@/utils/predict/predict-trials.config";
import { getTrialName } from "@/store/slices/moduleAccessSlice";
import { useAppSelector } from "@/store";

import BookmarksTab from "./BookmarksTab";
import AddPatientProfileModal from "./shared/AddPatientProfileModal";

interface ReusablePredictPageProps {
  config: TrialConfig;
}

export const ReusablePredictPage: React.FC<ReusablePredictPageProps> = ({
  config,
}) => {
  const {
    trialSlug,
    allowManual = false,
    hasCharacteristics = false,
    extraColumns,
    modalConfig,
    predictService,
    resultDisplay,
  } = config;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"csv" | "manual">("csv");
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [shareExecution, setShareExecution] = useState("");

  const project = useAppSelector(getCurrentProject);
  const { data: user } = useSession();
  const router = useRouter();

  const trialName = useAppSelector((state: any) =>
    getTrialName(state, "predict", trialSlug)
  );

  const trialPermission = useAppSelector((state) =>
    getCurrentProjectPermission(state, "PREDICT")
  );

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const openModal = (tab: "csv" | "manual" = "csv") => {
    if (allowManual) {
      setModalTab(tab);
    }
    setModalOpen(true);
  };

  // Fetch patients on mount
  useEffect(() => {
    if (!project?.project_id) return;

    setLoading(true);
    setError("");
    predictService
      .getAllPatientRecords(project.project_id, trialSlug)
      .then((res) => {
        setPatients(res?.data || []);
      })
      .catch(() => {
        setError("Failed to fetch patient records.");
      })
      .finally(() => setLoading(false));
  }, [project?.project_id, trialSlug, predictService]);

  const handleNavigation = (record: any) => {
    router.push(`/predict/${trialSlug}/${record?.execution_id}`);
  };

  return (
    <Box>
      {/* Header */}
      <Box px={3} py={2} display="flex" alignItems="center">
        <Typography fontWeight={500} variant="h4">
          Predict
        </Typography>
      </Box>
      <Divider />

      {/* Breadcrumb and Actions */}
      <Box px={3} mt={3}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Breadcrumb
            items={[
              { title: "Home", to: "/dashboard" },
              { title: "Predict", to: "/predict" },
              { title: trialName },
            ]}
          />

          {hasCharacteristics && (
            <Button
              variant="outlined"
              LinkComponent={Link}
              href={`/predict/${trialSlug}/characteristics`}
              size="small"
              startIcon={<IconAdjustments size={16} />}
            >
              Key Characteristics of Responders
            </Button>
          )}
        </Stack>
      </Box>

      {/* Tabs */}
      <PredictSectionTabs
        onChange={handleTabChange}
        value={tabValue}
        permission={trialPermission}
      />

      {/* Main Content */}
      <Box px={3} mt={4}>
        {trialPermission === "FULL_ACCESS" ? (
          <>
            {tabValue === 0 ? (
              <Box>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {loading ? (
                  <PatientTableSkeleton />
                ) : (
                  <>
                    {patients.length === 0 ? (
                      <PatientProfilePanel
                        modelName={trialName ?? ""}
                        openModal={openModal}
                        allowManual={allowManual}
                        projectId={project?.project_id ?? ""}
                        trialSlug={trialSlug}
                        runPrediction={async (p: any) =>
                          (
                            await predictService.predict(
                              p,
                              project?.project_id ?? ""
                            )
                          )?.data
                        }
                      />
                    ) : (
                      <PatientTable
                        projectId={project?.project_id ?? ""}
                        trialSlug={trialSlug}
                        modelName={trialName ?? ""}
                        patients={patients}
                        setPatients={setPatients}
                        onAddPatient={() => openModal("csv")}
                        extraColumns={extraColumns}
                        navigation={handleNavigation}
                      />
                    )}
                  </>
                )}
              </Box>
            ) : tabValue === 1 ? (
              <PatientHistoryComponent
                getExecutionRecords={predictService.getExecutionRecords}
                projectId={project?.project_id ?? ""}
                trialSlug={trialSlug}
                onViewDetails={handleNavigation}
              />
            ) : tabValue === 2 ? (
              <BookmarksTab trialSlug={trialSlug} />
            ) : tabValue === 3 ? (
              <TrialSharesComponent
                projectId={project?.project_id ?? ""}
                trialSlug={trialSlug}
                auth0Id={user?.user?.sub ?? ""}
                onViewDetails={(record: any) => {
                  router.push(
                    `/predict/${trialSlug}/${record?.execution?.execution_id}`
                  );
                }}
              />
            ) : null}
          </>
        ) : (
          <TrialSharesComponent
            projectId={project?.project_id ?? ""}
            trialSlug={trialSlug}
            auth0Id={user?.user?.sub ?? ""}
            onViewDetails={(record: any) => {
              router.push(
                `/predict/${trialSlug}/${record?.execution?.execution_id}`
              );
            }}
          />
        )}

        {/* Modals */}
        {modalOpen && (
          <AddPatientProfileModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            defaultTab={allowManual ? modalTab : undefined}
            setPatients={setPatients}
            projectId={project?.project_id ?? ""}
            trialSlug={trialSlug}
            navigation={handleNavigation}
            modalConfig={modalConfig}
            resultDisplay={resultDisplay}
            runPrediction={modalConfig.runPrediction}
          />
        )}

        {Boolean(shareExecution) && (
          <ShareExecutionModal
            projectId={project?.project_id ?? ""}
            trialSlug={trialSlug}
            executionId={shareExecution}
            senderId={user?.user?.sub ?? ""}
            onClose={() => setShareExecution("")}
            open={Boolean(shareExecution)}
            initialSelectedUsers={[]}
          />
        )}
      </Box>
    </Box>
  );
};
