"use client";
import { Box } from "@mui/material";
import PageContainer from "@/components/container/PageContainer";
import TrialsTable from "./components/trials-table";
import TrialsHeader from "./components/trials-header";
import { useState } from "react";

export default function TrialsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <PageContainer title="Studies Management" description="Manage trial configurations">
      <Box px={3}>
        <TrialsHeader onRefresh={handleRefresh} onTrialCreated={handleRefresh} />
        <TrialsTable refreshTrigger={refreshTrigger} onRefresh={handleRefresh} />
      </Box>
    </PageContainer>
  );
}
