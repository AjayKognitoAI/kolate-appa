"use client";
import PageContainer from "@/components/container/PageContainer";
import Header from "@/components/layout/header/Header";
import { Box, Card } from "@mui/material";
import { useSession } from "next-auth/react";
import { Grid, Button, TextField, Stack, Typography } from "@mui/material";
import RoleCard from "@/components/org/RoleCard";
import AddIcon from "@mui/icons-material/Add";
import CustomTextField from "@/components/forms/theme-elements/CustomTextField";

const roles = [
  {
    name: "Admin",
    description:
      "Full access to all features, settings and organisation structure",
    users: 2,
    permissions: 25,
  },
  {
    name: "Project Manager",
    description: "Can manage multiple projects across organisation",
    users: 3,
    permissions: 8,
  },
  {
    name: "Read-only user",
    description: "Can view project information but cannot make changes",
    users: 3,
    permissions: 8,
  },
  {
    name: "Project Admin",
    description: "Can manage specific assigned projects and their resources",
    users: 4,
    permissions: 15,
  },
  {
    name: "Team members",
    description: "Can collaborate on assigned projects",
    users: 4,
    permissions: 8,
  },
];
export default function Privileges() {
  const { data: session } = useSession();

  return (
    <PageContainer
      title="Dashboard"
      description="clinical decision support dashboard"
    >
      <Box px={3}>
        <Box>
          <Header
            title={`Hi, ${session?.user?.firstName} ${session?.user?.lastName}!`}
            subtitle="Here's your clinical decision support dashboard"
          />
        </Box>
        <Card
          variant="outlined"
          sx={{ p: 3, boxShadow: "none", borderRadius: 0.5 }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
          >
            <Box>
              <Typography variant="h5" fontWeight={700} mb={0.5}>
                Roles
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Define roles with specific permissions for your organization
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<AddIcon />}>
              Add Role
            </Button>
          </Stack>
          <CustomTextField
            placeholder="Search roles by name or description"
            variant="outlined"
            size="small"
            fullWidth
            sx={{ mb: 3 }}
          />
          <Grid container spacing={3}>
            {roles.map((role) => (
              <Grid size={{ xs: 12, sm: 6 }} key={role.name} component={Grid}>
                <RoleCard {...role} />
              </Grid>
            ))}
          </Grid>
        </Card>
      </Box>
    </PageContainer>
  );
}
