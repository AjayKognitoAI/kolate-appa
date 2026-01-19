"use client";

import { Box } from "@mui/material";
import PageContainer from "@/components/container/PageContainer";
import OrgDashboardHeader from "@/components/org/org-dashboard/dashboard-header";
import OrgDashboardBody from "@/components/org/org-dashboard/org-dashboard-body";

export default function DashboardPage() {
  return (
    <PageContainer title="Dashboard" description="Admin Dashboard">
      <Box px={3}>
        <OrgDashboardHeader />
      </Box>
      <OrgDashboardBody />
    </PageContainer>
  );
}
