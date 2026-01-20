import React from "react";
import { Card, Box, Skeleton, Stack } from "@mui/material";

const ProjectCardSkeleton: React.FC = () => {
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
      <Box sx={{ p: 3, pb: 2 }}>
        <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1 }} />
        <Skeleton
          variant="rectangular"
          width="100%"
          height={48}
          sx={{ mb: 2 }}
        />

        <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ mb: 1, mt: 0.5 }}
        >
          <Stack direction="row" spacing={-1}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="circular" width={24} height={24} />
          </Stack>
          <Skeleton variant="text" width="40%" height={20} sx={{ ml: 1 }} />
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2, mt: 2 }}
        >
          <Box>
            <Skeleton variant="text" width={100} height={20} />
            <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
              <Skeleton variant="circular" width={18} height={18} />
              <Skeleton variant="text" width={80} height={20} />
            </Stack>
          </Box>
          <Box>
            <Skeleton variant="text" width={100} height={20} />
            <Skeleton variant="text" width={120} height={20} sx={{ mt: 0.5 }} />
          </Box>
        </Stack>
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 3, py: 2, borderTop: "1px solid rgba(0, 0, 0, 0.12)" }}
      >
        <Skeleton variant="rectangular" width={60} height={24} />
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rectangular" width={70} height={28} />
          <Skeleton variant="circular" width={28} height={28} />
        </Stack>
      </Stack>
    </Card>
  );
};

export default ProjectCardSkeleton;
