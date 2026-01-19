/**
 * useApiAuth Hook
 *
 * This hook integrates the unified API client with NextAuth session.
 * It automatically sets the authentication token on the API client
 * when the session changes.
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, isLoading, user } = useApiAuth();
 *
 *   if (isLoading) return <Loading />;
 *   if (!isAuthenticated) return <LoginPrompt />;
 *
 *   return <Dashboard user={user} />;
 * }
 * ```
 */

"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo } from "react";
import { setAuthToken, clearAuthToken, privateApi } from "@/utils/api-client";

// For backward compatibility with existing code
import { setAuthorizationHeader } from "@/utils/axios";

export interface ApiAuthUser {
  id?: string;
  email?: string;
  name?: string;
  image?: string;
  orgId?: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
  permissions?: string[];
}

export interface UseApiAuthReturn {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether the session is loading */
  isLoading: boolean;
  /** The current user, if authenticated */
  user: ApiAuthUser | null;
  /** The current access token */
  accessToken: string | null;
  /** The current organization ID */
  orgId: string | null;
  /** User roles */
  roles: string[];
  /** User permissions */
  permissions: string[];
  /** Check if user has a specific role */
  hasRole: (role: string) => boolean;
  /** Check if user has a specific permission */
  hasPermission: (permission: string) => boolean;
  /** Check if user has any of the specified roles */
  hasAnyRole: (roles: string[]) => boolean;
  /** Check if user has all of the specified permissions */
  hasAllPermissions: (permissions: string[]) => boolean;
}

export function useApiAuth(): UseApiAuthReturn {
  const { data: session, status } = useSession();

  // Update auth token when session changes
  useEffect(() => {
    if (session?.accessToken) {
      // Set token on new API client
      setAuthToken(session.accessToken);

      // Set token on legacy axios instance for backward compatibility
      setAuthorizationHeader(session.accessToken);
    } else {
      // Clear tokens
      clearAuthToken();
      setAuthorizationHeader("");
    }
  }, [session?.accessToken]);

  // Build user object
  const user = useMemo<ApiAuthUser | null>(() => {
    if (!session?.user) return null;

    return {
      id: session.user.sub,
      email: session.user.email ?? undefined,
      name:
        session.user.firstName && session.user.lastName
          ? `${session.user.firstName} ${session.user.lastName}`
          : undefined,
      image: session.user.image ?? undefined,
      orgId: session.user.orgId,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      roles: session.user.roles,
      permissions: session.user.permissions,
    };
  }, [session?.user]);

  // Role and permission helpers
  const roles = useMemo(
    () => session?.user?.roles ?? [],
    [session?.user?.roles]
  );

  const permissions = useMemo(
    () => session?.user?.permissions ?? [],
    [session?.user?.permissions]
  );

  const hasRole = useMemo(
    () => (role: string) => roles.includes(role),
    [roles]
  );

  const hasPermission = useMemo(
    () => (permission: string) => permissions.includes(permission),
    [permissions]
  );

  const hasAnyRole = useMemo(
    () => (checkRoles: string[]) => checkRoles.some((role) => roles.includes(role)),
    [roles]
  );

  const hasAllPermissions = useMemo(
    () =>
      (checkPermissions: string[]) =>
        checkPermissions.every((perm) => permissions.includes(perm)),
    [permissions]
  );

  return {
    isAuthenticated: status === "authenticated" && !!session?.accessToken,
    isLoading: status === "loading",
    user,
    accessToken: session?.accessToken ?? null,
    orgId: session?.user?.orgId ?? null,
    roles,
    permissions,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllPermissions,
  };
}

/**
 * Hook to get the organization ID from the current session
 */
export function useOrgId(): string | null {
  const { orgId } = useApiAuth();
  return orgId;
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(role: string): boolean {
  const { hasRole } = useApiAuth();
  return hasRole(role);
}

/**
 * Hook to check if user has a specific permission
 */
export function useHasPermission(permission: string): boolean {
  const { hasPermission } = useApiAuth();
  return hasPermission(permission);
}

/**
 * Higher-order component to require authentication
 * Redirects to login if not authenticated
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useApiAuth();

    if (isLoading) {
      return null; // Or a loading component
    }

    if (!isAuthenticated) {
      // This will be handled by middleware, but just in case
      if (typeof window !== "undefined") {
        window.location.href = "/api/auth/signin";
      }
      return null;
    }

    return <Component {...props} />;
  };
}

export default useApiAuth;
