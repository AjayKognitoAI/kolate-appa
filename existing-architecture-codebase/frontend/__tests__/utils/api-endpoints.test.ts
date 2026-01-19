/**
 * API Endpoints Tests
 *
 * Tests for endpoint mapping and helper functions.
 */

import { describe, it, expect } from "@jest/globals";
import {
  ENDPOINTS,
  API_VERSION,
  mapLegacyEndpoint,
  buildEndpointWithParams,
  buildPaginatedEndpoint,
  LEGACY_ENDPOINT_MAP,
} from "@/utils/api-endpoints";

describe("API Endpoints", () => {
  describe("API Version", () => {
    it("should have correct API version", () => {
      expect(API_VERSION).toBe("/api/v1");
    });
  });

  describe("Enterprise Endpoints", () => {
    it("should have correct list endpoint", () => {
      expect(ENDPOINTS.ENTERPRISES.LIST).toBe("/api/v1/enterprises");
    });

    it("should have correct search endpoint", () => {
      expect(ENDPOINTS.ENTERPRISES.SEARCH).toBe("/api/v1/enterprises/search");
    });

    it("should build correct by-id endpoint", () => {
      expect(ENDPOINTS.ENTERPRISES.BY_ID("123")).toBe("/api/v1/enterprises/123");
    });

    it("should build correct admins endpoint", () => {
      expect(ENDPOINTS.ENTERPRISES.ADMINS("123")).toBe(
        "/api/v1/enterprises/123/admins"
      );
    });
  });

  describe("Project Endpoints", () => {
    it("should have correct list endpoint", () => {
      expect(ENDPOINTS.PROJECTS.LIST).toBe("/api/v1/projects");
    });

    it("should build correct users endpoint", () => {
      expect(ENDPOINTS.PROJECTS.USERS("proj-123")).toBe(
        "/api/v1/projects/proj-123/users"
      );
    });
  });

  describe("Patient Records Endpoints", () => {
    it("should build correct list endpoint", () => {
      expect(ENDPOINTS.PATIENT_RECORDS.LIST("proj-1", "trial-1")).toBe(
        "/api/v1/patient-records/proj-1/trial-1"
      );
    });

    it("should build correct by-id endpoint", () => {
      expect(
        ENDPOINTS.PATIENT_RECORDS.BY_ID("proj-1", "trial-1", "rec-1")
      ).toBe("/api/v1/patient-records/proj-1/trial-1/rec-1");
    });
  });

  describe("Execution Records Endpoints", () => {
    it("should build correct list endpoint", () => {
      expect(ENDPOINTS.EXECUTIONS.LIST("proj-1", "trial-1")).toBe(
        "/api/v1/executions/proj-1/trial-1"
      );
    });

    it("should build correct by-id endpoint", () => {
      expect(ENDPOINTS.EXECUTIONS.BY_ID("proj-1", "trial-1", "exec-1")).toBe(
        "/api/v1/executions/proj-1/trial-1/exec-1"
      );
    });
  });

  describe("Legacy Endpoint Mapping", () => {
    it("should have mapping for enterprise-manager endpoints", () => {
      expect(
        LEGACY_ENDPOINT_MAP["/api/enterprise-manager/v1/enterprises"]
      ).toBe(ENDPOINTS.ENTERPRISES.LIST);
    });

    it("should have mapping for project-manager endpoints", () => {
      expect(LEGACY_ENDPOINT_MAP["/api/project-manager/v1/project"]).toBe(
        ENDPOINTS.PROJECTS.LIST
      );
    });

    it("should have mapping for mongo-database-manager endpoints", () => {
      expect(
        LEGACY_ENDPOINT_MAP["/api/mongo-database-manager/v1/patient-record"]
      ).toBe("/api/v1/patient-records");
    });
  });

  describe("mapLegacyEndpoint", () => {
    it("should map known legacy endpoints", () => {
      expect(mapLegacyEndpoint("/api/enterprise-manager/v1/enterprises")).toBe(
        "/api/v1/enterprises"
      );
    });

    it("should map legacy endpoints with suffixes", () => {
      expect(
        mapLegacyEndpoint("/api/enterprise-manager/v1/enterprises/123")
      ).toBe("/api/v1/enterprises/123");
    });

    it("should return new endpoints as-is", () => {
      expect(mapLegacyEndpoint("/api/v1/enterprises")).toBe(
        "/api/v1/enterprises"
      );
    });
  });

  describe("buildEndpointWithParams", () => {
    it("should build endpoint with single param", () => {
      expect(
        buildEndpointWithParams("/api/v1/enterprises", { page: 1 })
      ).toBe("/api/v1/enterprises?page=1");
    });

    it("should build endpoint with multiple params", () => {
      const result = buildEndpointWithParams("/api/v1/enterprises", {
        page: 1,
        size: 10,
        status: "ACTIVE",
      });
      expect(result).toContain("/api/v1/enterprises?");
      expect(result).toContain("page=1");
      expect(result).toContain("size=10");
      expect(result).toContain("status=ACTIVE");
    });

    it("should filter out undefined params", () => {
      expect(
        buildEndpointWithParams("/api/v1/enterprises", {
          page: 1,
          status: undefined,
        })
      ).toBe("/api/v1/enterprises?page=1");
    });

    it("should handle endpoint without params", () => {
      expect(buildEndpointWithParams("/api/v1/enterprises", {})).toBe(
        "/api/v1/enterprises"
      );
    });
  });

  describe("buildPaginatedEndpoint", () => {
    it("should build paginated endpoint with defaults", () => {
      const result = buildPaginatedEndpoint("/api/v1/enterprises");
      expect(result).toContain("page=1");
      expect(result).toContain("size=10");
    });

    it("should build paginated endpoint with custom values", () => {
      const result = buildPaginatedEndpoint("/api/v1/enterprises", 2, 25);
      expect(result).toContain("page=2");
      expect(result).toContain("size=25");
    });

    it("should include additional params", () => {
      const result = buildPaginatedEndpoint("/api/v1/enterprises", 1, 10, {
        status: "ACTIVE",
      });
      expect(result).toContain("page=1");
      expect(result).toContain("size=10");
      expect(result).toContain("status=ACTIVE");
    });
  });
});
