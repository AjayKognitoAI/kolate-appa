"use client";
import PageContainer from "@/components/container/PageContainer";
import ProjectHeader from "@/components/org/project/project-header";
import ProjectInfoBox, {
  ProjectStatistics,
} from "@/components/org/project/project-info-box";
import ProjectList from "@/components/org/project/ProjectList";
import { projectService } from "@/services/project/project-service";
import { Box } from "@mui/material";
import React, { useState, useRef, useEffect } from "react";

const Project = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = React.useState<ProjectStatistics | null>(null);

  // Modular API call for fetching projects
  const fetchProjectsPage = async ({
    searchPattern,
    page,
    size = 6,
  }: {
    searchPattern?: string;
    page: number;
    size?: number;
  }) => {
    return projectService.searchProjects({
      name_pattern: searchPattern || undefined,
      page,
      size,
      sort_by: "createdAt",
      sort_direction: "desc",
      status: status !== "all" ? status : undefined,
    });
  };

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const res = await fetchProjectsPage({
        searchPattern: search,
        page: 0,
        size: 6,
      });
      setProjects(res.data?.content || []);
      setPage(0);
      // Calculate total pages from total_elements and size
      const totalElements = res.data?.total_elements || 0;
      const pageSize = 6;
      setTotalPages(Math.ceil(totalElements / pageSize) || 1);
    } catch (e) {
      setProjects([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and on search/status change
  useEffect(() => {
    fetchInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  // Infinite scroll handler using IntersectionObserver
  useEffect(() => {
    if (loading || loadingMore) return;
    if (page + 1 >= totalPages) return;
    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoadingMore(true);
          fetchProjectsPage({
            searchPattern: search,
            page: page + 1,
            size: 6,
          })
            .then((res) => {
              setProjects((prev) => [...prev, ...(res.data?.content || [])]);
              setPage((prev) => prev + 1);
            })
            .catch(() => {
              // Optionally handle error
            })
            .finally(() => {
              setLoadingMore(false);
            });
        }
      },
      { threshold: 1 }
    );
    const refCurrent = loadMoreRef.current;
    if (refCurrent) observer.observe(refCurrent);
    return () => {
      if (refCurrent) observer.unobserve(refCurrent);
    };
  }, [loading, loadingMore, page, totalPages, search, status]);

  return (
    <PageContainer title="Projects" description="Manage your projects">
      <Box px={3}>
        <ProjectHeader
          onProjectCreated={() => {
            fetchInitial();
            setStats({
              totalProjects: stats?.totalProjects ? stats.totalProjects + 1 : 1,
              activeProjects: stats?.activeProjects
                ? stats.activeProjects + 1
                : 1,
              completedProjects: stats?.completedProjects || 0,
            });
          }}
        />
        <ProjectInfoBox stats={stats} setStats={setStats} />
        <ProjectList
          projects={projects}
          setProjects={setProjects}
          page={page}
          totalPages={totalPages}
          loading={loading}
          loadingMore={loadingMore}
          search={search}
          setSearch={setSearch}
          status={status}
          setStatus={setStatus}
          loadMoreRef={loadMoreRef}
          setStats={setStats}
        />
      </Box>
    </PageContainer>
  );
};

export default Project;
