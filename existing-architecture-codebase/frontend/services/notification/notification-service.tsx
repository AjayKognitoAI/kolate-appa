import { fetchEventSource } from "@microsoft/fetch-event-source";
import { privateAxios } from "@/utils/axios";

export interface NotificationData {
  slug?: string;
  org_id?: string;
  sender_id?: string;
  project_id?: string;
  sender_name?: string;
  execution_id?: string;
  sender_email?: string;
  sender_image?: string;
  [key: string]: any;
}

export interface NotificationItem {
  id: string;
  recipient: string;
  type: string;
  status: string;
  timestamp: string;
  data: NotificationData;
}

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
  unreadCount: number;
}

/**
 * Service for interacting with the Notification Center backend
 */
export const notificationService = {
  /**
   * Subscribe to notifications via SSE using headers (with token).
   */
  subscribe: (
    recipient: string,
    token: string,
    onMessage: (data: NotificationItem) => void,
    onError?: (err: any) => void
  ) => {
    const controller = new AbortController();
    const encoded = encodeURIComponent(recipient);

    const url =
      process.env.NEXT_PUBLIC_API_URL +
      `/api/notification-center/v1/notification/stream/${encoded}`;

    fetchEventSource(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`, // ✅ token in headers
      },
      signal: controller.signal,

      async onopen(response) {
        if (
          response.ok &&
          response.headers.get("content-type")?.includes("text/event-stream")
        ) {
          console.log("SSE connection opened successfully.");
        } else {
          const error = new Error(
            `SSE connection failed: Status ${
              response.status
            }, ${await response.text()}`
          );
          console.error(error);
          throw error; // This will be caught by onerror and stop retries.
        }
      },
      onmessage(event) {
        try {
          const data: NotificationItem = JSON.parse(event.data);
          onMessage(data);
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      },
      onerror(err) {
        if (err.name === "AbortError") {
          // Connection was aborted intentionally, do not retry.
          console.log("SSE connection aborted by client.");
          throw err;
        }
        console.error("SSE connection error. Will retry in 5 seconds...", err);
        if (onError) onError(err);
        return 5000; // Retry all other errors after 5 seconds
      },
    });

    return () => {
      controller.abort();
    };
  },
};

export default notificationService;
