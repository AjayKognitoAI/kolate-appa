import { Box, Typography, Menu, MenuItem } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import React, { useState } from "react";
import {
  getProjectsList,
  getCurrentProject,
  setCurrentProject,
} from "@/store/slices/projectsSlice";
import { KeyboardArrowUp } from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "@/store";
import { useRouter } from "next/navigation";

interface Props {}

const ProjectDropdownMenu = ({}: Props) => {
  const projects = useAppSelector(getProjectsList);
  const currentProject = useAppSelector(getCurrentProject);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleProjectSelect = (project: any) => {
    if (currentProject?.project_id !== project?.project_id) {
      dispatch(setCurrentProject(project));
      router.push("/dashboard");
    }
    handleMenuClose();
  };

  return (
    <>
      <Box
        mx={2}
        px={1.5}
        borderRadius={1}
        bgcolor="#F5EAD54D"
        display="flex"
        flexDirection="column"
        alignItems="flex-start"
        justifyContent="center"
        sx={{
          cursor: "pointer",
          userSelect: "none",
          width: 241,
          height: 51, // 🔑 fixed height
          minHeight: 51,
          maxHeight: 51,
          border: 1,
          borderColor: "divider",
        }}
        onClick={handleMenuOpen}
      >
        <Box display="flex" alignItems="center" width="100%">
          <Typography
            variant="caption"
            fontWeight={500}
            color="#23272e"
            flex={1}
            noWrap
          >
            {currentProject?.project_name || "Select Project"}
          </Typography>
          {anchorEl ? (
            <KeyboardArrowUp sx={{ color: "#7b809a", fontSize: 20 }} />
          ) : (
            <KeyboardArrowDownIcon sx={{ color: "#7b809a", fontSize: 20 }} />
          )}
        </Box>
        <Box mt={0}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              bgcolor: "#FFF1F3",
              color: "#C01048",
              borderRadius: 2,
              px: 0.5,
              py: 0.2,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: 0.1,
              textTransform: "capitalize",
            }}
          >
            <FiberManualRecordIcon
              sx={{ fontSize: 8, mr: 1, color: "#e53958" }}
            />
            {currentProject?.role?.toLowerCase() || "Project Manager"}
          </Box>
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: {
            minWidth: anchorEl ? anchorEl.offsetWidth : 200,
            width: anchorEl ? anchorEl.offsetWidth : 200,
            boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
            borderRadius: 0.5,
            py: 0,
          },
        }}
        sx={{ padding: 0 }}
      >
        {projects.map((project) => (
          <MenuItem
            key={project.project_id}
            selected={currentProject?.project_id === project.project_id}
            onClick={() => handleProjectSelect(project)}
            sx={{
              my: 0,
              fontSize: 14,
              "&.Mui-selected": {
                backgroundColor: "primary.50",
                "&:hover": {
                  backgroundColor: "primary.100",
                },
              },
            }}
          >
            {project.project_name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ProjectDropdownMenu;
