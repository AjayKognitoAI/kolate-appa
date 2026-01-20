/**
 * API Provider
 *
 * This provider integrates the unified API client with the application.
 * It automatically syncs the authentication token from NextAuth session
 * to the API client.
 *
 * Usage in layout.tsx:
 * ```tsx
 * import { ApiProvider } from "@/providers/api-provider";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <SessionProvider>
 *       <ApiProvider>
 *         {children}
 *       </ApiProvider>
 *     </SessionProvider>
 *   );
 * }
 * ```
 */

"use client";

import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import {
  setAuthToken,
  clearAuthToken,
  API_BASE_URL,
  API_VERSION,
} from "@/utils/api-client";
import { setAuthorizationHeader } from "@/utils/axios";

// =============================================================================
// Context Types
// =============================================================================

export interface ApiContextValue {
  /** Whether the API client is ready (has auth token if authenticated) */
  isReady: boolean;
  /** The base URL of the API */
  baseUrl: string;
  /** The API version prefix */
  apiVersion: string;
  /** The current organization ID from the session */
  orgId: string | null;
}

// =============================================================================
// Context
// =============================================================================

const ApiContext = createContext<ApiContextValue>({
  isReady: false,
  baseUrl: API_BASE_URL,
  apiVersion: API_VERSION,
  orgId: null,
});

// =============================================================================
// Provider Component
// =============================================================================

export interface ApiProviderProps {
  children: ReactNode;
}

export function ApiProvider({ children }: ApiProviderProps): React.ReactElement {
  const { data: session, status } = useSession();

  // Sync auth token with API client
  useEffect(() => {
    if (status === "loading") {
      return; // Wait for session to load
    }

    if (session?.accessToken) {
      // Set token on new unified API client
      setAuthToken(session.accessToken);

      // Also set on legacy axios for backward compatibility
      setAuthorizationHeader(session.accessToken);

      console.debug("[ApiProvider] Auth token set on API client");
    } else {
      // Clear tokens when signed out
      clearAuthToken();
      setAuthorizationHeader("");

      console.debug("[ApiProvider] Auth token cleared from API client");
    }
  }, [session?.accessToken, status]);

  // Context value
  const contextValue: ApiContextValue = {
    isReady: status !== "loading",
    baseUrl: API_BASE_URL,
    apiVersion: API_VERSION,
    orgId: session?.user?.orgId ?? null,
  };

  return (
    <ApiContext.Provider value={contextValue}>{children}</ApiContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access the API context
 */
export function useApi(): ApiContextValue {
  const context = useContext(ApiContext);

  if (!context) {
    throw new Error("useApi must be used within an ApiProvider");
  }

  return context;
}

// =============================================================================
// Utility Components
// =============================================================================

/**
 * Component that waits for the API to be ready before rendering children
 */
export function WaitForApi({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}): React.ReactElement | null {
  const { isReady } = useApi();

  if (!isReady) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default ApiProvider;
