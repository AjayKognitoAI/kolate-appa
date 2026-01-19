"use client";
import React, { useState, useEffect, useMemo } from "react";
import Breadcrumb from "@/components/layout/shared/breadcrumb/Breadcrumb";
import {
  Box,
  Divider,
  Typography,
  Alert,
  Button,
  Stack,
} from "@mui/material";
import { IosShare } from "@mui/icons-material";
import {
  getCurrentProject,
} from "@/store/slices/projectsSlice";
import { useSession } from "next-auth/react";
import { useParams, useSearchParams } from "next/navigation";
import predictService from "@/services/predict/predict-service";

import ShareExecutionModal from "@/components/org/predict/ShareExecutionModal";
import { useRouter } from "next/navigation";
import ReusablePredictResult from "@/components/org/predict/shared/ReusablePredictResult";
import { TRIAL_CONFIGS, getTrialConfig, TrialConfig } from "@/utils/predict/predict-trials.config";
import { getTrialName } from "@/store/slices/moduleAccessSlice";
import GenericPredictSkeleton from "@/components/org/predict/GenericPredictSkeleton";
import { useAppSelector } from "@/store";

import BookmarkService from "@/services/bookmark/bookmark-service";
import { Bookmark } from "@mui/icons-material";

/**
 * Prediction Result Page
 *
 * NOTE: Uses composite key lookup for trial config with backward compatibility.
 * First checks for slug:default composite key, then falls back to trialSlug matching.
 */
const Page = () => {
  const project = useAppSelector(getCurrentProject);
  const { data: user } = useSession();
  const params = useParams();
  const id = params?.id as string;
  const trialSlug = params?.slug as string;

  const [execution, setExecution] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareExecution, setShareExecution] = useState("");
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const project_id = searchParams.get("project_id");

  const trialName = useAppSelector((state: any) =>
    getTrialName(state, "predict", trialSlug)
  );

  // Fetch execution record by id
  useEffect(() => {
    if (!id || !project?.project_id) return;

    setLoading(true);
    setError("");
    predictService
      .getExecutionRecordById(project_id ?? project.project_id, trialSlug, id)
      .then((res) => {
        setExecution(res?.data ?? res);
      })
      .catch(() => {
        setError("Failed to load execution record.");
      })
      .finally(() => setLoading(false));
  }, [id, project?.project_id]);

  const [bookmark, setBookmark] = useState<any | null>(null);

  useEffect(() => {
    if (!id || !project?.project_id || !user?.user?.sub) return;

    BookmarkService.getBookmark(
      user.user.sub,
      project_id ?? project.project_id,
      trialSlug,
      id
    )
      .then((res) => {
        setBookmark(res.data.data);
      })
      .catch(() => {
        // ignore
      });
  }, [id, project?.project_id, user?.user?.sub]);

  const isBookmarked = useMemo(() => {
    return !!bookmark;
  }, [bookmark]);

  const handleBookmark = () => {
    if (isBookmarked) {
      if (bookmark) {
        console.log("bookmark", bookmark);
        BookmarkService.deleteBookmark(bookmark.bookmark_id).then(() => {
          setBookmark(null);
        });
      }
    } else {
      BookmarkService.createBookmark(
        {
          project_id: project_id ?? project?.project_id,
          trial_slug: trialSlug,
          execution_id: id,
        },
        user?.user?.sub ?? ""
      ).then((res) => {
        setBookmark(res.data.data);
      });
    }
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

      <Box px={3} mt={3}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Breadcrumb
            items={[
              { title: "Predict", to: "/predict" },
              {
                title: trialName,
                to: `/predict/${trialSlug}`,
              },
              { title: `Prediction Result` },
            ]}
          />
          <Stack direction="row" spacing={1}>
            {execution?.executed_by === user?.user?.sub && (
              <Button
                variant={isBookmarked ? "contained" : "outlined"}
                startIcon={<Bookmark />}
                onClick={handleBookmark}
                disabled={loading || !execution}
              >
                {isBookmarked ? "Bookmarked" : "Bookmark"}
              </Button>
            )}
            {execution?.executed_by === user?.user?.sub && (
              <Button
                variant="outlined"
                startIcon={<IosShare />}
                onClick={() => setShareExecution(id ?? "")}
                disabled={loading || !execution}
              >
                Share
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>

      <Box px={3} mt={4}>
        {/* Loading Skeleton */}
        {loading && <GenericPredictSkeleton />}

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Data */}
        {!loading && execution && (() => {
          // Look up trial config using composite key pattern
          const compositeKey = `${trialSlug}:default`;
          let trialConfig: TrialConfig | undefined = TRIAL_CONFIGS[compositeKey];

          // Fall back to finding by trialSlug
          if (!trialConfig) {
            trialConfig = Object.values(TRIAL_CONFIGS).find(
              (c) => c.trialSlug === trialSlug
            );
          }

          if (!trialConfig?.resultDisplay) return null;

          // Normalize result data based on trial type
          let resultData;
          if (trialSlug === "car-t-cell-therapy-b") {
            // CAR T-Cell stores result as array
            resultData = execution.base_prediction;
          } else if (trialSlug === "lung-cancer-therapy-s") {
            // Lung Cancer Therapy S stores result directly
            resultData = execution.base_prediction;
          } else if (trialSlug === "squamous-lung-therapy-n") {
            // Squamous stores result as object (first item if array)
            resultData = execution.base_prediction?.[0];
          } else {
            // Lung Cancer Risk stores result as object with screens (first item if array)
            resultData = execution.base_prediction?.[0];
          }

          return (
            <ReusablePredictResult
              result={{
                patient: execution.base_patient_data,
                result: resultData,
              }}
              onBack={() => router.push(`/predict/${trialSlug}`)}
              config={trialConfig.resultDisplay}
            />
          );
        })()}

        {/* Share Modal */}
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

export default Page;
