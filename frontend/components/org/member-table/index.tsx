"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Pagination,
  Stack,
  Paper,
  PaginationItem,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { IconDotsVertical } from "@tabler/icons-react";
import MemberActionModal, { ActionType } from "../member-action-modal";
import MemberRoleModal from "../member-role-modal";
import { toast } from "react-toastify";
import { userManagerService } from "@/services/org-admin/user-manager";
import UserInfoSheet from "../member-view-modal";

// Define the member type
export interface Member {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  role: string;
  projects: string[];
  status: "active" | "block";
  lastLogin: string;
  avatar_url?: string;
  auth0_id?: string;
}

interface MemberTableProps {
  members?: Member[];
  loading?: boolean;
}

// Custom styled components
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontSize: 14,
  padding: "16px 8px",
  color: theme.palette.text.primary,
  borderBottom: `1px solid ${theme.palette.divider}`,
  whiteSpace: "nowrap",
  "&:first-of-type": {
    paddingLeft: 16,
  },
  "&:last-of-type": {
    paddingRight: 16,
  },
}));

const StyledTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  "& .MuiTableCell-root": {
    fontWeight: 500,
    fontSize: 13,
    padding: "12px 8px",
    borderBottom: `1px solid ${theme.palette.divider}`,
    "&:first-of-type": {
      paddingLeft: 16,
    },
    "&:last-of-type": {
      paddingRight: 16,
    },
  },
}));

const StatusChip = styled(Chip)<{ status: "active" | "block" }>(
  ({ theme, status }) => ({
    fontWeight: 500,
    fontSize: 13,
    height: 24,
    borderRadius: 12,
    color:
      status === "active"
        ? theme.palette.success.main
        : theme.palette.error.main,
    backgroundColor:
      status === "active"
        ? theme.palette.success.light
        : theme.palette.error.light,
  })
);

const ProjectChip = styled(Chip)(({ theme }) => ({
  fontWeight: 500,
  fontSize: 13,
  height: 24,
  borderRadius: 12,
  color: theme.palette.primary.main,
  backgroundColor: theme.palette.primary.light,
  marginRight: 4,
}));

const MemberTable: React.FC<MemberTableProps> = ({
  members: _members,
  loading = false,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [members, setMembers] = useState<Member[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<ActionType>("delete");

  // Role change modal state
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [userModal, setUserModal] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setFetching(true);
      try {
        const res = await userManagerService.getUsers(page, rowsPerPage);
        setMembers(
          (res.data?.content || []).map((u: any) => ({
            id: u.id,
            name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
            email: u.email,
            jobTitle: u.job_title,
            role: u.role,
            projects: u.projects ?? [],
            status: u.status?.toLowerCase() === "active" ? "active" : "block",
            lastLogin: u.last_login,
            avatar_url: u.avatar_url,
            auth0_id: u.auth0_id,
          }))
        );
        setTotalUsers(res.data?.total_elements || 0);
      } catch (e) {
        setMembers([]);
        setTotalUsers(0);
      } finally {
        setFetching(false);
      }
    };
    fetchUsers();
  }, [page, rowsPerPage]);

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    memberId: string
  ) => {
    setAnchorEl(event.currentTarget);
    const member = members.find((m) => m.id === memberId) || null;
    setSelectedMember(member);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleActionClick = (member: Member, action: ActionType) => {
    setSelectedMember(member);
    setCurrentAction(action);
    setActionModalOpen(true);
    handleMenuClose();
  };

  const handleActionConfirm = (updatedStatus?: string) => {
    if (
      selectedMember &&
      (updatedStatus === "block" || updatedStatus === "active")
    ) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id
            ? { ...m, status: updatedStatus as "block" | "active" }
            : m
        )
      );
    }
    setActionModalOpen(false);
    setSelectedMember(null);
  };

  const handleActionCancel = () => {
    setActionModalOpen(false);
    setSelectedMember(null);
  };

  // Role change modal handlers
  const handleRoleClick = (member: Member) => {
    setSelectedMember(member);
    setRoleModalOpen(true);
    handleMenuClose();
  };

  const handleProfileClick = (member: Member) => {
    setSelectedMember(member);
    setUserModal(true);
    handleMenuClose();
  };

  const handleRoleChange = (newRole: string) => {
    // Here you would call your API to change the member's role
    // For demo purposes, we'll just show a toast
    if (selectedMember) {
      toast.success(`Changed ${selectedMember.name}'s role.`);
      // In a real application, you would update your state or refetch the data
      // For the demo, we'll just close the modal
      setRoleModalOpen(false);
      setSelectedMember(null);
    }
  };

  const handleRoleCancel = () => {
    setRoleModalOpen(false);
    setSelectedMember(null);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage - 1);
  };

  // Remove sorting logic

  // Use members as-is for current page
  const currentMembers = members;

  // Calculate total pages
  const totalPages = Math.ceil(totalUsers / rowsPerPage) || 1;

  return (
    <Box sx={{ width: "100%", mt: 5 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 2,
          alignItems: "center",
        }}
      >
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          Members{" "}
          <span
            style={{
              color: "#6941C6",
              fontSize: "14px",
              fontWeight: 400,
              marginLeft: "8px",
              backgroundColor: "#F9F5FF",
              borderRadius: "100px",
              padding: "2px 6px",
            }}
          >
            {totalUsers} users
          </span>
        </Typography>
      </Box>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 1,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      >
        <TableContainer>
          <Table sx={{ minWidth: 750 }} aria-label="member table">
            <StyledTableHead>
              <TableRow>
                <StyledTableCell>Name</StyledTableCell>
                <StyledTableCell>Job Title</StyledTableCell>
                {/* <StyledTableCell>
                  <TableSortLabel
                    active={orderBy === "role"}
                    direction={orderBy === "role" ? order : "asc"}
                    onClick={() => handleRequestSort("role")}
                  >
                    Role
                  </TableSortLabel>
                </StyledTableCell> */}
                <StyledTableCell>Projects</StyledTableCell>
                <StyledTableCell>Status</StyledTableCell>
                <StyledTableCell align="right"></StyledTableCell>
              </TableRow>
            </StyledTableHead>
            <TableBody>
              {fetching ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Box sx={{ py: 8, color: "text.secondary" }}>
                      <Typography variant="h6">Loading members...</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : currentMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Box sx={{ py: 8, color: "text.secondary" }}>
                      <Typography variant="h6">No members found</Typography>
                      <Typography variant="body2">
                        Invite your first team member to get started.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                currentMembers.map((member) => (
                  <TableRow
                    key={member.id}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <StyledTableCell component="th" scope="row">
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Avatar
                          sx={{
                            mr: 1.5,
                            width: 32,
                            height: 32,
                            bgcolor: !member.avatar_url ? "#7C3AED" : undefined,
                            fontSize: 12,
                          }}
                          alt={member.name}
                          src={member.avatar_url || undefined}
                        >
                          {!member.avatar_url && member.name
                            ? member.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .substring(0, 2)
                                .toUpperCase()
                            : null}
                        </Avatar>
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 500,
                              color: "text.primary",
                              display: "block",
                            }}
                          >
                            {member.name || "-"}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary", fontSize: 12 }}
                          >
                            {member.email || "-"}
                          </Typography>
                        </Box>
                      </Box>
                    </StyledTableCell>
                    <StyledTableCell>{member.jobTitle || "-"}</StyledTableCell>
                    {/* <StyledTableCell>{member.role}</StyledTableCell> */}
                    <StyledTableCell>
                      {member.projects.length > 0 ? (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {member.projects.map((project, index) => (
                            <ProjectChip
                              key={index}
                              label={project}
                              size="small"
                            />
                          ))}
                          {member.projects.length > 2 && (
                            <Typography
                              variant="caption"
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                ml: 0.5,
                                color: "primary.main",
                              }}
                            >
                              +{member.projects.length - 2}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        "---"
                      )}
                    </StyledTableCell>
                    <StyledTableCell>
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography
                          variant="body2"
                          color={
                            member.status === "active" ? "#258B26" : "#E6524B"
                          }
                          fontWeight={600}
                        >
                          {member.status === "active" ? "Active" : "Block"}
                        </Typography>
                        {/* <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            mt: 0.5,
                            fontSize: 12,
                          }}
                        >
                          {member.lastLogin}
                        </Typography> */}
                      </Box>
                    </StyledTableCell>
                    <StyledTableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, member.id)}
                      >
                        <IconDotsVertical size={16} />
                      </IconButton>
                    </StyledTableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: "flex", p: 2, borderTop: "1px solid #e5e7eb" }}>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={handleChangePage}
            variant="outlined"
            shape="rounded"
            color="primary"
            sx={{
              width: "100%",
              "& .MuiPagination-ul": {
                justifyContent: "space-between !important",
                display: "flex !important",
              },
            }}
            renderItem={(item) => (
              <PaginationItem
                slots={{
                  next: () => (
                    <Box sx={{ flex: 1 }}>
                      <Typography>Next</Typography>
                    </Box>
                  ),
                  previous: () => <p>Previous</p>,
                }}
                component="button"
                {...item}
              />
            )}
          />
        </Box>
      </Paper>
      {/* Member Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { width: 180, boxShadow: "0px 2px 10px rgba(0,0,0,0.1)" },
        }}
      >
        <MenuItem
          onClick={() => {
            if (selectedMember) handleProfileClick(selectedMember);
          }}
        >
          View profile
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedMember) handleRoleClick(selectedMember);
          }}
        >
          Change role
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedMember) {
              handleActionClick(
                selectedMember,
                selectedMember?.status === "active" ? "block" : "unblock"
              );
            }
          }}
        >
          {selectedMember?.status === "active" ? "Block" : " Unblock"}
        </MenuItem>
      </Menu>
      {/* Member Action Confirmation Modal */}
      {actionModalOpen && (
        <MemberActionModal
          open={actionModalOpen}
          onClose={handleActionCancel}
          onConfirm={handleActionConfirm}
          member={selectedMember}
          actionType={currentAction}
        />
      )}
      {/* Member Role Change Modal */}
      {roleModalOpen && (
        <MemberRoleModal
          open={roleModalOpen}
          onClose={handleRoleCancel}
          onConfirm={handleRoleChange}
          member={selectedMember || undefined}
        />
      )}

      {userModal && (
        <UserInfoSheet
          open={userModal}
          onClose={() => {
            setUserModal(false);
            setSelectedMember(null);
          }}
          user={{
            avatar: selectedMember?.avatar_url || "",
            fullName: selectedMember?.name || "",
            email: selectedMember?.email || "",
            firstName: selectedMember?.name?.split(" ")[0] || "",
            lastName: selectedMember?.name?.split(" ")[1] || "",
            jobTitle: selectedMember?.jobTitle || "",
            auth0_id: selectedMember?.auth0_id || "",
          }}
        />
      )}
    </Box>
  );
};

export default MemberTable;
