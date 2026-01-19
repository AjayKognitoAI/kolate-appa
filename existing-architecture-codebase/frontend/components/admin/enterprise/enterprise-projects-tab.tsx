import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Skeleton,
  Grid,
} from "@mui/material";
import ProjectCard from "@/components/org/project/ProjectCard";
import {
  getEnterpriseProjectStatistics,
  getEnterpriseProjects,
} from "@/services/project/project-service";

export default function EnterpriseProjectsTab({ orgId }: { orgId: string }) {
  const [projectStats, setProjectStats] = React.useState<{
    total: number;
    active: number;
    completed: number;
  } | null>(null);
  const [projectStatsLoading, setProjectStatsLoading] = React.useState(false);
  const [projects, setProjects] = React.useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!orgId) return;
    setProjectStatsLoading(true);
    getEnterpriseProjectStatistics(orgId)
      .then((res) => {
        const stats = res.data.data;
        setProjectStats({
          total: stats.total_projects,
          active: stats.active_projects,
          completed: stats.completed_projects,
        });
      })
      .catch(() => setProjectStats(null))
      .finally(() => setProjectStatsLoading(false));
  }, [orgId]);

  React.useEffect(() => {
    if (!orgId) return;
    setProjectsLoading(true);
    getEnterpriseProjects(orgId, { page: 0, size: 6 })
      .then((res) => {
        setProjects(res.data.data.content || []);
        setTotalPages(res.data.data.total_pages || 1);
        setPage(0);
      })
      .catch(() => {
        setProjects([]);
        setTotalPages(1);
      })
      .finally(() => setProjectsLoading(false));
  }, [orgId]);

  // Infinite scroll observer
  React.useEffect(() => {
    if (projectsLoading || loadingMore) return;
    if (page + 1 >= totalPages) return;
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoadingMore(true);
          getEnterpriseProjects(orgId, { page: page + 1, size: 6 })
            .then((res) => {
              setProjects((prev) => [
                ...prev,
                ...(res.data.data.content || []),
              ]);
              setPage(page + 1);
            })
            .catch(() => {})
            .finally(() => setLoadingMore(false));
        }
      },
      { threshold: 1 }
    );
    observer.observe(node);

    return () => observer.disconnect();
    // eslint-disable-next-line
  }, [projectsLoading, loadingMore, page, totalPages, orgId]);

  return (
    <Box>
      <Box display="flex" mb={2} sx={{ background: "var(--gray-100)" }}>
        <Box>
          <CardContent sx={{ px: 4, py: 2 }}>
            <Typography variant="h3" fontWeight={600}>
              {projectStatsLoading ? (
                <Skeleton width={32} />
              ) : (
                projectStats?.total ?? "-"
              )}
            </Typography>
            <Typography variant="body2"> Total Project</Typography>
          </CardContent>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box>
          <CardContent sx={{ px: 4, py: 2 }}>
            <Typography variant="h3" fontWeight={600}>
              {projectStatsLoading ? (
                <Skeleton width={32} />
              ) : (
                projectStats?.active ?? "-"
              )}
            </Typography>
            <Typography variant="body2">Active</Typography>
          </CardContent>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box>
          <CardContent sx={{ px: 4, py: 2 }}>
            <Typography variant="h3" fontWeight={600}>
              {projectStatsLoading ? (
                <Skeleton width={32} />
              ) : (
                projectStats?.completed ?? "-"
              )}
            </Typography>
            <Typography variant="body2">Completed</Typography>
          </CardContent>
        </Box>
      </Box>
      <Grid container spacing={2}>
        {projectsLoading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <Grid size={{ xs: 6 }} key={idx}>
              <Card>
                <CardContent>
                  <Skeleton variant="rectangular" height={80} />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : projects.length > 0 ? (
          projects.map((project: any) => (
            <Grid size={{ xs: 6 }} key={project.id}>
              <ProjectCard project={project} isAdminPage />
            </Grid>
          ))
        ) : (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              No projects found.
            </Typography>
          </Grid>
        )}
      </Grid>
      <Grid container spacing={2}>
        {loadingMore &&
          Array.from({ length: 6 }).map((_, idx) => (
            <Grid size={{ xs: 6 }} key={idx}>
              <Card>
                <CardContent>
                  <Skeleton variant="rectangular" height={80} />
                </CardContent>
              </Card>
            </Grid>
          ))}
      </Grid>
      {/* IntersectionObserver trigger for infinite scroll */}
      {page + 1 < totalPages && !projectsLoading && (
        <div ref={loadMoreRef} style={{ height: 1 }} />
      )}
    </Box>
  );
}
