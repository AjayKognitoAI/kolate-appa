import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Avatar,
  TextField,
  IconButton,
  Stack,
  InputAdornment,
  Skeleton,
  Menu,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  ProjectResponse,
  projectService,
  ProjectUser,
} from "@/services/project/project-service";
import ProjectUserRoleModal from "./project-user-role-modal";
import AddMemberModal from "./add-member-modal";
import { toast } from "react-toastify";
import ViewRoleDrawer from "./view-user-role-drawer";

const TeamMembers = ({
  projectId,
  setProject,
}: {
  projectId: string;
  setProject: React.Dispatch<React.SetStateAction<ProjectResponse | null>>;
}) => {
  const [members, setMembers] = useState<ProjectUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuUser, setMenuUser] = useState<ProjectUser | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [search, setSearch] = useState(""); // <-- Add search state
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    user: ProjectUser
  ) => {
    setAnchorEl(event.currentTarget);
    setMenuUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleRoleClick = () => {
    setAnchorEl(null);
    setIsRoleModalOpen(true);
  };

  const handleProfileClick = () => {
    setAnchorEl(null);
    setProfileModalOpen(true);
  };

  const handleRoleModalClose = () => {
    setIsRoleModalOpen(false);
    setMenuUser(null);
  };

  const handleRoleChange = async (role: any) => {
    if (menuUser && projectId) {
      // Update the local state
      const updatedMembers = members.map((member) =>
        member.user_auth0_id === menuUser.user_auth0_id
          ? { ...member, role_name: role?.role_name, role_id: role?.role_id }
          : member
      );
      setMembers(updatedMembers);
      // Update parent project state
      setProject((prev) =>
        prev ? { ...prev, project_users: updatedMembers } : prev
      );

      setMenuUser(null);
      handleRoleModalClose();
    }
  };

  const handleDelete = async () => {
    if (menuUser && projectId) {
      try {
        await projectService.deleteProjectUser(
          projectId,
          menuUser.user_auth0_id ?? ""
        );

        // Update the local state
        const updatedMembers = members.filter(
          (member) => member.user_auth0_id !== menuUser.user_auth0_id
        );
        setMembers(updatedMembers);
        // Update parent project state
        setProject((prev) =>
          prev ? { ...prev, project_users: updatedMembers } : prev
        );

        toast.success("Team member removed successfully");
        handleMenuClose();
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message || "Failed to remove team member"
        );
      }
    }
  };

  const handleAddSuccess = () => {
    setIsAddModalOpen(false);
    // Refresh members list
    if (projectId) {
      setLoading(true);
      projectService
        .getProjectUsers(projectId)
        .then((res) => {
          setMembers(res.data);
          setProject((prev) =>
            prev ? { ...prev, project_users: res.data } : prev
          );
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    projectService
      .getProjectUsers(projectId)
      .then((res) => setMembers(res.data))
      .finally(() => setLoading(false));
  }, [projectId]);

  // Filtered members based on search
  const filteredMembers = members.filter((member) => {
    const searchLower = search.toLowerCase();
    return (
      (member.first_name ?? "").toLowerCase().includes(searchLower) ||
      (member.last_name ?? "").toLowerCase().includes(searchLower) ||
      (member.email ?? "").toLowerCase().includes(searchLower)
    );
  });

  return (
    <Paper elevation={0} sx={{ p: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6" fontWeight={600} m={0}>
          Team Members
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            size="small"
            placeholder="Search"
            variant="outlined"
            sx={{ minWidth: 180 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              sx: { borderRadius: 1 },
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#9ca3af" }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="medium"
            onClick={() => setIsAddModalOpen(true)}
          >
            Add
          </Button>
        </Stack>
      </Box>
      <Table sx={{ width: "100%", borderCollapse: "collapse" }}>
        <TableHead>
          <TableRow sx={{ background: "#f9fafb" }}>
            <TableCell
              sx={{
                textAlign: "left",
                py: 1.5,
                fontWeight: 500,
                color: "#374151",
              }}
            >
              Name
            </TableCell>
            <TableCell
              sx={{
                textAlign: "left",
                py: 1.5,
                fontWeight: 500,
                color: "#374151",
              }}
            >
              Project Role{" "}
              <InfoOutlinedIcon
                sx={{
                  fontSize: 18,
                  color: "#9ca3af",
                  verticalAlign: "middle",
                }}
              />
            </TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {loading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell sx={{ py: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Skeleton variant="circular" width={44} height={44} />
                      <Box>
                        <Skeleton variant="text" width={120} height={24} />
                        <Skeleton variant="text" width={100} height={18} />
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="text" width={80} height={24} />
                  </TableCell>
                  <TableCell align="right">
                    <Skeleton variant="circular" width={32} height={32} />
                  </TableCell>
                </TableRow>
              ))
            : filteredMembers.map((member) => (
                <TableRow
                  key={member.email}
                  sx={{ borderBottom: "1px solid #f3f4f6" }}
                >
                  <TableCell sx={{ py: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar
                        src={member.avatar_url}
                        alt={member.first_name}
                        sx={{ width: 32, height: 32 }}
                      />
                      <Box>
                        <Typography
                          fontWeight={600}
                          color="#111827"
                          fontSize={15}
                        >
                          {`${member.first_name ?? ""} ${
                            member.last_name ?? ""
                          }`.trim()}
                        </Typography>
                        <Typography color="#6b7280" fontSize={13}>
                          {member.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ color: "#4b5563", fontSize: 14 }}>
                    {member.role_name}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={(e) => handleMenuOpen(e, member)}>
                      <MoreVertIcon sx={{ color: "#9ca3af", fontSize: 22 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleProfileClick}>View profile</MenuItem>
        <MenuItem onClick={handleRoleClick}>Change role</MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
          Delete
        </MenuItem>
      </Menu>

      {isRoleModalOpen && (
        <ProjectUserRoleModal
          open={isRoleModalOpen}
          onClose={handleRoleModalClose}
          onConfirm={handleRoleChange}
          member={
            menuUser
              ? {
                  id: projectId,
                  name: `${menuUser.first_name ?? ""} ${
                    menuUser.last_name ?? ""
                  }`.trim(),
                  email: menuUser.email,
                  role: menuUser.role_name,
                  auth0_id: menuUser.user_auth0_id,
                  avatar_url: menuUser.avatar_url,
                }
              : undefined
          }
        />
      )}

      {isAddModalOpen && (
        <AddMemberModal
          open={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          projectId={projectId}
          onSuccess={handleAddSuccess}
        />
      )}

      {
        /* Profile Modal */
        profileModalOpen && menuUser && (
          <ViewRoleDrawer
            email={menuUser.email ?? ""}
            userName={`${menuUser.first_name ?? ""} ${
              menuUser.last_name ?? ""
            }`.trim()}
            onClose={() => {
              setProfileModalOpen(false);
              setMenuUser(null);
            }}
            open={profileModalOpen}
            roleId={menuUser.role_id ?? ""}
            userImage={menuUser.avatar_url ?? ""}
          />
        )
      }
    </Paper>
  );
};

export default TeamMembers;
