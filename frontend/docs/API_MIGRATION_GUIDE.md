# Frontend API Migration Guide

This guide documents the migration from Spring Boot microservices to the consolidated FastAPI backend.

## Overview

### Before (Spring Boot Microservices)
```
Frontend → API Gateway → Multiple Microservices
                        ├── enterprise-manager
                        ├── project-manager
                        ├── user-manager
                        ├── mongo-database-manager
                        ├── asset-manager
                        └── ... (13 services total)
```

### After (FastAPI Consolidated Backend)
```
Frontend → FastAPI Backend (All endpoints consolidated)
           └── /api/v1/*
```

## Quick Start

### 1. Update Environment Variables

```bash
# Old: Multiple API URLs
NEXT_PUBLIC_API_URL="https://api.example.com"
NEXT_PUBLIC_DATA_PIPELINE_API_URL="https://data-pipeline.example.com"
NEXT_PUBLIC_ML_EVAL_API_URL="https://ml-eval.example.com"

# New: Single API URL
NEXT_PUBLIC_API_URL="https://api.example.com"
```

### 2. Update Imports

```typescript
// Old imports
import { privateAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

// New imports
import { apiClient } from "@/utils/api-client";
import { ENDPOINTS } from "@/utils/api-endpoints";
```

### 3. Update Service Calls

```typescript
// Old: Using privateAxios with old endpoints
const response = await privateAxios.get(
  API_CONFIG.ENTERPRISE_MANAGER.ENTERPRISES
);

// New: Using apiClient with new endpoints
const response = await apiClient.get(ENDPOINTS.ENTERPRISES.LIST);
```

## Endpoint Mapping

### Enterprise Manager
| Old Endpoint | New Endpoint |
|--------------|--------------|
| `/api/enterprise-manager/v1/enterprises` | `/api/v1/enterprises` |
| `/api/enterprise-manager/v1/enterprises/search` | `/api/v1/enterprises/search` |
| `/api/enterprise-manager/v1/organization/invite` | `/api/v1/enterprises/invite` |
| `/api/enterprise-manager/v1/trials` | `/api/v1/trials` |

### Project Manager
| Old Endpoint | New Endpoint |
|--------------|--------------|
| `/api/project-manager/v1/project` | `/api/v1/projects` |
| `/api/project-manager/v1/project/search` | `/api/v1/projects/search` |
| `/api/project-manager/v1/bookmarks` | `/api/v1/bookmarks` |

### User Manager
| Old Endpoint | New Endpoint |
|--------------|--------------|
| `/api/user-manager/v1/user` | `/api/v1/users` |
| `/api/user-manager/v1/users/search` | `/api/v1/users/search` |
| `/api/user-manager/v1/user/invite` | `/api/v1/users/invite` |

### MongoDB Database Manager (Now PostgreSQL)
| Old Endpoint | New Endpoint |
|--------------|--------------|
| `/api/mongo-database-manager/v1/patient-record` | `/api/v1/patient-records/{project_id}/{trial_slug}` |
| `/api/mongo-database-manager/v1/execution-record` | `/api/v1/executions/{project_id}/{trial_slug}` |

### Asset Manager
| Old Endpoint | New Endpoint |
|--------------|--------------|
| `/api/asset-manager/v1/enterprise-upload` | `/api/v1/assets/enterprise-upload` |

## Migration Examples

### Example 1: Enterprise Service Migration

**Before:**
```typescript
// services/admin/enterprises-service.ts
import { privateAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

export const enterpriseService = {
  searchEnterprises: async (keyword: string, page: number, size: number) => {
    const response = await privateAxios.get(
      API_CONFIG.ENTERPRISE_MANAGER.ENTERPRISES_SEARCH,
      { params: { keyword, page, size } }
    );
    return response.data;
  },
};
```

**After:**
```typescript
// services/admin/enterprises-service-v2.ts
import { apiClient } from "@/utils/api-client";
import { ENDPOINTS, buildPaginatedEndpoint } from "@/utils/api-endpoints";

export const enterpriseService = {
  searchEnterprises: async (keyword: string, page: number, size: number) => {
    const endpoint = buildPaginatedEndpoint(
      ENDPOINTS.ENTERPRISES.SEARCH,
      page,
      size,
      { keyword }
    );
    return apiClient.get(endpoint);
  },
};
```

### Example 2: Patient Records Migration (MongoDB → PostgreSQL)

**Before:**
```typescript
// Using MongoDB-style queries
const response = await privateAxios.get(
  `${API_CONFIG.MONGO_DATABASE_MANAGER.PATIENT_RECORD}/${projectId}`,
  { params: { trial_slug: trialSlug, page, size } }
);
```

**After:**
```typescript
// Using PostgreSQL JSONB storage
import { patientRecordsService } from "@/services/patient-records/patient-records-service";

const response = await patientRecordsService.getRecords(
  projectId,
  trialSlug,
  page,
  size
);
```

### Example 3: Dynamic Endpoint with Path Parameters

**Before:**
```typescript
const response = await privateAxios.get(
  `${API_CONFIG.ENTERPRISE_MANAGER.ENTERPRISES}/${enterpriseId}`
);
```

**After:**
```typescript
const response = await apiClient.get(
  ENDPOINTS.ENTERPRISES.BY_ID(enterpriseId)
);
```

## New API Client Features

### 1. Unified Client Class

```typescript
import { ApiClient } from "@/utils/api-client";

// Authenticated requests (default)
const authClient = new ApiClient(true);
await authClient.get("/enterprises");

// Public requests (no auth)
const publicClient = new ApiClient(false);
await publicClient.get("/health");
```

### 2. Pre-configured Instances

```typescript
import { apiClient, publicApiClient } from "@/utils/api-client";

// Authenticated
await apiClient.get("/users/me");

// Public
await publicApiClient.get("/health");
```

### 3. Server-Side Rendering

```typescript
import { createServerApi } from "@/utils/api-client";

export async function getServerSideProps({ req }) {
  const token = req.cookies.token;
  const serverApi = createServerApi(token);
  const data = await serverApi.get("/api/v1/users/me");
  return { props: { data } };
}
```

### 4. Endpoint Helpers

```typescript
import { buildPaginatedEndpoint, ENDPOINTS } from "@/utils/api-endpoints";

// Build paginated endpoint
const endpoint = buildPaginatedEndpoint(
  ENDPOINTS.ENTERPRISES.LIST,
  1,  // page
  10, // size
  { status: "ACTIVE" } // additional params
);
// Result: "/api/v1/enterprises?page=1&size=10&status=ACTIVE"
```

### 5. Legacy Endpoint Mapping

For gradual migration, use the legacy endpoint mapper:

```typescript
import { mapLegacyEndpoint } from "@/utils/api-endpoints";

// Maps old endpoint to new
const newEndpoint = mapLegacyEndpoint("/api/enterprise-manager/v1/enterprises");
// Result: "/api/v1/enterprises"
```

## Backward Compatibility

During the migration period, both old and new patterns will work:

### Option 1: Use New API Client with Old Axios Imports

```typescript
// The old axios file still works
import { privateAxios } from "@/utils/axios";

// But you can also use the new client
import api from "@/utils/api-client";

// Both work the same way
await privateAxios.get("/api/v1/enterprises");
await api.get("/api/v1/enterprises");
```

### Option 2: Gradual Service Migration

1. Create new service file with `-v2` suffix
2. Update components to use new service
3. Once verified, delete old service file

## Authentication Flow

The new API client maintains the same authentication flow:

1. **Token Storage**: Uses `privateApi.defaults.headers.common.Authorization`
2. **Token Refresh**: Automatic 401 handling with token refresh via `/api/auth/refresh-token`
3. **Sign Out**: Automatic sign out on refresh failure

### Setting Auth Token

```typescript
import { setAuthToken, clearAuthToken } from "@/utils/api-client";

// After login
setAuthToken(accessToken);

// After logout
clearAuthToken();
```

## Testing

### Mocking the API Client

```typescript
import { apiClient } from "@/utils/api-client";

jest.mock("@/utils/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// In test
(apiClient.get as jest.Mock).mockResolvedValue({ data: mockData });
```

## Checklist for Migration

- [ ] Update `.env` to use single `NEXT_PUBLIC_API_URL`
- [ ] Update service imports to use new API client
- [ ] Update endpoint references to use new patterns
- [ ] Test authentication flow
- [ ] Test token refresh
- [ ] Update error handling for new response format
- [ ] Remove deprecated environment variables
- [ ] Remove old axios instances (mlEvalAxios, patientEnrollmentAxios)

## Troubleshooting

### CORS Issues
Ensure the FastAPI backend has proper CORS configuration for your frontend URL.

### 401 Unauthorized
1. Check if token is being set correctly
2. Verify Auth0 audience matches backend configuration
3. Check token expiration

### 404 Not Found
1. Verify endpoint mapping is correct
2. Check if using correct API version prefix (`/api/v1`)
3. Ensure path parameters are properly encoded

## Support

For questions about the migration:
1. Check the `MIGRATION_CHANGELOG.md` in the backend
2. Review the FastAPI documentation at `/docs`
3. Check existing service implementations in `services/` directory
