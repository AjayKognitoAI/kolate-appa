import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { privateAxios } from "@/utils/axios";
import { RootState } from "..";

// Base notification data interface
export interface BaseNotificationData {
  sender_id?: string;
  sender_name?: string;
  sender_email?: string;
  sender_image?: string;
  [key: string]: any;
}

// Specific notification data types
export interface TrialSharedData extends BaseNotificationData {
  slug: string;
  org_id: string;
  project_id: string;
  execution_id: string;
}

// Union type for all possible notification data
export type NotificationData = TrialSharedData;

export interface NotificationItem {
  id: string;
  recipient: string;
  type: "TRIAL_SHARED" | string;
  status: "UNREAD" | "READ";
  timestamp: string;
  data: NotificationData;
}

// Type guards for notification data
export const isTrialSharedData = (
  data: NotificationData
): data is TrialSharedData => {
  return "slug" in data && "execution_id" in data;
};

// Utility functions for notification content
export const getNotificationTitle = (
  notification: NotificationItem
): string => {
  const { type, data } = notification;

  switch (type) {
    case "TRIAL_SHARED":
      if (isTrialSharedData(data)) {
        return data.sender_name || data.sender_email || "Someone";
      }
      return "Trial Shared";

    default:
      return "Notification";
  }
};

export const getNotificationMessage = (
  notification: NotificationItem
): string => {
  const { type, data } = notification;

  switch (type) {
    case "TRIAL_SHARED":
      return "shared a trial with you";

    default:
      return "New notification";
  }
};

export const getNotificationIcon = (notification: NotificationItem): string => {
  const { type } = notification;

  switch (type) {
    case "TRIAL_SHARED":
      return "FolderOpen";

    default:
      return "Notifications";
  }
};

export const getNotificationAction = (
  notification: NotificationItem
): { url?: string; text?: string } | null => {
  const { type, data } = notification;

  switch (type) {
    case "TRIAL_SHARED":
      if (isTrialSharedData(data)) {
        return {
          url: `/predict/${data.slug}/${data.execution_id}`,
          text: "View Trial",
        };
      }
      break;
  }

  return null;
};

export interface NotificationPageResponse {
  content: NotificationItem[];
  page: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  total_elements: number;
  total_pages: number;
  number_of_elements: number;
}

export interface NotificationCountResponse {
  unread_count: number;
}

// State interface
export interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalElements: number;
  hasNextPage: boolean;
  loading: boolean;
  error: string | null;
  lastFetchedRecipient: string | null;
}

// Initial state
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  currentPage: 0,
  totalPages: 1,
  pageSize: 10,
  totalElements: 0,
  hasNextPage: false,
  loading: false,
  error: null,
  lastFetchedRecipient: null,
};

// Async thunks
export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async (params: {
    recipient: string;
    page?: number;
    size?: number;
    reset?: boolean;
  }) => {
    const { recipient, page = 0, size = 20, reset = false } = params;
    const encoded = encodeURIComponent(recipient);
    const response = await privateAxios.get(
      `/api/notification-center/v1/notification/${encoded}?page=${page}&size=${size}`
    );
    return {
      data: response.data.data as NotificationPageResponse,
      reset,
      recipient,
    };
  }
);

export const fetchUnreadCount = createAsyncThunk(
  "notifications/fetchUnreadCount",
  async (recipient: string) => {
    const encoded = encodeURIComponent(recipient);
    const response = await privateAxios.get(
      `/api/notification-center/v1/notification/${encoded}/unread-count`
    );
    console.log(response.data.data);
    return response.data.data as NotificationCountResponse;
  }
);

export const markAsRead = createAsyncThunk(
  "notifications/markAsRead",
  async (id: string) => {
    await privateAxios.put(
      `/api/notification-center/v1/notification/${id}/read`
    );
    return id;
  }
);
export const readAllNotifications = createAsyncThunk(
  "notifications/readAllNotifications",
  async (recipient: string) => {
    const encoded = encodeURIComponent(recipient);
    // adjust URL if your backend uses a different path
    await privateAxios.put(
      `/api/notification-center/v1/notification/${encoded}/readAll`
    );
    return { recipient };
  }
);

export const deleteNotification = createAsyncThunk(
  "notifications/deleteNotification",
  async (id: string) => {
    await privateAxios.delete(`/api/notification-center/v1/notification/${id}`);
    return id;
  }
);

// Slice
const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    clearNotifications: (state) => {
      state.notifications = [];
      state.currentPage = 0;
      state.totalPages = 1;
      state.totalElements = 0;
      state.hasNextPage = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateNotificationOptimistic: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<NotificationItem> }>
    ) => {
      const { id, updates } = action.payload;
      const index = state.notifications.findIndex((n) => n.id === id);
      if (index !== -1) {
        state.notifications[index] = {
          ...state.notifications[index],
          ...updates,
        };
      }
    },
    removeNotificationOptimistic: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.notifications = state.notifications.filter((n) => n.id !== id);
      state.totalElements = Math.max(0, state.totalElements - 1);
    },
    // SSE handlers
    addNotificationFromSSE: (
      state,
      action: PayloadAction<NotificationItem>
    ) => {
      // Add new notification to the beginning of the list
      state.notifications.unshift(action.payload);
      state.totalElements += 1;
      if (action.payload.status === "UNREAD") {
        state.unreadCount += 1;
      }
    },
    updateNotificationFromSSE: (
      state,
      action: PayloadAction<NotificationItem>
    ) => {
      const index = state.notifications.findIndex(
        (n) => n.id === action.payload.id
      );
      if (index !== -1) {
        const oldStatus = state.notifications[index].status;
        state.notifications[index] = action.payload;

        // Update unread count if status changed
        if (oldStatus === "UNREAD" && action.payload.status === "READ") {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        } else if (oldStatus === "READ" && action.payload.status === "UNREAD") {
          state.unreadCount += 1;
        }
      }
    },
    removeNotificationFromSSE: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const notification = state.notifications.find((n) => n.id === id);
      if (notification) {
        state.notifications = state.notifications.filter((n) => n.id !== id);
        state.totalElements = Math.max(0, state.totalElements - 1);
        if (notification.status === "UNREAD") {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch notifications
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        const { data, reset, recipient } = action.payload;

        if (reset || state.lastFetchedRecipient !== recipient) {
          // Reset notifications for new recipient or explicit reset
          state.notifications = data.content;
          state.currentPage = data.page;
        } else {
          // Append to existing notifications (pagination)
          const existingIds = new Set(state.notifications.map((n) => n.id));
          const newNotifications = data.content.filter(
            (n) => !existingIds.has(n.id)
          );
          state.notifications.push(...newNotifications);
          state.currentPage = data.page;
        }

        state.totalPages = data.total_pages;
        state.totalElements = data.total_elements;
        state.hasNextPage = !data.last;
        state.pageSize = data.size;
        state.lastFetchedRecipient = recipient;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch notifications";
      });

    // Fetch unread count
    builder
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload.unread_count;
      })
      .addCase(fetchUnreadCount.rejected, (state, action) => {
        state.error = action.error.message || "Failed to fetch unread count";
      });

    // Mark as read
    builder
      .addCase(markAsRead.fulfilled, (state, action) => {
        const id = action.payload;

        const index = state.notifications.findIndex((n) => n.id === id);
        if (index !== -1) {
          const oldStatus = state.notifications[index].status;
          state.notifications[index].status = "READ";

          // Update unread count if status changed from UNREAD to READ
          if (oldStatus === "UNREAD") {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        // Revert optimistic update if needed
        state.error = action.error.message || "Failed to mark as read";
      });

    builder
      .addCase(readAllNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(readAllNotifications.fulfilled, (state, action) => {
        state.loading = false;
        // mark all loaded notifications as READ
        state.notifications = state.notifications.map((n) => ({
          ...n,
          status: "READ",
        }));
        state.unreadCount = 0;
      })
      .addCase(readAllNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to mark all as read";
      });

    // Delete notification
    builder
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const deletedId = action.payload;
        const notification = state.notifications.find(
          (n) => n.id === deletedId
        );
        if (notification) {
          state.notifications = state.notifications.filter(
            (n) => n.id !== deletedId
          );
          state.totalElements = Math.max(0, state.totalElements - 1);
          if (notification.status === "UNREAD") {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        // Revert optimistic update if needed
        state.error = action.error.message || "Failed to delete notification";
      });
  },
});

// Export actions and reducer
export const {
  clearNotifications,
  clearError,
  updateNotificationOptimistic,
  removeNotificationOptimistic,
  addNotificationFromSSE,
  updateNotificationFromSSE,
  removeNotificationFromSSE,
} = notificationSlice.actions;

export default notificationSlice.reducer;

// Selectors
export const selectNotifications = (state: RootState) =>
  state.notifications.notifications;
export const selectUnreadCount = (state: RootState) =>
  state.notifications.unreadCount;
export const selectNotificationLoading = (state: RootState) =>
  state.notifications.loading;
export const selectNotificationError = (state: RootState) =>
  state.notifications.error;
export const selectHasNextPage = (state: RootState) =>
  state.notifications.hasNextPage;
export const selectCurrentPage = (state: RootState) =>
  state.notifications.currentPage;
export const selectTotalPages = (state: RootState) =>
  state.notifications.totalPages;
