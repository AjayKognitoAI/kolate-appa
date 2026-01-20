import React from "react";
import {
  Box,
  CardContent,
  Skeleton,
  Typography,
  Grid,
  Divider,
  Avatar,
} from "@mui/material";

export default function EnterpriseAboutTab({
  enterprise,
  loading,
}: {
  enterprise: any;
  loading: boolean;
}) {
  return (
    <Box>
      <CardContent>
        {loading || !enterprise ? (
          <Box>
            <Skeleton
              variant="circular"
              width={45}
              height={45}
              sx={{ mb: 2 }}
            />
            <Skeleton variant="text" width={200} height={40} />
            <Skeleton variant="text" width={120} height={24} />
            <Skeleton
              variant="rectangular"
              height={200}
              sx={{ my: 2, borderRadius: 2 }}
            />
          </Box>
        ) : (
          <>
            <Box display={"flex"} alignItems="center" gap={2}>
              <Avatar
                sx={{ width: 45, height: 45, fontSize: 20 }}
                src={enterprise.logo_url}
              >
                {enterprise.name?.[0]}
              </Avatar>
              <Box>
                <Typography variant="h4">{enterprise.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {enterprise.url || enterprise.domain}
                </Typography>
              </Box>
            </Box>
            <Grid container spacing={3} mt={4}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" mb={1}>
                  Enterprise name:
                </Typography>
                <Typography variant="body1">{enterprise.name}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" mb={1}>
                  Enterprise size:
                </Typography>
                <Typography variant="body1">
                  {enterprise.size || "-"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" mb={1}>
                  Region:
                </Typography>
                <Typography variant="body1">
                  {enterprise.region || "-"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" mb={1}>
                  Location:
                </Typography>
                <Typography variant="body1">
                  {enterprise.zip_code || "-"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" mb={1}>
                  Email Id:
                </Typography>
                <Typography variant="body1">
                  {enterprise.admin_email || "-"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" mb={1}>
                  Phone Number:
                </Typography>
                <Typography variant="body1">
                  {enterprise.contact_number || "-"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" mb={1}>
                  Admin:
                </Typography>
                <Box display={"flex"} gap={1}>
                  <Typography variant="body2">
                    {enterprise.admins
                      ?.map((a: any) => a.first_name)
                      .join(", ") || "-"}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" mb={1}>
                  Account Created on:
                </Typography>
                <Typography variant="body1">
                  {enterprise.created_at
                    ? new Date(enterprise.created_at).toLocaleDateString()
                    : "-"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" mb={1}>
                  Next renewal date:
                </Typography>
                <Typography variant="body1">-</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" mb={1}>
                  Plan:
                </Typography>
                <Typography variant="body1">Standard</Typography>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" sx={{ mb: 1 }}>
              About
            </Typography>
            <Typography variant="body2">
              {enterprise.description || "-"}
            </Typography>
          </>
        )}
      </CardContent>
    </Box>
  );
}
