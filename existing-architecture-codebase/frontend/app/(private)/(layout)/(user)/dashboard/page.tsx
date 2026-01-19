"use client";
import { Grid, Box, Button, TextField, Paper, Typography } from "@mui/material";
import PageContainer from "@/components/container/PageContainer";

import React from "react";
import { useSession } from "next-auth/react";
import Header from "@/components/layout/header/Header";
import {
  ArrowForwardIos,
  ChatBubbleOutline,
  CompareArrows,
  Insights,
  Science,
  Star,
  StarBorder,
  Update,
} from "@mui/icons-material";

const features = [
  {
    icon: <CompareArrows sx={{ color: "#6b6f76", fontSize: 22, mr: 1 }} />,
    title: "Recent Comparisons",
    description: "View your most recent treatment comparisons",
  },
  {
    icon: <Science sx={{ color: "#6b6f76", fontSize: 22, mr: 1 }} />,
    title: "Treatment Recommendations",
    description: "AI-powered suggestions based on clinical data",
  },
  {
    icon: <Insights sx={{ color: "#6b6f76", fontSize: 22, mr: 1 }} />,
    title: "Patient Insights",
    description: "Discover patterns across your patient cohorts",
  },
  {
    icon: <Update sx={{ color: "#6b6f76", fontSize: 22, mr: 1 }} />,
    title: "Data Updates",
    description: "3 new data updates available to review",
  },
];
const questions = [
  {
    text: "Which biomarkers predict response to immunotherapy in MSS colorectal cancer?",
    active: false,
  },
  {
    text: "How do dosing schedules affect toxicity profiles in elderly patients?",
    active: false,
  },
  {
    text: "What is the impact of prior lines of therapy on treatment response?",
    active: false,
  },
  {
    text: "How does age affect response to Panitumumab vs standard care?",
    active: true,
  },
];
export default function Dashboard() {
  const { data: session } = useSession();

  return (
    <PageContainer
      title="Dashboard"
      description="clinical decision support dashboard"
    >
      <Box px={3}>
        <Box mb={3}>
          <Header
            title={`Hi, ${session?.user?.firstName} ${session?.user?.lastName}!`}
            subtitle="Here's your clinical decision support dashboard"
          />
        </Box>

        <Grid container spacing={3} mt={2} mb={2}>
          {features.map((feature, idx) => (
            <Grid size={{ xs: 12, sm: 6 }} key={idx}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: "1px solid #ececf1",
                  minHeight: 110,
                }}
              >
                <Box display="flex" alignItems="center" mb={0.5}>
                  {feature.icon}
                  <Typography variant="h6">{feature.title}</Typography>
                </Box>
                <Typography
                  color="text.secondary"
                  variant="body2"
                  sx={{ width: "50%" }}
                >
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
        <Typography fontWeight={500} variant="h6" mt={4} mb={2}>
          Suggested Questions
        </Typography>
        <Box>
          {questions.map((q, idx) => (
            <Paper
              key={idx}
              elevation={0}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 2.2,
                mb: 1.5,
                borderRadius: 1,
                border: "1px solid #ececf1",
                bgcolor: "#fafbfc",
                boxShadow: "none",
                cursor: "pointer",
                transition: "border 0.2s, background 0.2s",
                "&:hover": { bgcolor: "#f5faff" },
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <ChatBubbleOutline sx={{ fontSize: 14 }} color="primary" />
                <Typography
                  variant="body2"
                  color={q.active ? "primary" : "textSecondary"}
                >
                  {q.text}
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={1.5}>
                {q.active ? (
                  <Star sx={{ fontSize: 22 }} color="primary" />
                ) : (
                  <StarBorder sx={{ fontSize: 22 }} color="secondary" />
                )}
                <ArrowForwardIos sx={{ fontSize: 14 }} color="secondary" />
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    </PageContainer>
  );
}
