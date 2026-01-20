import React, { useEffect, useRef, useState } from "react";
import {
  Toolbar,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Box,
  Avatar,
} from "@mui/material";
import { LogoutOutlined } from "@mui/icons-material";
import ProjectDropdownMenu from "../sidebar/ProjectDropdownMenu";
import { signOut, useSession } from "next-auth/react";
import { IconBell } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  addNotificationFromSSE,
  fetchUnreadCount,
  NotificationItem,
} from "@/store/slices/notificationSlice";
import notificationService from "@/services/notification/notification-service";
import HeaderMobileMenu from "./HeaderMobileMenu";

const OrgHeader = () => {
  const { data: session } = useSession();
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(
    null
  );

  const pathname = usePathname();
  const router = useRouter();
  const isNotifications = pathname?.includes("notifications");
  const { unreadCount } = useAppSelector((state) => state.notifications);

  const dispatch = useAppDispatch();

  const handleNotificationClick = () => {
    router.push("/notifications");
  };

  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    signOut();
  };

  const sseInitialized = useRef(false);

  useEffect(() => {
    if (
      !session?.user?.sub ||
      !session?.accessToken ||
      sseInitialized.current
    ) {
      return;
    }

    sseInitialized.current = true;

    dispatch(fetchUnreadCount(session.user.sub));

    const unsubscribe = notificationService.subscribe(
      session.user.sub,
      session.accessToken,
      (data: any) => {
        dispatch(addNotificationFromSSE(data));
      },
      (err: any) => {
        console.log("❌ SSE error:", err);
      }
    );

    return () => {
      unsubscribe();
      sseInitialized.current = false;
    };
  }, [session?.user?.sub, session?.accessToken, dispatch]);

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: "white",
        borderBottom: "1px solid",
        borderColor: "divider",
        borderRadius: 0,
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", px: 3 }}>
        {/* Left placeholder */}
        <Box sx={{ flex: 1 }}>
          <HeaderMobileMenu />
        </Box>

        {/* Project Selection */}
        <Box sx={{ mr: 4, display: "flex", alignItems: "center" }}>
          <ProjectDropdownMenu />
        </Box>

        {/* Actions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
          <IconButton
            sx={{
              color: "text.secondary",
              bgcolor: isNotifications ? "#E3DFFA80" : "transparent",
            }}
            onClick={handleNotificationClick}
          >
            <Badge badgeContent={unreadCount || 0} color="primary">
              <IconBell color={isNotifications ? "#2341B0" : "#384252"} />
            </Badge>
          </IconButton>

          <IconButton onClick={handleUserMenuClick} sx={{ p: 0.5 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: "#ff7043",
                fontSize: "14px",
                fontWeight: "bold",
              }}
              src={session?.user?.image ?? ""}
            >
              {session?.user?.firstName?.[0] ?? ""}
            </Avatar>
          </IconButton>
        </Box>
      </Toolbar>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 150,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          },
        }}
      >
        <MenuItem onClick={handleLogout}>
          <LogoutOutlined sx={{ mr: 1, fontSize: 20 }} />
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default OrgHeader;
