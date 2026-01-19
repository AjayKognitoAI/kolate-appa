import React from "react";
import { Stack, Box, Typography, Card } from "@mui/material";
import { IconUser, IconCheck, IconList } from "@tabler/icons-react";
import { projectService } from "@/services/project/project-service";
import Skeleton from "@mui/material/Skeleton";

const staticLabels = [
  {
    label: "Total Projects",
    icon: <IconList width={30} height={30} color="#6c7890" />,
  },
  {
    label: "Active Projects",
    icon: <IconCheck width={30} height={30} color="#6c7890" />,
  },
  {
    label: "Completed Projects",
    icon: <IconUser width={30} height={30} color="#6c7890" />,
  },
];

export interface ProjectStatistics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
}

const ProjectInfoBox: React.FC<{
  stats: ProjectStatistics | null;
  setStats: React.Dispatch<
    React.SetStateAction<{
      totalProjects: number;
      activeProjects: number;
      completedProjects: number;
    } | null>
  >;
}> = ({ stats, setStats }) => {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    projectService
      .getProjectStatistics()
      .then((res) => {
        if (mounted && res.data) {
          setStats({
            totalProjects: res.data.total_projects ?? 0,
            activeProjects: res.data.active_projects ?? 0,
            completedProjects: res.data.completed_projects ?? 0,
          });
        }
      })
      .catch(() => {
        if (mounted)
          setStats({
            totalProjects: 0,
            activeProjects: 0,
            completedProjects: 0,
          });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const values = [
    stats?.totalProjects ?? 0,
    stats?.activeProjects ?? 0,
    stats?.completedProjects ?? 0,
  ];
  return (
    <Box sx={{ width: "100%" }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
        {staticLabels.map((item, idx) => (
          <Card
            key={item.label}
            sx={{
              px: 2,
              py: 2,
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              boxShadow: "none",
              border: "1px solid #e0e0e0",
              maxWidth: { xs: "100%", sm: 300 },
              width: "100%",
            }}
          >
            <Box sx={{ width: 28, height: 28, mb: 1, mr: 3 }}>{item.icon}</Box>
            <Box>
              <Typography
                variant="h4"
                fontWeight={600}
                color="#6c7890"
                fontSize={16}
                sx={{ mt: 1 }}
              >
                {loading ? <Skeleton width={40} /> : values[idx]}
              </Typography>
              <Typography
                variant="body2"
                color="#6c7890"
                sx={{ mt: 1, fontWeight: 400 }}
              >
                {item.label}
              </Typography>
            </Box>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};

export default ProjectInfoBox;
