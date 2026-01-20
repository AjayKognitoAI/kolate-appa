import React, { useState } from "react";
import { Box, Grid, InputAdornment, Stack } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CustomSelect from "@/components/forms/theme-elements/CustomSelect";
import CustomTextField from "@/components/forms/theme-elements/CustomTextField";
import ProjectCard from "./ProjectCard";
import ProjectCardSkeleton from "./ProjectCardSkeleton";
import { ProjectStatistics } from "./project-info-box";

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
];

function truncateText(text: string, maxLength: number) {
  if (text?.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

interface ProjectListProps {
  projects: any[];
  setProjects: React.Dispatch<React.SetStateAction<any[]>>;
  page: number;
  totalPages: number;
  loading: boolean;
  loadingMore: boolean;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  status: string;
  setStatus: React.Dispatch<React.SetStateAction<string>>;
  setStats?: React.Dispatch<React.SetStateAction<ProjectStatistics | null>>;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  setProjects,
  page,
  totalPages,
  loading,
  loadingMore,
  search,
  setSearch,
  status,
  setStatus,
  loadMoreRef,
  setStats,
}) => {
  const [showFullDesc, setShowFullDesc] = useState<{ [key: string]: boolean }>(
    {}
  );

  const filteredProjects = projects.filter(
    (project) => status === "all" || project.status === status
  );

  return (
    <Box sx={{ width: "100%", mt: 3 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 4 }}
      >
        <Box sx={{ width: { xs: "100%", sm: 220 } }}>
          <CustomSelect
            options={statusOptions}
            value={status}
            onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
              setStatus(e.target.value as string)
            }
            placeholder="All statuses"
            customLabel={null}
            size="small"
            sx={{
              background: "#fff",
              borderRadius: 1,
              boxShadow: "none",
              fontSize: 14,
              color: "#23272E",
            }}
          />
        </Box>
        <Box sx={{ width: { xs: "100%", sm: 400 } }}>
          <CustomTextField
            placeholder="Search"
            fullWidth
            value={search}
            onChange={(e: {
              target: { value: React.SetStateAction<string> };
            }) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#9ca3af" }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Stack>
      <Grid container spacing={3}>
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <Grid component={Grid} key={idx} size={{ xs: 12, sm: 4 }}>
                <ProjectCardSkeleton />
              </Grid>
            ))
          : filteredProjects.map((project) => {
              const isDescLong = project.description?.length > 100;
              const descToShow =
                showFullDesc[project.id] || !isDescLong
                  ? project.description
                  : truncateText(project.description, 100);
              return (
                <Grid
                  component={Grid}
                  size={{ xs: 12, sm: 4 }}
                  key={project.id}
                >
                  <ProjectCard
                    project={project}
                    onUpdateProject={(updatedProject) => {
                      setProjects((prev) =>
                        prev.map((p) =>
                          p.id === updatedProject.id
                            ? { ...p, ...updatedProject }
                            : p
                        )
                      );
                    }}
                    onDeleteProject={(project) => {
                      setProjects((prev) =>
                        prev.filter((p) => p.id !== project?.id)
                      );
                      setStats?.((prev) =>
                        prev
                          ? {
                              totalProjects: prev.totalProjects - 1,
                              activeProjects:
                                project?.status === "ACTIVE"
                                  ? prev.activeProjects - 1
                                  : prev.activeProjects,
                              completedProjects:
                                project?.status === "COMPLETED"
                                  ? prev.completedProjects - 1
                                  : prev.completedProjects,
                            }
                          : prev
                      );
                    }}
                    onMarkCompleteProject={(id) => {
                      setProjects((prev) =>
                        prev.map((p) =>
                          p.id === id ? { ...p, status: "completed" } : p
                        )
                      );
                      setStats?.((prev) =>
                        prev
                          ? {
                              ...prev,
                              completedProjects: prev.completedProjects + 1,
                              activeProjects: prev.activeProjects - 1,
                            }
                          : prev
                      );
                    }}
                  />
                </Grid>
              );
            })}
      </Grid>
      <Grid container spacing={3}>
        {loadingMore &&
          Array.from({ length: 6 }).map((_, idx) => (
            <Grid component={Grid} key={idx} size={{ xs: 12, sm: 4 }}>
              <ProjectCardSkeleton />
            </Grid>
          ))}
      </Grid>
      {/* IntersectionObserver trigger for infinite scroll */}
      {page + 1 < totalPages && !loading && (
        <div ref={loadMoreRef} style={{ height: 1 }} />
      )}
    </Box>
  );
};

export default ProjectList;
