"use client";
import React, { ReactNode } from "react";
import { AppBar, Toolbar, styled, Typography, Box, Stack } from "@mui/material";
import config from "@/context/config";
import Head from "next/head";
import HeaderMobileMenu from "./HeaderMobileMenu";
import { useSession } from "next-auth/react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  rightContent?: ReactNode;
}

const Header = ({ title, subtitle, rightContent }: HeaderProps) => {
  const TopbarHeight = config.topbarHeight;

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: "none",
    background: theme.palette.background.default,
    justifyContent: "center",
    backdropFilter: "blur(4px)",
    [theme.breakpoints.up("lg")]: {
      minHeight: TopbarHeight,
    },
    marginBlock: "20px !important",
  }));

  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: "100%",
    color: theme.palette.text.primary,
    paddingLeft: "0px !important",
    paddingRight: "0px !important",
    alignItems: "flex-start",
  }));

  const { data: session } = useSession();

  return (
    <AppBarStyled position="static" color="default">
      <ToolbarStyled>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} width="100%">
          <Stack direction="row" spacing={2} alignItems="center" width="100%">
            {/* Sidebar Toggle Button */}
            {!session?.user?.roles?.includes("org:member") && (
              <HeaderMobileMenu />
            )}

            {/* Title and Subtitle */}
            <Stack direction="column" spacing={0} flexGrow={1}>
              <Typography variant="h4" fontWeight={500} mb={1}>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="textSecondary">
                  {subtitle}
                </Typography>
              )}
            </Stack>
          </Stack>

          {/* Right Side Content */}
          {rightContent && (
            <Box sx={{ width: "100%" }}>
              <Stack
                direction="row"
                spacing={2}
                justifyContent={{ xs: "flex-start", md: "flex-end" }}
                alignItems="center"
              >
                {rightContent}
              </Stack>
            </Box>
          )}
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default Header;
