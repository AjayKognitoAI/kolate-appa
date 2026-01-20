"use client";
import { Box } from "@mui/material";
import PageContainer from "@/components/container/PageContainer";
import TasksTable from "./components/tasks-table";
import TasksHeader from "./components/tasks-header";

export default function DataPipelineTasksPage() {
  return (
    <PageContainer title="Data Pipeline Tasks" description="View and manage download tasks">
      <Box px={3}>
        <TasksHeader />
        <TasksTable />
      </Box>
    </PageContainer>
  );
}
