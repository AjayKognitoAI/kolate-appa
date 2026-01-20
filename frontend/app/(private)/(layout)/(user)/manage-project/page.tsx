"use client";
import ProjectMain from "@/components/org/project-main";
import { useAppSelector } from "@/store";
import { getCurrentProject } from "@/store/slices/projectsSlice";
import { Box } from "@mui/material";
import { useParams } from "next/navigation";
import React from "react";

const Page = () => {
  const params = useParams();
  const id = params.id as string | undefined;
  const currentProject = useAppSelector(getCurrentProject);
  return (
    <Box px={3}>
      <ProjectMain id={currentProject?.project_id as string} />
    </Box>
  );
};

export default Page;
