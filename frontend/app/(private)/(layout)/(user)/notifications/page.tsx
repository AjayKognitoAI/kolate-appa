"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  deleteNotification,
  clearNotifications,
  selectNotifications,
  selectUnreadCount,
  selectNotificationLoading,
  selectHasNextPage,
  selectCurrentPage,
  selectTotalPages,
  NotificationItem,
  readAllNotifications,
} from "@/store/slices/notificationSlice";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import DoneIcon from "@mui/icons-material/Done";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import NotificationsIcon from "@mui/icons-material/Notifications";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@mui/material";
import { CheckCircle, CheckCircleOutline } from "@mui/icons-material";
import { getCurrentProject } from "@/store/slices/projectsSlice";
import {
  formatToUserLocalTime,
  formatRelativeToUser,
} from "@/utils/formatToUserTimeZon";

const trialsBySlug: Record<string, string> = {
  "metabolic-syndrome-therapy-k": "Metabolic Syndrome - Therapy K",
  "car-t-cell-therapy-b": "CAR T-Cell Therapy B",
  "lung-cancer-risk": "Lung Cancer Risk Prediction",
  "squamous-lung-therapy-n": "Squamous Cell Lung Cancer - Therapy N",
  "mcrc-therapy-p": "Metastatic Colorectal Cancer - Therapy P",
  "car-t-cell-b-lbcl": "CAR T-Cell Therapy B (LBCL)",
  "sq-lung-therapy-n": "Squamous Cell Lung Cancer - Therapy N",
};

export default function NotificationPage() {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const loading = useAppSelector(selectNotificationLoading);
  const hasNextPage = useAppSelector(selectHasNextPage);
  const currentPage = useAppSelector(selectCurrentPage);
  const totalPages = useAppSelector(selectTotalPages);
  const currentProject = useAppSelector(getCurrentProject);

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNotificationId, setSelectedNotificationId] = useState<
    string | null
  >(null);

  const { data: session } = useSession();
  const recipient = session?.user?.sub;

  const router = useRouter();

  // sentinel (viewport-based)
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // guards to prevent duplicate fetches and stale closure issues
  const fetchingRef = useRef<boolean>(false);
  const loadingRef = useRef<boolean>(loading);
  const initialLoadDoneRef = useRef<boolean>(false);

  // keep loadingRef in sync with Redux loading state
  useEffect(() => {
    loadingRef.current = loading;
    // Mark initial load done once we see loading become false at least once.
    if (!loading) {
      initialLoadDoneRef.current = true;
    }
  }, [loading]);

  // Initial data loading (and mark initialLoadDoneRef when done)
  useEffect(() => {
    if (!recipient) return;

    // Clear and load first page
    dispatch(clearNotifications());

    const action = dispatch(
      fetchNotifications({ recipient, page: 0, size: 20, reset: true })
    );

    // set unread count too
    dispatch(fetchUnreadCount(recipient));

    // If thunk returns a promise, ensure initialLoadDoneRef becomes true after it resolves
    if (action && typeof (action as any).then === "function") {
      (action as any)
        .then(() => {
          initialLoadDoneRef.current = true;
        })
        .catch(() => {
          initialLoadDoneRef.current = true;
        });
    } else {
      // fallback: mark it done (will also be set by loading effect when loading -> false)
      initialLoadDoneRef.current = true;
    }
  }, [recipient, dispatch]);

  // Viewport-based infinite scroll using IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // don't attach until initial load is done (prevents immediate cascade)
    if (!initialLoadDoneRef.current) return;

    // if no more pages, nothing to observe
    if (!hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries, observerInstance) => {
        const entry = entries[0];
        if (!entry) return;

        if (
          entry.isIntersecting &&
          recipient &&
          hasNextPage &&
          !loadingRef.current &&
          !fetchingRef.current
        ) {
          fetchingRef.current = true;

          // unobserve while fetching
          try {
            observerInstance.unobserve(sentinel);
          } catch (e) {
            /* ignore */
          }

          const action = dispatch(
            fetchNotifications({
              recipient,
              page: currentPage + 1,
              size: 10,
              reset: false,
            })
          );

          if (action && typeof (action as any).then === "function") {
            (action as any)
              .then(() => {
                // success
              })
              .catch((err: any) => {
                console.error("Failed to fetch notifications page:", err);
              })
              .finally(() => {
                fetchingRef.current = false;
                // re-observe if there are still pages
                if (hasNextPage) {
                  try {
                    observerInstance.observe(sentinel);
                  } catch (e) {
                    /* ignore */
                  }
                }
              });
          } else {
            // fallback if dispatch does not return a promise
            fetchingRef.current = false;
            if (hasNextPage) {
              try {
                observerInstance.observe(sentinel);
              } catch (e) {
                /* ignore */
              }
            }
          }
        }
      },
      {
        root: null, // viewport
        rootMargin: "400px 0px",
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      fetchingRef.current = false;
    };
    // Note: we intentionally exclude `loading` from deps (we use loadingRef). Recreate observer when these change:
  }, [recipient, hasNextPage, currentPage, dispatch]);

  // Handlers
  const handleMarkAsRead = useCallback(
    async (id: string) => {
      if (recipient) {
        dispatch(markAsRead(id));
      }
      handleCloseMenu();
    },
    [dispatch, recipient]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    dispatch(readAllNotifications(session?.user?.sub ?? ""));
  }, [dispatch, notifications]);

  const handleDelete = useCallback(
    async (id: string) => {
      dispatch(deleteNotification(id));
      handleCloseMenu();
    },
    [dispatch]
  );

  const handleOpenMenu = (
    event: React.MouseEvent<HTMLElement>,
    notificationId: string
  ) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setSelectedNotificationId(notificationId);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setSelectedNotificationId(null);
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    // Mark as read if unread
    if (notification.status === "UNREAD") {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    if (
      notification.type === "TRIAL_SHARED" &&
      notification.data?.slug &&
      notification.data?.execution_id
    ) {
      router.push(
        `/predict/${notification.data.slug}/${notification.data.execution_id}?project_id=${notification?.data?.project_id}`
      );
    }
  };

  const getNotificationDetails = (notification: NotificationItem) => {
    switch (notification.type) {
      case "PROJECT_INVITATION":
        return {
          category: "Project Invitation",
          message: `added you to the "${notification.data?.project_name}" project.`,
          color: "#6B2BDA",
        };
      case "TRIAL_SHARED":
        return {
          category: "Report Shared",
          message: `shared "${
            (trialsBySlug[notification.data?.slug] ?? notification.data?.slug) +
            " Analysis Report"
          }"`,
          color: "#07C690",
        };
      case "ROLE_ASSIGNED":
        return {
          category: "Role Assignment",
          message: `You have been assigned as ${
            notification.data?.role_name || "Project Manager"
          } for "${notification.data?.project_name || ""}"`,
          color: "#D97218",
        };

      default:
        return {
          category: notification.data?.category || "Notification",
          message: notification.data?.message || "New notification",
          color: "#6B2BDA",
        };
    }
  };

  const selectedNotification = notifications.find(
    (n: any) => n.id === selectedNotificationId
  );

  const getAvatarContent = (notification: NotificationItem) => {
    const name = notification.data?.sender_name;

    if (notification.type === "NEW_DATASET") {
      return { text: "AD", bg: "#E8E5FF", color: "#6C5CE7" };
    }

    if (name) {
      const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      return {
        text: initials,
        bg: undefined,
        color: undefined,
        src: notification.data?.sender_image,
      };
    }

    return { text: "U", bg: "#F5F5F5", color: "#666" };
  };

  return (
    <Paper
      elevation={0}
      sx={{ maxWidth: "900px", bgcolor: "transparent", borderRadius: 0 }}
    >
      {/* Header */}
      <Box sx={{ p: 3, pb: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h5" fontWeight={600}>
            Notifications
          </Typography>

          <Button
            size="small"
            variant="text"
            onClick={handleMarkAllAsRead}
            startIcon={<CheckCircleOutline sx={{ fontSize: 18 }} />}
            sx={{
              textTransform: "none",
              fontWeight: 500,
              color: "text.primary",
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            Mark all as read
          </Button>
        </Stack>
      </Box>

      {/* Content Area */}
      <Box sx={{ borderRadius: 0 }}>
        {notifications.length === 0 && !loading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 300,
              color: "text.secondary",
            }}
          >
            <NotificationsIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
            <Typography variant="h6" color="inherit">
              No notifications
            </Typography>
            <Typography variant="body2" color="inherit">
              You're all caught up!
            </Typography>
          </Box>
        ) : (
          <Box>
            {notifications.map((notification: NotificationItem, index) => {
              const details = getNotificationDetails(notification);
              const avatarContent = getAvatarContent(notification);
              const isUnread = notification.status === "UNREAD";

              return (
                <React.Fragment key={notification.id}>
                  <Box
                    sx={{
                      py: 2.5,
                      px: 3,
                      cursor:
                        notification?.type === "TRIAL_SHARED"
                          ? "pointer"
                          : "default",
                      "&:hover": {
                        backgroundColor: "rgba(0,0,0,0.03)",
                      },
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 2,
                      background: isUnread
                        ? "rgba(108, 92, 231, 0.06)"
                        : "transparent",
                      borderRadius: 0,
                    }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Status indicator - Left side */}
                    <Box
                      sx={{
                        width: 60,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: details.color,
                          fontWeight: 700,
                          fontSize: "13px",
                        }}
                      ></Typography>
                      <Avatar
                        src={notification?.data?.sender_image ?? ""}
                        sx={{
                          background: "#F9F5FF",
                          color: "#7F56D9",
                          fontSize: 14,
                        }}
                      >
                        {avatarContent.text}
                      </Avatar>
                    </Box>

                    {/* Main Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: details.color,
                          fontWeight: 500,
                          fontSize: "12px",
                          textTransform: "none",
                          display: "block",
                          mb: 0.5,
                        }}
                      >
                        {details.category}
                      </Typography>

                      <Typography
                        sx={{
                          color: "text.primary",
                          lineHeight: 1.6,
                          fontSize: "14px",
                          maxWidth: "80%",
                        }}
                      >
                        {notification?.type !== "ROLE_ASSIGNED" && (
                          <Typography
                            component="span"
                            sx={{
                              fontWeight: 600,
                              color: "#384252",
                            }}
                          >
                            {notification.data?.sender_name || ""}
                          </Typography>
                        )}{" "}
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: 400,
                            color: "#384252",
                          }}
                        >
                          {details.message}
                        </Typography>
                      </Typography>
                    </Box>

                    {/* Time and Actions */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexShrink: 0,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          fontSize: "13px",
                          minWidth: "30px",
                          textAlign: "right",
                        }}
                      >
                        {formatRelativeToUser(notification.timestamp)}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenMenu(e, notification.id)}
                        sx={{
                          ml: 0.5,
                          "&:hover": {
                            bgcolor: "action.hover",
                          },
                        }}
                        aria-label="more options"
                      >
                        <MoreHorizIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Box>
                  </Box>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}

            {/* Loading Skeleton */}
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Box key={i} sx={{ p: 2 }}>
                  <Skeleton
                    variant="rectangular"
                    height={60}
                    sx={{ borderRadius: 1 }}
                  />
                </Box>
              ))}

            {/* Infinite Scroll Sentinel (viewport-based) */}
            {!loading && hasNextPage && (
              <div ref={sentinelRef} style={{ height: 1 }} />
            )}
          </Box>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            minWidth: 150,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          },
        }}
      >
        {selectedNotification?.status === "UNREAD" && (
          <MenuItem onClick={() => handleMarkAsRead(selectedNotificationId!)}>
            <ListItemIcon>
              <DoneIcon fontSize="small" />
            </ListItemIcon>
            <Typography variant="body2">Mark as read</Typography>
          </MenuItem>
        )}
        <MenuItem onClick={() => handleDelete(selectedNotificationId!)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Delete</Typography>
        </MenuItem>
      </Menu>
    </Paper>
  );
}
