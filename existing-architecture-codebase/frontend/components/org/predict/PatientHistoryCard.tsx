import React from "react";
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Chip,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { ExecutionRecord } from "./PatientHistoryComponent";
import { useRouter } from "next/navigation";

interface ShareInfo {
  direction: "sent" | "received";
  sender: {
    auth0_id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string;
    job_title: string | null;
  };
  recipients: Array<{
    auth0_id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string;
    job_title: string | null;
  }>;
  sharedAt: string;
}

interface BookmarkInfo {
  bookmarkedAt: string;
}

export interface PatientHistoryCardProps {
  executionRecord: ExecutionRecord;
  onMenuClick?: (
    event: React.MouseEvent<HTMLButtonElement>,
    record: ExecutionRecord
  ) => void;
  trialSlug?: string;
  shareInfo?: ShareInfo;
  bookmarkInfo?: BookmarkInfo;
}
const PatientHistoryCard: React.FC<PatientHistoryCardProps> = ({
  executionRecord,
  onMenuClick,
  trialSlug,
  shareInfo,
  bookmarkInfo,
}) => {
  const router = useRouter();
  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  /**
   * Trial-specific rendering
   */
  const renderContent = () => {
    switch (trialSlug) {
      case "lung-cancer-risk": {
        const preds = executionRecord?.base_prediction as any[];
        const patient = executionRecord?.base_patient_data;

        // Flatten all screen predictions into a single string
        const predictionSummary =
          preds?.length > 0
            ? Object.keys(preds[0])
                .map((screen) => {
                  const pred = preds[0][screen];
                  return `${screen.replace("-", " ").toUpperCase()}: ${
                    pred.prediction
                  } (${pred.confidence?.toFixed(0) ?? "-"}%)`;
                })
                .join(" | ")
            : "-";

        return (
          <>
            {/* Minimal Patient Info */}
            <Typography variant="body2" fontWeight={500}>
              Lung Cancer Risk –{" "}
              {patient?.patid || patient?.Patient_ID || "Patient"}
            </Typography>
            <Typography
              variant="caption"
              color="#5B6B86"
              sx={{ mt: 0.3, display: "block" }}
            >
              Age: {patient?.Age ?? "-"} | Gender: {patient?.Gender ?? "-"} |
              Smoking: {patient?.Smoking_History ?? "-"}
            </Typography>

            {/* Prediction Summary in Single Line */}
            <Typography
              variant="caption"
              sx={{ mt: 0.5, display: "block" }}
              color="#5B6B86"
            >
              {predictionSummary}
            </Typography>

            {/* Timestamp */}
          </>
        );
      }

      case "squamous-lung-therapy-n": {
        const patient = executionRecord?.base_patient_data;
        const predictions = executionRecord?.base_prediction?.[0] || {};

        // Extract key predictions
        const objResponse = predictions.objective_response;
        const totalAE = predictions.total_ae;
        const totalSAE = predictions.total_sae;

        return (
          <>
            {/* Minimal Patient Info */}
            <Typography variant="body2" fontWeight={500}>
              Squamous Lung Therapy N – {patient?.ALTPATID || "Patient"}
            </Typography>
            <Typography
              variant="caption"
              color="#5B6B86"
              sx={{ mt: 0.3, display: "block" }}
            >
              Age: {patient?.age_cat ?? "-"} | Smoking:{" "}
              {patient?.CIGHIST1 ?? "-"} | Treatment Arm:{" "}
              {patient?.ARMNAME ?? "-"}
            </Typography>

            {/* Objective Response */}
            {objResponse && (
              <Typography
                variant="caption"
                sx={{ mt: 0.5, display: "block" }}
                color="#5B6B86"
              >
                Objective Response:{" "}
                <Typography variant="caption" component="span" fontWeight={600}>
                  {objResponse.prediction}
                </Typography>{" "}
                ({objResponse.confidence})
              </Typography>
            )}
          </>
        );
      }

      case "car-t-cell-therapy-b": {
        const patient = executionRecord?.base_patient_data;
        const predictions = Array.isArray(executionRecord?.base_prediction)
          ? executionRecord.base_prediction
          : [];

        // Find objective response
        const objResponse = predictions.find(
          (p: any) => p.model_name === "obj_response"
        );

        return (
          <>
            {/* Minimal Patient Info */}
            <Typography variant="body2" fontWeight={500}>
              CAR T-Cell Therapy B –{" "}
              {patient?.patid || patient?.Patient_ID || "Patient"}
            </Typography>
            <Typography
              variant="caption"
              color="#5B6B86"
              sx={{ mt: 0.3, display: "block" }}
            >
              Age: {patient?.age ?? patient?.ptage ?? "-"} | Diagnosis:{" "}
              {patient?.diagnosis ?? "-"} | Stage: {patient?.stage ?? "-"}
            </Typography>

            {/* Objective Response */}
            {objResponse && (
              <Typography
                variant="caption"
                sx={{ mt: 0.5, display: "block" }}
                color="#5B6B86"
              >
                Objective Response:{" "}
                <Typography variant="caption" component="span" fontWeight={600}>
                  {objResponse.prediction}
                </Typography>{" "}
                ({objResponse.confidence_label})
              </Typography>
            )}
          </>
        );
      }

      case "lung-cancer-therapy-s": {
        const patient = executionRecord?.base_patient_data;
        const predictions = Array.isArray(executionRecord?.base_prediction)
          ? executionRecord.base_prediction
          : [];

        // Find objective response
        const objResponse = predictions.find(
          (p: any) => p.model_name === "Objective Response"
        );

        // Find overall survival
        const overallSurvival = predictions.find(
          (p: any) => p.model_name === "Overall Survival (months)"
        );

        return (
          <>
            {/* Minimal Patient Info */}
            <Typography variant="body2" fontWeight={500}>
              Lung Cancer Therapy S –{" "}
              {patient?.mask_id ? `Patient ${patient.mask_id}` : "Patient"}
            </Typography>
            <Typography
              variant="caption"
              color="#5B6B86"
              sx={{ mt: 0.3, display: "block" }}
            >
              Age: {patient?.agecat ?? "-"} | Sex: {patient?.sex ?? "-"} |
              Treatment: {patient?.arm ?? "-"}
            </Typography>

            {/* Objective Response */}
            {objResponse && (
              <Typography
                variant="caption"
                sx={{ mt: 0.5, display: "block" }}
                color="#5B6B86"
              >
                Objective Response:{" "}
                <Typography variant="caption" component="span" fontWeight={600}>
                  {objResponse.prediction_label}
                </Typography>{" "}
                ({objResponse.confidence_label})
              </Typography>
            )}

            {/* Overall Survival */}
            {overallSurvival && (
              <Typography
                variant="caption"
                sx={{ mt: 0.3, display: "block" }}
                color="#5B6B86"
              >
                Overall Survival:{" "}
                <Typography variant="caption" component="span" fontWeight={600}>
                  {overallSurvival.prediction_label}
                </Typography>{" "}
                ({overallSurvival.confidence_label})
              </Typography>
            )}
          </>
        );
      }
    }
  };

  const renderShareInfo = () => {
    if (!shareInfo) return null;

    const { direction, sender, recipients, sharedAt } = shareInfo;

    if (direction === "received") {
      return (
        <Box display="flex" flexDirection="row" sx={{ mt: 2 }} gap={2}>
          <Typography variant="caption" color="text.secondary">
            {formatDateTime(sharedAt)} {" | "}
          </Typography>

          <Typography variant="caption" color="text.secondary">
            Shared by:{" "}
            <strong>{`${sender.first_name} ${sender.last_name}`}</strong>
          </Typography>
        </Box>
      );
    } else {
      // direction === "sent"
      const displayRecipients = recipients.slice(0, 2);
      const remainingCount = recipients.length - 2;

      return (
        <Box sx={{ mt: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(sharedAt)}
              {" | "}
            </Typography>

            <Box display="flex" gap={0.5}>
              <Typography variant="caption" color="text.secondary">
                Shared with:
              </Typography>
              {displayRecipients.map((recipient, index) => (
                <Chip
                  key={recipient.auth0_id}
                  label={`${recipient.first_name} ${recipient.last_name}`}
                  size="small"
                  variant="filled"
                  sx={{
                    height: 20,
                    fontSize: "0.7rem",
                    "& .MuiChip-label": { px: 1 },
                  }}
                />
              ))}

              {remainingCount > 0 && (
                <Chip
                  label={`+${remainingCount} more`}
                  size="small"
                  variant="filled"
                  color="primary"
                  sx={{
                    height: 20,
                    fontSize: "0.7rem",
                    "& .MuiChip-label": { px: 1 },
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>
      );
    }
  };

  const renderBookmarkInfo = () => {
    if (!bookmarkInfo) return null;

    const { bookmarkedAt } = bookmarkInfo;
    return (
      <Box display="flex" flexDirection="row" sx={{ mt: 2 }} gap={2}>
        <Typography variant="caption" color="text.secondary">
          Bookmarked at: <strong>{formatDateTime(bookmarkedAt)}</strong>
        </Typography>
      </Box>
    );
  };

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 0.5,
        cursor: "pointer",
        "&:hover": { bgcolor: "grey.50" },
        boxShadow: "none",
      }}
      onClick={() =>
        router.push(`/predict/${trialSlug}/${executionRecord?.execution_id}`)
      }
    >
      <CardContent sx={{ p: 2 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box>
            {renderContent()}

            {!shareInfo && (
              <Typography
                variant="caption"
                color="#5B6B86"
                sx={{ mt: 0.5, display: "block" }}
              >
                {formatDateTime(executionRecord.executed_at)}
              </Typography>
            )}

            {renderShareInfo()}
            {bookmarkInfo && renderBookmarkInfo()}
          </Box>

          {/* Menu (3 dots) */}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onMenuClick?.(e, executionRecord);
            }}
          >
            <MoreVertIcon fontSize="inherit" />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PatientHistoryCard;
