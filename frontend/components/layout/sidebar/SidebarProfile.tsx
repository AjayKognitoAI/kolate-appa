import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Divider,
  Tooltip,
} from "@mui/material";
import { Stack } from "@mui/system";
import React from "react";
import { useSession, signOut } from "next-auth/react";
import { IconLogout } from "@tabler/icons-react";

const SidebarProfile = () => {
  const { data: session } = useSession();

  const handleLogout = () => {
    signOut();
  };

  // Create initials for avatar if no profile image
  const getInitials = () => {
    if (session?.user?.firstName && session?.user?.lastName) {
      return `${session.user.firstName.charAt(0)}${session.user.lastName.charAt(
        0
      )}`;
    }
    if (session?.user?.email) {
      return session.user.email.charAt(0).toUpperCase();
    }
    return "";
  };

  return (
    <Box position="relative">
      <Divider sx={{ mb: 2 }} />
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            sx={{
              width: 30,
              height: 30,
              fontSize: 12,
            }}
            src={session?.user?.image as string}
          >
            {getInitials()}
          </Avatar>
          <Box maxWidth={150} overflow="hidden">
            <Typography variant="subtitle2" fontWeight={600} noWrap>
              {session?.user?.firstName
                ? `${session.user.firstName} ${session.user.lastName || ""}`
                : "User"}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {session?.user?.email || "user@example.com"}
            </Typography>
          </Box>
        </Stack>
        <Tooltip title="Logout">
          <IconButton onClick={handleLogout} size="small">
            <IconLogout size={20} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
};

export default SidebarProfile;
