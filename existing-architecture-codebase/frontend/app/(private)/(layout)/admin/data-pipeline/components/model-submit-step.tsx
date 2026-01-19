"use client"

import { useState } from "react"
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  Alert,
  Divider,
} from "@mui/material"
import { IconBrain, IconCheck, IconAlertCircle, IconChartBar } from "@tabler/icons-react"

interface ModelSubmitStepProps {
  onPrevious: () => void
  onReset: () => void
  data: any
}

export default function ModelSubmitStep({ onPrevious, onReset, data }: ModelSubmitStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    // Simulate submission
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setSubmitted(true)
    setIsSubmitting(false)
  }

  return (
    <Box>
      {!submitted ? (
        <>
          {/* Submission Summary */}
          <Card sx={{ mb: 3, bgcolor: "grey.50" }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Pipeline Summary
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.5, borderBottom: 1, borderColor: "divider" }}>
                  <Typography variant="body2" color="text.secondary">
                    Data Source:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {data.uploadedFile?.name || data.dataUrl || "Unknown"}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.5, borderBottom: 1, borderColor: "divider" }}>
                  <Typography variant="body2" color="text.secondary">
                    Format:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    CSV
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.5, borderBottom: 1, borderColor: "divider" }}>
                  <Typography variant="body2" color="text.secondary">
                    Data Rows:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {data.extractedData?.rows.length || 0}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Selected Features:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {data.selectedFeatures?.length || 0} features
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* ML Model Selection */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <IconBrain size={20} color="#1e4db7" />
                <Typography variant="h6" fontWeight="bold">
                  Available ML Models
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 2,
                }}
              >
                {[
                  {
                    name: "Linear Regression",
                    desc: "Best for predicting continuous values",
                  },
                  {
                    name: "Random Forest",
                    desc: "Great for complex patterns",
                  },
                  {
                    name: "Neural Network",
                    desc: "Advanced deep learning model",
                  },
                  {
                    name: "SVM",
                    desc: "Support Vector Machine classifier",
                  },
                ].map((model) => (
                  <Card
                    key={model.name}
                    variant="outlined"
                    sx={{
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": {
                        borderColor: "primary.main",
                        boxShadow: 2,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="body1" fontWeight="bold">
                        {model.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {model.desc}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Submission Card */}
          <Card
            sx={{
              background: "linear-gradient(135deg, #1e4db7 0%, #5a7ec9 100%)",
              color: "white",
            }}
          >
            <CardContent sx={{ textAlign: "center", py: 5 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: "white",
                  color: "primary.main",
                  mx: "auto",
                  mb: 2,
                }}
              >
                <IconChartBar size={32} />
              </Avatar>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Ready to Submit?
              </Typography>
              <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
                Your data is processed and features are selected. Submit to train your ML model.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={handleSubmit}
                disabled={isSubmitting}
                sx={{
                  bgcolor: "white",
                  color: "primary.main",
                  fontWeight: "bold",
                  px: 4,
                  "&:hover": {
                    bgcolor: "grey.100",
                  },
                }}
              >
                {isSubmitting ? "Submitting..." : "Submit to ML Model"}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Success Message */}
          <Card
            sx={{
              mb: 3,
              bgcolor: "success.lighter",
              border: 1,
              borderColor: "success.light",
            }}
          >
            <CardContent sx={{ textAlign: "center", py: 5 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: "success.main",
                  mx: "auto",
                  mb: 2,
                }}
              >
                <IconCheck size={40} />
              </Avatar>
              <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: "success.dark" }}>
                Submission Successful!
              </Typography>
              <Typography variant="body1" sx={{ color: "success.dark" }}>
                Your data has been submitted to the ML model for training. The model will begin processing shortly.
              </Typography>
            </CardContent>
          </Card>

          {/* Submission Details */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Submission Details
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, pb: 2, borderBottom: 1, borderColor: "divider" }}>
                  <IconCheck size={20} color="#00c292" />
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      Data Validated
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      All records passed quality checks
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, py: 2, borderBottom: 1, borderColor: "divider" }}>
                  <IconCheck size={20} color="#00c292" />
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      Features Extracted
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {data.selectedFeatures?.length || 0} features selected
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, pt: 2 }}>
                  <IconCheck size={20} color="#00c292" />
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      Model Training Started
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Training ID: #ML-2024-001234
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Alert icon={<IconAlertCircle />} severity="info">
            <Typography variant="body1" fontWeight="bold" gutterBottom>
              What's Next?
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              <li>
                <Typography variant="body2">Monitor training progress in the Dashboard</Typography>
              </li>
              <li>
                <Typography variant="body2">View model performance metrics once ready</Typography>
              </li>
              <li>
                <Typography variant="body2">Download predictions when complete</Typography>
              </li>
            </Box>
          </Alert>
        </>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
        {!submitted && (
          <Button variant="outlined" fullWidth onClick={onPrevious} size="large">
            Previous
          </Button>
        )}
        {submitted && (
          <Button variant="contained" fullWidth onClick={onReset} size="large">
            Start New Pipeline
          </Button>
        )}
      </Box>
    </Box>
  )
}
