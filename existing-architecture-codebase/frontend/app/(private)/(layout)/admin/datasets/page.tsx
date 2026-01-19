"use client";
import { Box } from "@mui/material";
import PageContainer from "@/components/container/PageContainer";
import DatasetsTable from "./components/datasets-table";
import DatasetsHeader from "./components/datasets-header";

export default function DatasetsPage() {
  return (
    <PageContainer title="Datasets" description="Browse and manage uploaded datasets">
      <Box px={3}>
        <DatasetsHeader />
        <DatasetsTable />
      </Box>
    </PageContainer>
  );
}
