"use client"

import { Box, Typography, Card, CardContent, CardActionArea, Avatar, Alert } from "@mui/material"
import { IconUpload, IconLink, IconAlertCircle } from "@tabler/icons-react"

interface DataInputStepProps {
  onNext: (step: "upload" | "url") => void
  pipelineType: { category: string; model: string } | null
}

export default function DataInputStep({ onNext, pipelineType }: DataInputStepProps) {
  const isValidStudySelected = () => {
    return pipelineType !== null
  }

  const handleCardClick = (step: "upload" | "url") => {
    if (isValidStudySelected()) {
      onNext(step)
    }
  }

  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Choose Data Source
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Select how you'd like to provide your data
        </Typography>
      </Box>

      {!isValidStudySelected() && (
        <Alert severity="info" icon={<IconAlertCircle />} sx={{ mb: 3, maxWidth: 800, mx: "auto" }}>
          Please select a study from the dropdown above before choosing a data source
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
        }}
      >
        <Card
          sx={{
            border: 2,
            borderColor: isValidStudySelected() ? "primary.main" : "grey.300",
            opacity: isValidStudySelected() ? 1 : 0.6,
            cursor: isValidStudySelected() ? "pointer" : "not-allowed",
            "&:hover": {
              borderColor: isValidStudySelected() ? "primary.dark" : "grey.300",
              bgcolor: isValidStudySelected() ? "primary.lighter" : "transparent",
            },
          }}
        >
          <CardActionArea onClick={() => handleCardClick("upload")} sx={{ p: 3 }} disabled={!isValidStudySelected()}>
            <CardContent sx={{ textAlign: "center" }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: isValidStudySelected() ? "primary.main" : "grey.400",
                  mx: "auto",
                  mb: 2,
                }}
              >
                <IconUpload size={32} color="white" />
              </Avatar>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Upload Files
              </Typography>
              <Typography variant="body2" color="text.secondary">
                CSV, JSON, PDF, Excel, ZIP
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>

        <Card
          sx={{
            border: 2,
            borderColor: isValidStudySelected() ? "primary.main" : "grey.300",
            opacity: isValidStudySelected() ? 1 : 0.6,
            cursor: isValidStudySelected() ? "pointer" : "not-allowed",
            "&:hover": {
              borderColor: isValidStudySelected() ? "primary.dark" : "grey.300",
              bgcolor: isValidStudySelected() ? "primary.lighter" : "transparent",
            },
          }}
        >
          <CardActionArea onClick={() => handleCardClick("url")} sx={{ p: 3 }} disabled={!isValidStudySelected()}>
            <CardContent sx={{ textAlign: "center" }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: isValidStudySelected() ? "primary.main" : "grey.400",
                  mx: "auto",
                  mb: 2,
                }}
              >
                <IconLink size={32} />
              </Avatar>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Provide URL
              </Typography>
              <Typography variant="body2" color="text.secondary">
                CSV, JSON, PDF, Excel, Archives
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Supports ZIP, GZ, TAR.GZ
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>
    </Box>
  )
}
