import React from "react";
import { Box, Paper, Typography, Button, Grid } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import {
  deleteProjectRole,
  ProjectResponse,
} from "@/services/project/project-service";
import RoleCard from "../RoleCard";
import { useEffect, useState } from "react";
import { projectService } from "@/services/project/project-service";
import { Skeleton } from "@mui/material";
import RoleForm from "./role-form";
import { toast } from "react-toastify";
import MoveRoleModal from "./role-move-modal";

const RoleTemplates = ({
  projectId,
  setProject,
}: {
  projectId: string;
  setProject: React.Dispatch<React.SetStateAction<ProjectResponse | null>>;
}) => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleForm, setRoleForm] = useState<boolean>(false);
  const [roleId, setRoleId] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [roleSwitch, setRoleSwitch] = useState<boolean>(false);

  const fetchRoles = async () => {
    setLoading(true);
    projectService
      .getProjectRoles(projectId)
      .then((res) => setRoles(res.data))
      .catch(() => setRoles([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetchRoles();
  }, [projectId]);

  const onDelete = async (roleId: string) => {
    setIsDeleting(true);
    try {
      const { data } = await deleteProjectRole(projectId, roleId);
      toast.success("Role deleted successfully");
      setRoles((prev) => prev.filter((role) => role.id !== roleId));
    } catch (error: any) {
      console.log("Failed to delete role", error?.response?.data?.message);
      if (
        error?.response?.data?.message ===
        "Role cannot be deleted: Role cannot be deleted because it is in use"
      ) {
        setRoleId(roleId);
        setRoleSwitch(true);
      } else {
        toast.error("Failed to delete role");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Paper elevation={0} sx={{ p: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h6" fontWeight={600} m={0}>
            Role Templates
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="medium"
            onClick={() => setRoleForm(true)}
          >
            Add
          </Button>
        </Box>

        <Grid container spacing={3}>
          {loading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <Grid size={{ xs: 12, sm: 6 }} key={idx} component={Grid}>
                  <Box
                    sx={{
                      border: "1.5px solid #e5e7eb",
                      borderRadius: 1,
                      bgcolor: "#fff",
                      p: 2,
                      minHeight: 140,
                    }}
                  >
                    <Skeleton
                      variant="text"
                      width="40%"
                      height={32}
                      sx={{ mb: 1 }}
                    />
                    <Skeleton
                      variant="text"
                      width="80%"
                      height={20}
                      sx={{ mb: 2 }}
                    />
                    <Skeleton
                      variant="rectangular"
                      width="60%"
                      height={28}
                      sx={{ borderRadius: 2 }}
                    />
                  </Box>
                </Grid>
              ))
            : roles.map((role) => (
                <Grid size={{ xs: 12, sm: 6 }} key={role.id} component={Grid}>
                  <RoleCard
                    showMoreClick={
                      !["ADMIN", "MANAGER", "ANALYST", "MEMBER"].includes(
                        role?.name
                      )
                    }
                    onEdit={() => {
                      setRoleId(role.id);
                      setRoleForm(true);
                    }}
                    isDeleting={isDeleting}
                    onDelete={() => {
                      onDelete(role.id);
                    }}
                    {...role}
                  />
                </Grid>
              ))}
        </Grid>
      </Paper>
      {roleForm && (
        <RoleForm
          onClose={() => {
            setRoleForm(false);
            setRoleId("");
          }}
          open={roleForm}
          projectId={projectId}
          roleId={roleId}
          fetchRoles={fetchRoles}
        />
      )}

      {roleSwitch && (
        <MoveRoleModal
          open={roleSwitch}
          onClose={() => setRoleSwitch(false)}
          projectId={projectId}
          oldRoleId={roleId || ""}
          oldRoleName={""}
          onSuccess={() => {
            setRoleSwitch(false);
            setRoles((prev) => prev.filter((role) => role.id !== roleId));
            setRoleId("");
            toast.success("Role deleted and users moved successfully");
          }}
        />
      )}
    </>
  );
};

export default RoleTemplates;
