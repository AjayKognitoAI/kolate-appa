"use client";

import React, { useEffect, useState } from "react";
import RootLayout from "@/components/shared/RootLayout";
import { Box, Button, Divider, Skeleton, Typography } from "@mui/material";
import { IconReload } from "@tabler/icons-react";
import Image from "next/image";
import { urlWrapper } from "@/utils/url-wrapper";
import { getUserProjectsRolesPermissions } from "@/services/project/project-service";
import { useSession } from "next-auth/react";
import { setProjects } from "@/store/slices/projectsSlice";
import moduleService from "@/services/module/module-service";
import { setModules } from "@/store/slices/moduleAccessSlice";
import ErrorLayout from "@/components/layout/error-layout";
import { useAppDispatch } from "@/store";

const SIDEBAR_WIDTH = 269;

function SidebarSkeleton() {
  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: "100vh",
        borderRight: "1px solid #e5e8ef",
        display: "flex",
        flexDirection: "column",
        p: 2,
      }}
    >
      <Skeleton
        variant="rectangular"
        width={120}
        height={32}
        sx={{ mb: 4, borderRadius: 1 }}
      />
      <Skeleton
        variant="rectangular"
        width={90}
        height={24}
        sx={{ mb: 1, borderRadius: 1 }}
      />
      <Skeleton
        variant="rectangular"
        width={60}
        height={20}
        sx={{ mb: 3, borderRadius: 1 }}
      />
      <Divider sx={{ my: 2 }} />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton
          key={i}
          variant="rectangular"
          width="90%"
          height={28}
          sx={{ mb: 1.5, borderRadius: 1 }}
        />
      ))}
      <Box flex={1} />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
        <Skeleton variant="circular" width={32} height={32} />
        <Box>
          <Skeleton
            variant="rectangular"
            width={80}
            height={16}
            sx={{ mb: 0.5, borderRadius: 1 }}
          />
          <Skeleton
            variant="rectangular"
            width={60}
            height={12}
            sx={{ borderRadius: 1 }}
          />
        </Box>
      </Box>
    </Box>
  );
}

function ContentSkeleton() {
  return (
    <Box
      sx={{
        flex: 1,
        p: { xs: 2, md: 4 },
        minHeight: "100vh",
      }}
    >
      <Skeleton
        variant="rectangular"
        height={48}
        width="40%"
        sx={{ mb: 3, borderRadius: 2 }}
      />
      {[1, 2, 3].map((i) => (
        <Skeleton
          key={i}
          variant="rectangular"
          height={180}
          width="100%"
          sx={{ mb: 3, borderRadius: 2 }}
        />
      ))}
    </Box>
  );
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(false);
  const [hasProjects, setHasProjects] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.sub)
      (async () => {
        try {
          setLoading(true);
          const { data } = await getUserProjectsRolesPermissions(
            session?.user?.sub ?? ""
          );
          if (
            !data?.data ||
            !Array.isArray(data?.data) ||
            data?.data.length === 0
          ) {
            setHasProjects(false);
          } else {
            dispatch(setProjects(data?.data));
          }

          const { data: orgData } = await moduleService.getOrganizationModules(
            session?.user?.orgId ?? ""
          );

          if (orgData) {
            dispatch(setModules(orgData?.data || []));
          }
        } catch (error) {
          setErrorState(true);
        } finally {
          setLoading(false);
        }
      })();
  }, [session?.user?.sub]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", minHeight: "100vh", maxHeight: "100vh" }}>
        <SidebarSkeleton />
        <ContentSkeleton />
      </Box>
    );
  }

  if (errorState) {
    return (
      <ErrorLayout>
        <Box sx={{ mb: 4 }}>
          <Image
            src={urlWrapper.background + "error.svg"} // Add an SVG or image in your public folder
            alt="Error Illustration"
            width={300}
            height={200}
            style={{ objectFit: "contain" }}
          />
        </Box>
        {/* Text */}
        <Typography variant="h4" gutterBottom>
          Unable to Load Projects
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          align="center"
          sx={{ maxWidth: 500 }}
        >
          There was a server error while loading your project access. Please try
          again.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<IconReload size={"18px"} />}
          onClick={() => window.location.reload()}
          sx={{ px: 6, mt: 4 }}
        >
          Retry
        </Button>
      </ErrorLayout>
    );
  }

  if (!hasProjects) {
    return (
      <ErrorLayout>
        <Box sx={{ mb: 4 }}>
          <Image
            src={urlWrapper.background + "no-projects.svg"} // Add an SVG or image in your public folder
            alt="Error Illustration"
            width={300}
            height={200}
            style={{ objectFit: "contain" }}
          />
        </Box>
        {/* Text */}
        <Typography variant="h4" gutterBottom>
          No Project Assigned
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          align="center"
          sx={{ maxWidth: 500 }}
        >
          You don’t have access to any project yet. Please contact your
          enterprise admin to assign access.
        </Typography>
      </ErrorLayout>
    );
  }

  return <RootLayout showHeader>{children}</RootLayout>;
}
