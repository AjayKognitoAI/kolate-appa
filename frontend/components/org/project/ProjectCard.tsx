import React, { useState } from "react";
import {
  Card,
  Typography,
  Stack,
  Box,
  Avatar,
  Tooltip,
  Divider,
  Button,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { IconDotsVertical, IconEdit, IconTrash } from "@tabler/icons-react";
import GroupIcon from "@mui/icons-material/Group";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import ProjectUpdateModal from "./ProjectUpdateModal";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ProjectResponse,
  projectService,
} from "@/services/project/project-service";
import { toast } from "react-toastify";

interface Manager {
  name: string;
  avatar: string;
}

interface ProjectCardProps {
  project: ProjectResponse;
  isProjectPage?: boolean; // Optional prop to indicate if this is a project page
  onUpdateProject?: (updatedProject: any) => void; // Callback for project updates
  onDeleteProject?: (deletedProject: ProjectResponse) => void; // Callback for project deletion
  onMarkCompleteProject?: (completedProject: ProjectResponse) => void; // Callback for mark as complete
  isMemberProfile?: boolean;
  memberAuth0Id?: string;
  onRemovingUser?: (projectID: string) => void;
  isAdminPage?: boolean; // Optional prop to indicate if this is an admin page
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isProjectPage,
  onUpdateProject,
  onDeleteProject,
  onMarkCompleteProject,
  isMemberProfile,
  memberAuth0Id,
  onRemovingUser,
  isAdminPage = false,
}) => {
  const [showFullDesc, setShowFullDesc] = useState(false);
  const description = project.description || "";
  const descToShow = showFullDesc
    ? description
    : `${description.substring(0, 150)}${
        description.length > 150 ? "..." : ""
      }`;
  const isDescLong = description.length > 150; // Define based on project description length

  const onToggleDesc = () => {
    setShowFullDesc((prev) => !prev);
  };
  // Compute managers from project_users
  const managers = (project.project_users ?? [])
    .filter((u) => u.role_name === "MANAGER")
    .map((u) => ({
      name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
      avatar: u.avatar_url ?? "",
    }));
  const membersCount = project.project_users?.length ?? 0;
  const createdOn = project.created_at;

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [markingCompleted, setMarkingCompleted] = useState(false);
  const [removingUser, setRemovingUser] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Placeholder handlers for menu actions
  const handleEdit = () => {
    handleMenuClose();
    setIsUpdateModalOpen(true);
  };

  const handleRemoveUser = async () => {
    if (removingUser) return;
    setRemovingUser(true);
    try {
      const res = await projectService.deleteProjectUser(
        project.id,
        memberAuth0Id ?? ""
      );
      toast.success("Project removed from user");
      if (onRemovingUser) onRemovingUser(project.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to mark as complete");
    } finally {
      setRemovingUser(false);
    }
  };

  const handleMarkComplete = async () => {
    handleMenuClose();
    setMarkingCompleted(true);
    try {
      const res = await projectService.updateProject(project.id, {
        name: project.name,
        description: project.description,
        status: "COMPLETED",
        updated_by: session?.user?.email || "",
      });
      toast.success("Project marked as completed");
      if (onUpdateProject) onUpdateProject(res.data);
      if (onMarkCompleteProject) onMarkCompleteProject(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to mark as complete");
    } finally {
      setMarkingCompleted(false);
    }
  };
  const handleDelete = async () => {
    handleMenuClose();
    setDeleting(true);
    try {
      await projectService.deleteProject(project.id);
      toast.success("Project deleted successfully");
      if (onDeleteProject) onDeleteProject(project); // Notify parent
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card
      sx={{
        borderRadius: 0.5,
        minHeight: 320,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        p: 0,
        boxShadow: "none",
      }}
      variant="outlined"
    >
      {/* Title, Description, Manager, Members, Created On */}
      <Box sx={{ p: 3, pb: 2 }}>
        {/* Title */}
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          {project.name}
        </Typography>
        {/* Description */}
        <Box sx={{ position: "relative", mb: 2 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              minHeight: 48,
              overflow: showFullDesc ? "visible" : "hidden",
              WebkitLineClamp: showFullDesc ? "none" : 2,
              pr: 6,
            }}
          >
            {descToShow}{" "}
            {isDescLong && (
              <Typography
                onClick={onToggleDesc}
                component="span"
                color="primary.main"
                variant="body2"
                sx={{ cursor: "pointer" }}
              >
                {!showFullDesc ? "View more" : "View less"}
              </Typography>
            )}
          </Typography>
        </Box>
        {/* Project Manager */}
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          Project Manager{managers.length > 1 ? "s" : ""}:
        </Typography>
        {managers.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            -
          </Typography>
        ) : (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 1, mt: 0.5 }}
          >
            <Stack direction="row" spacing={-1}>
              {managers.slice(0, 3).map((m, idx) => (
                <Tooltip title={m.name} key={m.name}>
                  <Avatar
                    src={m.avatar}
                    alt={m.name}
                    sx={{
                      width: 24,
                      height: 24,
                      border: "2px solid #fff",
                      zIndex: 10 - idx,
                      fontSize: 12,
                    }}
                  />
                </Tooltip>
              ))}
              {managers.length > 3 && (
                <Avatar
                  sx={{
                    width: 24,
                    height: 24,
                    border: "2px solid #fff",
                    zIndex: 10 - 3,
                    fontSize: 12,
                    bgcolor: "#e0e7ef",
                    color: "#6c7890",
                  }}
                >
                  +{managers.length - 3}
                </Avatar>
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {managers.map((m) => m.name).join(", ")}
            </Typography>
          </Stack>
        )}
        {/* Team members & Created on */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2, mt: 2 }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Team Members:
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
              <GroupIcon sx={{ fontSize: 18, color: "#6b7280" }} />
              <Typography variant="body2" color="text.secondary">
                {membersCount} members
              </Typography>
            </Stack>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Created On:
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {new Date(createdOn).toLocaleString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
          </Box>
        </Stack>
      </Box>
      {/* Status & Actions Footer */}
      <Divider sx={{ m: 0 }} />
      <Box sx={{ px: 3, py: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Chip
            label={
              project.status === "ACTIVE"
                ? "Active"
                : project.status === "COMPLETED"
                ? "Completed"
                : ""
            }
            sx={{
              borderRadius: 1,
              fontWeight: 500,
              px: 1.5,
              color:
                project.status === "ACTIVE"
                  ? "#027A48"
                  : project.status === "COMPLETED"
                  ? "#6941C6"
                  : undefined,
              backgroundColor:
                project.status === "ACTIVE"
                  ? "#ECFDF3"
                  : project.status === "COMPLETED"
                  ? "#F4F3FF"
                  : undefined,
              display:
                project.status === "ACTIVE" || project.status === "COMPLETED"
                  ? undefined
                  : "none",
            }}
            size="small"
          />
          <Stack direction="row" spacing={1} alignItems="center">
            {isAdminPage ? (
              ""
            ) : isMemberProfile ? (
              <IconTrash
                size={16}
                color="red"
                cursor={"pointer"}
                onClick={handleRemoveUser}
                opacity={removingUser ? 0.5 : 1}
              />
            ) : !isProjectPage ? (
              <>
                <Button
                  variant="contained"
                  size="small"
                  sx={{
                    borderRadius: "100px",
                    textTransform: "none",
                    fontWeight: 500,
                    height: 28,
                    py: 0,
                    fontSize: 12,
                    boxShadow: "none",
                  }}
                  onClick={() => router.push(`/org/projects/${project.id}`)}
                >
                  Manage
                </Button>
                <IconButton size="small" onClick={handleMenuOpen}>
                  <IconDotsVertical size={18} />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <MenuItem onClick={handleEdit}>
                    <ListItemText>Edit</ListItemText>
                  </MenuItem>
                  {project.status === "ACTIVE" && (
                    <MenuItem
                      onClick={handleMarkComplete}
                      disabled={markingCompleted}
                    >
                      <ListItemText>Mark as complete</ListItemText>
                    </MenuItem>
                  )}
                  <MenuItem onClick={handleDelete} disabled={deleting}>
                    <ListItemText>
                      {deleting ? "Deleting..." : "Delete"}
                    </ListItemText>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <IconButton size="small" onClick={handleEdit}>
                <IconEdit size={18} />
              </IconButton>
            )}
          </Stack>
        </Stack>
      </Box>
      {isUpdateModalOpen && (
        <ProjectUpdateModal
          open={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          project={project}
          onUpdated={(updatedProject) => {
            setIsUpdateModalOpen(false);
            if (onUpdateProject) onUpdateProject(updatedProject);
            // Optionally update parent or local state here
          }}
          currentUserEmail={session?.user?.email || ""}
        />
      )}
    </Card>
  );
};

export default ProjectCard;
