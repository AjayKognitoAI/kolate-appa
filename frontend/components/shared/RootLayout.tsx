"use client";
import { styled, Box, useTheme } from "@mui/material";
import React, { useContext } from "react";
import Sidebar from "../layout/sidebar/Sidebar";
import { CustomizerContext } from "@/context/customizerContext";
import config from "@/context/config";
import OrgHeader from "../layout/header/OrgHeader";

const MainWrapper = styled("div")(() => ({
  display: "flex",
  minHeight: "100vh",
  width: "100%",
}));

const PageWrapper = styled("div")(() => ({
  display: "flex",
  flexGrow: 1,
  flexDirection: "column",
  zIndex: 1,
  backgroundColor: "transparent",
  overflowX: "hidden",
}));

interface Props {
  children: React.ReactNode;
}

export default function RootLayout({
  showHeader,
  children,
}: {
  showHeader?: boolean;
  children: React.ReactNode;
}) {
  const { activeLayout, isLayout, activeMode, isCollapse } =
    useContext(CustomizerContext);
  const MiniSidebarWidth = config.miniSidebarWidth;

  const theme = useTheme();

  return (
    <MainWrapper>
      <Sidebar />

      <PageWrapper
        className="page-wrapper"
        sx={{
          ...(isCollapse === "mini-sidebar" && {
            [theme.breakpoints.up("lg")]: {
              ml: `${MiniSidebarWidth}px`,
            },
          }),
          bgcolor: theme.palette.background.paper,
        }}
      >
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {showHeader && <OrgHeader />}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            {children}
          </Box>
        </Box>
      </PageWrapper>
    </MainWrapper>
  );
}
