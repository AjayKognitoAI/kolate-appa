"use client";
import PageContainer from "@/components/container/PageContainer";
import ProjectMain from "@/components/org/project-main";
import { Box } from "@mui/material";
import { useParams } from "next/navigation";
import React from "react";

const Page = () => {
  const params = useParams();
  const id = params.id as string | undefined;
  return (
    <Box px={3}>
      <ProjectMain id={id as string} />
    </Box>
  );
};

export default Page;
