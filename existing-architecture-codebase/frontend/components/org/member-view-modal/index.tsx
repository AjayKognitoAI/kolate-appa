import React, { useEffect, useState } from "react";
import {
  Drawer,
  Card,
  CardContent,
  Avatar,
  Typography,
  Box,
  Divider,
  IconButton,
  Grid,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { projectService } from "@/services/project/project-service";
import ProjectCard from "../project/ProjectCard";
import ProjectCardSkeleton from "../project/ProjectCardSkeleton";
import { IconX } from "@tabler/icons-react";

interface UserData {
  avatar: string;
  fullName: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  auth0_id: string;
}

const UserInfoSheet = ({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: UserData;
}) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.auth0_id) {
      projectService
        .getUserProjectsByAuth0Id(user.auth0_id)
        .then((res) => {
          setProjects(res.data);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user.auth0_id]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth: 768,
        },
      }}
    >
      <Box sx={{ width: "100%", p: 3, position: "relative" }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography fontWeight={500}>{user.fullName}</Typography>
          <IconButton onClick={onClose} aria-label="close" size="small">
            <IconX fontSize={12} />
          </IconButton>
        </Stack>
        <Stack direction="row" justifyContent="space-between" my={3}>
          <Box display="flex" flexDirection="row" alignItems="center">
            <Avatar
              src={user.avatar}
              alt={user.fullName}
              sx={{ width: 50, height: 50, mr: 1 }}
            />
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {user.fullName}
              </Typography>
              <Typography color="text.secondary">{user.email}</Typography>
            </Box>
          </Box>
        </Stack>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, sm: 6 }} component={Grid}>
            <Typography variant="body2" color="text.secondary">
              First name
            </Typography>
            <Typography variant="body1">{user.firstName}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} component={Grid}>
            <Typography variant="body2" color="text.secondary">
              Last name
            </Typography>
            <Typography variant="body1">{user.lastName}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} component={Grid}>
            <Typography variant="body2" color="text.secondary">
              Email Id
            </Typography>
            <Typography variant="body1">{user.email}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} component={Grid}>
            <Typography variant="body2" color="text.secondary">
              Job Title
            </Typography>
            <Typography variant="body1">{user.jobTitle || "---"}</Typography>
          </Grid>
        </Grid>
        {loading ? (
          <Grid container spacing={4} mt={3}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <Grid component={Grid} key={idx} size={{ xs: 12, sm: 6 }}>
                <ProjectCardSkeleton />
              </Grid>
            ))}
          </Grid>
        ) : !!projects?.length ? (
          <Grid container spacing={4} mt={3}>
            {projects?.map((project) => (
              <Grid size={{ xs: 12, sm: 6 }} component={Grid} key={project?.id}>
                <ProjectCard
                  project={project}
                  memberAuth0Id={user?.auth0_id}
                  onRemovingUser={(id) => {
                    setProjects((prev) => prev.filter((p) => p?.id !== id));
                  }}
                  isMemberProfile
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          ""
        )}
      </Box>
    </Drawer>
  );
};

export default UserInfoSheet;
