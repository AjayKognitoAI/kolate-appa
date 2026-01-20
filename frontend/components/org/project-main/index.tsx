"use client";
import PageContainer from "@/components/container/PageContainer";
import Header from "@/components/layout/header/Header";
import ManageProjectTab from "@/components/org/project/manage-project-tab";
import ProjectCard from "@/components/org/project/ProjectCard";
import {
  projectService,
  ProjectResponse,
} from "@/services/project/project-service";
import { Box, Stack, Skeleton } from "@mui/material";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";

interface ProjectMainProps {
  id: string;
}

const ProjectMain = ({ id }: ProjectMainProps) => {
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    projectService
      .getProject(id)
      .then((res) => setProject(res.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <PageContainer
      title="Project Details"
      description="Manage your project details and settings."
    >
      {loading ? (
        <>
          {/* Header Skeleton */}
          <Skeleton variant="text" width="40%" height={40} sx={{ my: 2 }} />

          {/* Project Card Skeleton */}
          <Box
            mb={3}
            sx={{
              border: "1.5px solid #e5e7eb",
              borderRadius: 2,
              p: { xs: 2, sm: 3 },
              bgcolor: "#fff",
              minHeight: 320,
            }}
          >
            <Skeleton
              variant="rectangular"
              height={220}
              sx={{ borderRadius: 2, mb: 2 }}
            />
            <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="100%" height={22} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="80%" height={22} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="40%" height={22} sx={{ mb: 3 }} />
          </Box>

          {/* Tabs Skeleton */}
          <Skeleton
            variant="rectangular"
            width="40%"
            height={48}
            sx={{ mb: 3, borderRadius: 1 }}
          />

          {/* Table Skeleton */}
          <Skeleton
            variant="rectangular"
            width="100%"
            height={180}
            sx={{ borderRadius: 1 }}
          />
        </>
      ) : (
        <>
          <Header
            title={`Hi, ${session?.user?.firstName} ${session?.user?.lastName}!`}
            subtitle="Manage your project details and settings."
          />
          {project && (
            <Stack direction={"column"} spacing={3}>
              <ProjectCard
                project={project}
                onUpdateProject={(updatedProject) => {
                  setProject((prev) => ({ ...prev, ...updatedProject }));
                }}
                isProjectPage
              />
              <ManageProjectTab projectId={id ?? ""} setProject={setProject} />
            </Stack>
          )}
        </>
      )}
    </PageContainer>
  );
};

export default ProjectMain;
