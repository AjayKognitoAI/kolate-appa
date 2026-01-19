import React from "react";
import { Box, Skeleton, Stack, Grid, Card, CardContent } from "@mui/material";

const GenericPredictSkeleton = () => {
  return (
    <Box>
      {/* Patient Info Section */}
      <Card sx={{ mb: 3 }} variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Skeleton variant="circular" width={60} height={60} />
            <Box flex={1}>
              <Skeleton variant="text" width={120} height={28} sx={{ mb: 1 }} />
              <Skeleton variant="text" width={150} height={20} />
            </Box>
            <Skeleton variant="rectangular" width={140} height={36} />
          </Stack>
        </CardContent>
      </Card>

      {/* Patient Data Table */}
      <Card sx={{ mb: 3 }} variant="outlined">
        <CardContent>
          {/* Table Headers */}
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Grid component={Grid} size={{ xs: 2 }} key={index}>
                <Skeleton variant="text" width="100%" height={20} />
              </Grid>
            ))}
          </Grid>

          {/* Table Data Row */}
          <Grid container spacing={1}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Grid component={Grid} size={{ xs: 2 }} key={index}>
                <Skeleton variant="text" width="90%" height={24} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Prediction Results Cards */}
      <Grid container spacing={3}>
        <Grid component={Grid} size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Skeleton variant="text" width={140} height={24} sx={{ mb: 2 }} />
              <Skeleton variant="text" width={100} height={32} sx={{ mb: 2 }} />
              <Skeleton
                variant="rectangular"
                width="100%"
                height={8}
                sx={{ mb: 1 }}
              />
              <Skeleton variant="text" width={80} height={20} />
            </CardContent>
          </Card>
        </Grid>

        <Grid component={Grid} size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Skeleton variant="text" width={160} height={24} sx={{ mb: 2 }} />
              <Skeleton variant="text" width={60} height={32} sx={{ mb: 2 }} />
              <Skeleton
                variant="rectangular"
                width="100%"
                height={8}
                sx={{ mb: 1 }}
              />
              <Skeleton variant="text" width={80} height={20} />
            </CardContent>
          </Card>
        </Grid>

        <Grid component={Grid} size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Skeleton variant="text" width={180} height={24} sx={{ mb: 2 }} />
              <Skeleton variant="text" width={40} height={32} sx={{ mb: 2 }} />
              <Skeleton
                variant="rectangular"
                width="100%"
                height={8}
                sx={{ mb: 1 }}
              />
              <Skeleton variant="text" width={80} height={20} />
            </CardContent>
          </Card>
        </Grid>

        <Grid component={Grid} size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Skeleton variant="text" width={150} height={24} sx={{ mb: 2 }} />
              <Skeleton variant="text" width={50} height={32} sx={{ mb: 2 }} />
              <Skeleton
                variant="rectangular"
                width="100%"
                height={8}
                sx={{ mb: 1 }}
              />
              <Skeleton variant="text" width={80} height={20} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GenericPredictSkeleton;
