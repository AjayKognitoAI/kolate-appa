"use client";

import React from "react";
import { Box } from "@mui/material";
import PageContainer from "@/components/container/PageContainer";
import Header from "@/components/layout/header/Header";
import InsightsDashboard from "@/components/insights/InsightsDashboard";

export default function InsightsPage() {
  return (
    <PageContainer
      title="Insights"
      description="Model-identified responder characteristics and analytics"
    >
      <Box px={3}>
        <Box mb={3}>
          <Header
            title="Insights"
            subtitle="Explore model-identified responder characteristics and key analytics"
          />
        </Box>
        <InsightsDashboard />
      </Box>
    </PageContainer>
  );
}
