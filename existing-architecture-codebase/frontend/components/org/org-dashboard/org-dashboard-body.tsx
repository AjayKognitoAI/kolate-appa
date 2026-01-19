import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  LinearProgress,
  Stack,
  Grid,
  useTheme,
  Skeleton,
} from "@mui/material";
import {
  IconSettings,
  IconUsers,
  IconFolderPlus,
  IconChevronRight,
  IconCheck,
  IconUserPlus,
  IconFolderOpen,
  IconClipboardList,
  IconTrendingUp,
  IconBuildingCog,
} from "@tabler/icons-react";
import EnterpriseSetupModal from "../enterprise-setup-modal";
import MemberInviteModal from "../member-invite-modal";
import ProjectEditStepperModal from "../project/ProjectEditStepperModal";
import {
  getOnboardingProgress,
  OnboardingProgress,
  OnboardingStep,
  EnterpriseStatistics,
  getEnterpriseStatistics,
} from "@/services/org-admin/enterprise-setup";
import Image from "next/image";
import { urlWrapper } from "@/utils/url-wrapper";
import { useRouter } from "next/navigation";
import MiniChart from "./MiniChart";

const OrgDashboardBody = () => {
  const theme = useTheme();
  const router = useRouter();

  const [enterpriseModalOpen, setEnterpriseModalOpen] = useState(false);
  const [memberInviteModalOpen, setMemberInviteModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<EnterpriseStatistics | null>(null);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const resp = await getOnboardingProgress();
      // API shape: resp.data.data -> { profile_updated, invited_member, created_project }
      setProgress(resp.data?.data ?? null);
    } catch (err) {
      console.error("Failed to fetch onboarding progress", err);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  // Map progress flags to step completions
  const isProfileUpdated = useMemo(
    () => !!progress?.profile_updated,
    [progress]
  );
  const isInvitedMember = useMemo(() => !!progress?.invited_member, [progress]);
  const isCreatedProject = useMemo(
    () => !!progress?.created_project,
    [progress]
  );

  // Check if all steps are completed
  const allStepsCompleted = useMemo(
    () => isProfileUpdated && isInvitedMember && isCreatedProject,
    [isProfileUpdated, isInvitedMember, isCreatedProject]
  );

  useEffect(() => {
    if (allStepsCompleted) {
      (async () => {
        const stats = await getEnterpriseStatistics();

        setStats(stats.data.data);
      })();
    }
  }, [progress, allStepsCompleted]);

  const setupSteps = [
    {
      id: 1,
      number: 1,
      title: "Enterprise Details",
      subtitle: "Set up your organization profile",
      description:
        "Personalize your workspace and configure organization settings",
      buttonText: isProfileUpdated ? "Completed" : "Get Started",
      icon: <IconSettings size={24} />,
      completed: isProfileUpdated,
      onClick: () => setEnterpriseModalOpen(true),
      onboardStep: "PROFILE_UPDATED" as OnboardingStep,
    },
    {
      id: 2,
      number: 2,
      title: "Invite Members",
      subtitle: "Add team members to your organization",
      description:
        "Collaborate with your colleagues and assign specific permissions",
      buttonText: isInvitedMember ? "Completed" : "Invite Team",
      icon: <IconUsers size={24} />,
      completed: isInvitedMember,
      onClick: () => setMemberInviteModalOpen(true),
      onboardStep: "INVITED_MEMBER" as OnboardingStep,
    },
    {
      id: 3,
      number: 3,
      title: "Create Project",
      subtitle: "Set up your first project",
      description: "Start organizing your work and track progress effectively",
      buttonText: isCreatedProject ? "Completed" : "Create Project",
      icon: <IconFolderPlus size={24} />,
      completed: isCreatedProject,
      onClick: () => setProjectModalOpen(true),
      onboardStep: "CREATED_PROJECT" as OnboardingStep,
    },
  ];

  // derive completed count and percentage from API data (total steps is number of entries)
  const totalSteps = setupSteps.length;
  const completedSteps = setupSteps.filter((s) => s.completed).length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  const statsCards = [
    {
      title: "Total Users",
      value: stats?.total_users ?? 0,
      icon: <IconTrendingUp size={24} color="var(--primary-600)" />,
    },
    {
      title: "Active Projects",
      value: stats?.active_projects ?? 0,
      icon: <IconTrendingUp size={24} color="var(--primary-600)" />,
    },
    {
      title: "Completed Projects",
      value: stats?.completed_projects ?? 0,
      icon: <IconTrendingUp size={24} color="var(--primary-600)" />,
    },
  ];

  const quickActions = [
    {
      title: "Update Enterprise Details",
      description: "Update your enterprise information",
      icon: <IconBuildingCog size={22} color="#fff" />,
      onClick: () => setEnterpriseModalOpen(true), // Add your project management handler
    },
    {
      title: "Invite New User",
      description: "Add team members to the platform",
      icon: <IconUserPlus size={22} color="#fff" />,
      onClick: () => setMemberInviteModalOpen(true),
    },
    {
      title: "Create New Project",
      description: "Setup a new analysis project",
      icon: <IconFolderOpen size={22} color="#fff" />,
      onClick: () => setProjectModalOpen(true),
    },
    {
      title: "Manage Projects",
      description: "Review recent system activities",
      icon: <IconClipboardList size={22} color="#fff" />,
      onClick: () => router.push("/org/projects"), // Add your project management handler
    },
  ];

  // Show dashboard content when all steps are completed
  if (loading) {
    return (
      <Box sx={{ mt: 5, pb: 4, px: 3 }}>
        {/* Stats Cards Skeleton */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3].map((item) => (
            <Grid key={item} component={Grid} size={{ xs: 12, md: 4 }}>
              <Paper
                elevation={0}
                sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}
              >
                <Skeleton
                  variant="rectangular"
                  width={40}
                  height={40}
                  sx={{ mb: 2, borderRadius: 1 }}
                />
                <Skeleton variant="text" width={120} height={24} />
                <Skeleton variant="text" width={80} height={48} />
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Quick Actions Skeleton */}
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={200} height={32} sx={{ mb: 3 }} />
        </Box>

        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((item) => (
            <Grid key={item} component={Grid} size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                }}
              >
                <Skeleton
                  variant="rectangular"
                  width={50}
                  height={50}
                  sx={{ mb: 2, borderRadius: 1 }}
                />
                <Skeleton variant="text" width={140} height={24} />
                <Skeleton variant="text" width="100%" height={20} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Original onboarding flow when steps are not completed
  return (
    <>
      {allStepsCompleted ? (
        <Box sx={{ mt: 5, pb: 4 }}>
          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4, px: 3 }}>
            {statsCards.map((card, index) => (
              <Grid key={index} component={Grid} size={{ xs: 12, md: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    p: 3,
                  }}
                >
                  <Box
                    sx={{
                      height: "90px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      fontWeight={500}
                    >
                      {card.title}
                    </Typography>

                    <Typography variant="h2" fontWeight={600} mb={0}>
                      {card.value}
                    </Typography>
                  </Box>
                  <MiniChart />
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Quick Actions */}
          <Box
            sx={{
              p: 4,
              borderRadius: 0,
              background: "#E3DFFA",
              mb: 4,
              pb: 7,
              position: "relative",
            }}
          >
            <Image
              width={80}
              height={80}
              src={urlWrapper.background + "quick_links_blob_right.png"}
              alt=""
              style={{ position: "absolute", right: 0, top: 0 }}
            />
            <Image
              width={80}
              height={60}
              src={urlWrapper.background + "quick_links_blob_left.png"}
              alt=""
              style={{ position: "absolute", left: 0, bottom: 0 }}
            />
            <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
              Quick Actions
            </Typography>

            <Grid container spacing={3}>
              {quickActions.map((action, index) => (
                <Grid
                  key={index}
                  component={Grid}
                  size={{ xs: 12, sm: 6, md: 3 }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 2,
                      cursor: "pointer",
                      ":hover": { boxShadow: theme.shadows[1] },
                      position: "relative",
                      zIndex: 1,
                    }}
                    onClick={action.onClick}
                  >
                    <Box
                      sx={{
                        backgroundColor: "var(--indigo-500)",
                        mb: 2,
                        width: 40,
                        height: 40,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                      }}
                    >
                      {action.icon}
                    </Box>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 0 }}>
                      {action.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {action.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      ) : (
        <Box sx={{ mt: 5, px: 4, pb: 4 }}>
          <Box sx={{ mb: 4 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
                px: 2,
              }}
            >
              <Typography variant="h5" fontWeight={600}>
                Complete your organisation setup
              </Typography>
              <Typography variant="body2" color="text.secondary" gap={1}>
                {completedSteps} of {totalSteps} completed{" "}
                <span style={{ color: "var(--primary-700)", fontWeight: 600 }}>
                  {" "}
                  {progressPercentage}%
                </span>
              </Typography>
            </Box>

            {/* Progress bar */}
            <Box sx={{ position: "relative" }}>
              {loading ? (
                <LinearProgress sx={{ height: 8, borderRadius: 4 }} />
              ) : (
                <LinearProgress
                  variant="determinate"
                  value={progressPercentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? theme.palette.grey[800]
                        : theme.palette.grey[200],
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 4,
                      backgroundColor: "#E48B46",
                    },
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Setup steps */}
          <Stack spacing={2}>
            {setupSteps.map((step) => (
              <Paper
                key={step.id}
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Grid container spacing={2}>
                  <Grid component={Grid} size={{ xs: 12, sm: 1 }}>
                    {step.completed ? (
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          backgroundColor: "var(--indigo-100)",
                          color: "var(--indigo-700)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <IconCheck size={18} color="var(--indigo-700)" />
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          backgroundColor: "var(--indigo-100)",
                          color: "var(--indigo-700)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Typography variant="body2">{step.number}</Typography>
                      </Box>
                    )}
                  </Grid>

                  <Grid component={Grid} size={{ xs: 12, sm: 8 }}>
                    <Typography variant="h6" fontWeight={500}>
                      {step.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {step.subtitle}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {step.description}
                    </Typography>
                    <Button
                      variant={"outlined"}
                      size="medium"
                      color="inherit"
                      endIcon={<IconChevronRight size={16} />}
                      sx={{
                        borderColor: "#D5D7DA",
                        color: "secondary.main",
                        mt: 2,
                      }}
                      onClick={step.onClick}
                    >
                      {step.buttonText}
                    </Button>
                  </Grid>

                  <Grid
                    component={Grid}
                    size={{ xs: 12, sm: 3 }}
                    sx={{ textAlign: "right" }}
                  >
                    <Box sx={{ color: "var(--indigo-700)" }}>{step.icon}</Box>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {/* Modals: pass onSave that updates backend and refreshes */}
      {enterpriseModalOpen && (
        <EnterpriseSetupModal
          open={enterpriseModalOpen}
          onClose={() => setEnterpriseModalOpen(false)}
          onSave={() => {
            setEnterpriseModalOpen(false);
            setProgress((prev) => ({
              ...prev!,
              profile_updated: true,
            }));
          }}
        />
      )}
      {memberInviteModalOpen && (
        <MemberInviteModal
          open={memberInviteModalOpen}
          onClose={() => setMemberInviteModalOpen(false)}
          onSave={() => {
            setMemberInviteModalOpen(false);
            setProgress((prev) => ({
              ...prev!,
              invited_member: true,
            }));
          }}
        />
      )}
      {projectModalOpen && (
        <ProjectEditStepperModal
          open={projectModalOpen}
          onClose={() => setProjectModalOpen(false)}
          onSave={() => {
            setProjectModalOpen(false);
            setProgress((prev) => ({
              ...prev!,
              created_project: true,
            }));
          }}
        />
      )}
    </>
  );
};

export default OrgDashboardBody;
