/**
 * useApiAuth Hook Tests
 *
 * Tests for the authentication hook functionality.
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { renderHook } from "@testing-library/react";
import { SessionProvider } from "next-auth/react";
import React from "react";

// Mock the API client
jest.mock("@/utils/api-client", () => ({
  setAuthToken: jest.fn(),
  clearAuthToken: jest.fn(),
  privateApi: {
    defaults: { headers: { common: {} } },
  },
}));

// Mock the legacy axios
jest.mock("@/utils/axios", () => ({
  setAuthorizationHeader: jest.fn(),
}));

// Mock next-auth/react
const mockUseSession = jest.fn();
jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("useApiAuth", () => {
  let useApiAuth: any;
  let setAuthToken: any;
  let clearAuthToken: any;
  let setAuthorizationHeader: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Import mocked modules
    const apiClient = await import("@/utils/api-client");
    const axios = await import("@/utils/axios");
    setAuthToken = apiClient.setAuthToken;
    clearAuthToken = apiClient.clearAuthToken;
    setAuthorizationHeader = axios.setAuthorizationHeader;

    // Import hook after mocks are set up
    const module = await import("@/hooks/use-api-auth");
    useApiAuth = module.useApiAuth;
  });

  describe("when loading", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "loading",
      });
    });

    it("should return isLoading true", () => {
      const { result } = renderHook(() => useApiAuth());
      expect(result.current.isLoading).toBe(true);
    });

    it("should return isAuthenticated false", () => {
      const { result } = renderHook(() => useApiAuth());
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("when authenticated", () => {
    const mockSession = {
      accessToken: "test-token-123",
      user: {
        sub: "auth0|user123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        image: "https://example.com/avatar.jpg",
        orgId: "org_123",
        roles: ["org:admin", "org:member"],
        permissions: ["read:all", "write:own"],
      },
    };

    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: "authenticated",
      });
    });

    it("should return isAuthenticated true", () => {
      const { result } = renderHook(() => useApiAuth());
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("should return isLoading false", () => {
      const { result } = renderHook(() => useApiAuth());
      expect(result.current.isLoading).toBe(false);
    });

    it("should return correct user data", () => {
      const { result } = renderHook(() => useApiAuth());
      expect(result.current.user).toEqual({
        id: "auth0|user123",
        email: "test@example.com",
        name: "John Doe",
        image: "https://example.com/avatar.jpg",
        orgId: "org_123",
        firstName: "John",
        lastName: "Doe",
        roles: ["org:admin", "org:member"],
        permissions: ["read:all", "write:own"],
      });
    });

    it("should return access token", () => {
      const { result } = renderHook(() => useApiAuth());
      expect(result.current.accessToken).toBe("test-token-123");
    });

    it("should return orgId", () => {
      const { result } = renderHook(() => useApiAuth());
      expect(result.current.orgId).toBe("org_123");
    });

    it("should return roles", () => {
      const { result } = renderHook(() => useApiAuth());
      expect(result.current.roles).toEqual(["org:admin", "org:member"]);
    });

    it("should return permissions", () => {
      const { result } = renderHook(() => useApiAuth());
      expect(result.current.permissions).toEqual(["read:all", "write:own"]);
    });

    describe("hasRole", () => {
      it("should return true for existing role", () => {
        const { result } = renderHook(() => useApiAuth());
        expect(result.current.hasRole("org:admin")).toBe(true);
      });

      it("should return false for non-existing role", () => {
        const { result } = renderHook(() => useApiAuth());
        expect(result.current.hasRole("root:admin")).toBe(false);
      });
    });

    describe("hasPermission", () => {
      it("should return true for existing permission", () => {
        const { result } = renderHook(() => useApiAuth());
        expect(result.current.hasPermission("read:all")).toBe(true);
      });

      it("should return false for non-existing permission", () => {
        const { result } = renderHook(() => useApiAuth());
        expect(result.current.hasPermission("delete:all")).toBe(false);
      });
    });

    describe("hasAnyRole", () => {
      it("should return true if user has any of the roles", () => {
        const { result } = renderHook(() => useApiAuth());
        expect(result.current.hasAnyRole(["org:admin", "root:admin"])).toBe(
          true
        );
      });

      it("should return false if user has none of the roles", () => {
        const { result } = renderHook(() => useApiAuth());
        expect(result.current.hasAnyRole(["root:admin", "super:admin"])).toBe(
          false
        );
      });
    });

    describe("hasAllPermissions", () => {
      it("should return true if user has all permissions", () => {
        const { result } = renderHook(() => useApiAuth());
        expect(
          result.current.hasAllPermissions(["read:all", "write:own"])
        ).toBe(true);
      });

      it("should return false if user is missing a permission", () => {
        const { result } = renderHook(() => useApiAuth());
        expect(
          result.current.hasAllPermissions(["read:all", "delete:all"])
        ).toBe(false);
      });
    });
  });

  describe("when unauthenticated", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
      });
    });

    it("should return isAuthenticated false", () => {
      const { result } = renderHook(() => useApiAuth());
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should return null user", () => {
      const { result } = renderHook(() => useApiAuth());
      expect(result.current.user).toBeNull();
    });

    it("should return null accessToken", () => {
      const { result } = renderHook(() => useApiAuth());
      expect(result.current.accessToken).toBeNull();
    });

    it("should return empty roles", () => {
      const { result } = renderHook(() => useApiAuth());
      expect(result.current.roles).toEqual([]);
    });

    it("should return empty permissions", () => {
      const { result } = renderHook(() => useApiAuth());
      expect(result.current.permissions).toEqual([]);
    });
  });
});
