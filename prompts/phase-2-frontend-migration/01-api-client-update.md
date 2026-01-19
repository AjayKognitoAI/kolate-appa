# Phase 2.1: API Client Update

## Objective
Update the frontend API client configuration to connect to the new consolidated FastAPI backend.

---

## Prompt

```
Using the typescript-pro agent, update the frontend API client to work with the new consolidated backend.

## Source Location
`existing-architecture-codebase/frontend/`

## Tasks

### 1. Update Base API Configuration

Find and update the Axios configuration (likely in `src/lib/axios.ts` or `src/services/api.ts`):

```typescript
// Before: Multiple base URLs for different microservices
const AUTH_API = "http://localhost:9000/api/auth-manager/v1";
const ENTERPRISE_API = "http://localhost:9000/api/enterprise-manager/v1";
const PROJECT_API = "http://localhost:9000/api/project-manager/v1";
const USER_API = "http://localhost:9000/api/user-manager/v1";

// After: Single consolidated backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
```

### 2. Create Unified API Client

```typescript
// src/lib/api-client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { getSession } from 'next-auth/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token and org-id
    this.client.interceptors.request.use(
      async (config) => {
        const session = await getSession();

        if (session?.accessToken) {
          config.headers.Authorization = `Bearer ${session.accessToken}`;
        }

        // Add organization ID header
        if (session?.user?.orgId) {
          config.headers['org-id'] = session.user.orgId;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle token refresh or redirect to login
          window.location.href = '/auth/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic request methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<{ data: T }>(url, config);
    return response.data.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<{ data: T }>(url, data, config);
    return response.data.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<{ data: T }>(url, data, config);
    return response.data.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<{ data: T }>(url, data, config);
    return response.data.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<{ data: T }>(url, config);
    return response.data.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
```

### 3. Update Environment Variables

Update `.env.local` and `.env.example`:

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Auth0 (keep existing)
AUTH0_SECRET=...
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
AUTH0_AUDIENCE=https://your-api.example.com
```

### 4. Create API Service Modules

Organize API calls by domain:

```typescript
// src/services/api/index.ts
export * from './enterprises';
export * from './projects';
export * from './users';
export * from './auth';
export * from './assets';
```

```typescript
// src/services/api/enterprises.ts
import apiClient from '@/lib/api-client';
import { Enterprise, EnterpriseCreate, EnterpriseUpdate, PaginatedResponse } from '@/types';

export const enterpriseApi = {
  // Get all enterprises (paginated)
  getAll: (page = 1, size = 10) =>
    apiClient.get<PaginatedResponse<Enterprise>>(`/enterprises?page=${page}&size=${size}`),

  // Get by ID
  getById: (id: string) =>
    apiClient.get<Enterprise>(`/enterprises/${id}`),

  // Get by organization ID
  getByOrganization: (orgId: string) =>
    apiClient.get<Enterprise>(`/enterprises/organization/${orgId}`),

  // Create
  create: (data: EnterpriseCreate) =>
    apiClient.post<Enterprise>('/enterprises', data),

  // Update
  update: (id: string, data: EnterpriseUpdate) =>
    apiClient.put<Enterprise>(`/enterprises/${id}`, data),

  // Delete
  delete: (id: string) =>
    apiClient.delete<void>(`/enterprises/${id}`),

  // Search
  search: (query: string, filters?: object) =>
    apiClient.get<PaginatedResponse<Enterprise>>('/enterprises/search', { params: { query, ...filters } }),

  // Get statistics
  getStats: () =>
    apiClient.get<EnterpriseStats>('/enterprises/stats'),

  // Onboarding
  getOnboarding: (enterpriseId: string) =>
    apiClient.get<OnboardingProgress>(`/enterprises/${enterpriseId}/onboarding`),

  updateOnboarding: (enterpriseId: string, data: OnboardingUpdate) =>
    apiClient.put<OnboardingProgress>(`/enterprises/${enterpriseId}/onboarding`, data),
};
```

```typescript
// src/services/api/projects.ts
import apiClient from '@/lib/api-client';
import { Project, ProjectCreate, ProjectUpdate, PaginatedResponse, Role, User } from '@/types';

export const projectApi = {
  // CRUD
  getAll: (page = 1, size = 10) =>
    apiClient.get<PaginatedResponse<Project>>(`/projects?page=${page}&size=${size}`),

  getById: (id: string) =>
    apiClient.get<Project>(`/projects/${id}`),

  create: (data: ProjectCreate) =>
    apiClient.post<Project>('/projects', data),

  update: (id: string, data: ProjectUpdate) =>
    apiClient.put<Project>(`/projects/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<void>(`/projects/${id}`),

  // User projects
  getUserProjects: (userId: string) =>
    apiClient.get<Project[]>(`/projects/user/${userId}`),

  getUserProjectsWithRoles: (userId: string) =>
    apiClient.get<ProjectWithRole[]>(`/projects/user/${userId}/roles-permissions`),

  // Project users
  getProjectUsers: (projectId: string) =>
    apiClient.get<User[]>(`/projects/${projectId}/users`),

  addUser: (projectId: string, userId: string, roleId: string) =>
    apiClient.post<ProjectUser>(`/projects/${projectId}/users`, { userId, roleId }),

  removeUser: (projectId: string, userId: string) =>
    apiClient.delete<void>(`/projects/${projectId}/users/${userId}`),

  // Roles
  getProjectRoles: (projectId: string) =>
    apiClient.get<Role[]>(`/projects/${projectId}/roles`),

  createRole: (projectId: string, data: RoleCreate) =>
    apiClient.post<Role>(`/projects/${projectId}/roles`, data),

  updateUserRole: (projectId: string, userId: string, roleId: string) =>
    apiClient.put<ProjectUser>(`/projects/${projectId}/users/${userId}/role`, { roleId }),
};
```

```typescript
// src/services/api/users.ts
import apiClient from '@/lib/api-client';
import { User, UserCreate, PaginatedResponse } from '@/types';

export const userApi = {
  // Current user
  getMe: () =>
    apiClient.get<User>('/users/me'),

  // CRUD
  getAll: (page = 1, size = 10) =>
    apiClient.get<PaginatedResponse<User>>(`/users?page=${page}&size=${size}`),

  getById: (id: string) =>
    apiClient.get<User>(`/users/${id}`),

  create: (data: UserCreate) =>
    apiClient.post<User>('/users', data),

  // Invite
  invite: (data: InviteUserRequest) =>
    apiClient.post<User>('/users/invite', data),

  // Organization users
  getOrganizationUsers: (orgId: string, page = 1, size = 10) =>
    apiClient.get<PaginatedResponse<User>>(`/users/organization/${orgId}?page=${page}&size=${size}`),

  // Status
  blockUser: (authId: string) =>
    apiClient.patch<User>(`/users/${authId}/status`, { status: 'BLOCKED' }),

  unblockUser: (authId: string) =>
    apiClient.patch<User>(`/users/${authId}/status`, { status: 'ACTIVE' }),

  // Search
  search: (query: string) =>
    apiClient.get<User[]>('/users/search', { params: { query } }),

  // Roles
  getDefaultRoles: () =>
    apiClient.get<DefaultRole[]>('/users/roles'),

  changeRole: (userId: string, roleId: string) =>
    apiClient.put<User>('/users/roles', { userId, roleId }),
};
```

```typescript
// src/services/api/auth.ts
import apiClient from '@/lib/api-client';

export const authApi = {
  // Organization members
  getOrganizationMembers: (orgId: string, page = 1, size = 10) =>
    apiClient.get<PaginatedResponse<Member>>(`/auth/organizations/${orgId}/members?page=${page}&size=${size}`),

  getMembersWithRoles: (orgId: string) =>
    apiClient.get<MemberWithRoles[]>(`/auth/organizations/${orgId}/members/with-roles`),

  // Invitations
  sendInvitation: (orgId: string, data: InvitationRequest) =>
    apiClient.post<Invitation>(`/auth/organizations/${orgId}/invitations`, data),

  getInvitations: (orgId: string) =>
    apiClient.get<Invitation[]>(`/auth/organizations/${orgId}/invitations`),

  deleteInvitation: (orgId: string, invitationId: string) =>
    apiClient.delete<void>(`/auth/organizations/${orgId}/invitations/${invitationId}`),

  // Roles
  getAllRoles: () =>
    apiClient.get<Role[]>('/auth/roles'),

  assignRoles: (userId: string, roleIds: string[]) =>
    apiClient.post<void>('/auth/roles', { userId, roleIds }),

  removeRoles: (userId: string, roleIds: string[]) =>
    apiClient.delete<void>('/auth/roles', { data: { userId, roleIds } }),
};
```

```typescript
// src/services/api/assets.ts
import apiClient from '@/lib/api-client';

export const assetApi = {
  upload: async (file: File, path: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    return apiClient.post<UploadResult>('/assets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (assetId: string) =>
    apiClient.delete<void>(`/assets/${assetId}`),

  getUrl: (assetId: string) =>
    apiClient.get<string>(`/assets/${assetId}`),
};
```

### 5. Update Type Definitions

Create/update types to match new API responses:

```typescript
// src/types/api.ts
export interface GlobalResponse<T> {
  state: string;
  status: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Enterprise {
  id: string;
  organizationId: string;
  name: string;
  url?: string;
  domain?: string;
  description?: string;
  logoUrl?: string;
  adminEmail: string;
  zipCode?: string;
  region?: string;
  size?: string;
  contactNumber?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  auth0Id: string;
  organizationId: string;
  firstName?: string;
  lastName?: string;
  email: string;
  mobile?: string;
  avatarUrl?: string;
  jobTitle?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  createdAt: string;
  updatedAt: string;
}

// ... more types
```

### 6. Generate Unit Tests

Using the test-automator agent and /generate-tests command, create tests for the API services:

```typescript
// src/services/api/__tests__/enterprises.test.ts
import { enterpriseApi } from '../enterprises';
import apiClient from '@/lib/api-client';

jest.mock('@/lib/api-client');

describe('enterpriseApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch paginated enterprises', async () => {
      const mockResponse = {
        items: [{ id: '1', name: 'Test' }],
        total: 1,
        page: 1,
        size: 10,
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await enterpriseApi.getAll(1, 10);

      expect(apiClient.get).toHaveBeenCalledWith('/enterprises?page=1&size=10');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('create', () => {
    it('should create an enterprise', async () => {
      const mockEnterprise = { id: '1', name: 'New Enterprise' };
      (apiClient.post as jest.Mock).mockResolvedValue(mockEnterprise);

      const result = await enterpriseApi.create({
        organizationId: 'org_1',
        name: 'New Enterprise',
        adminEmail: 'admin@test.com',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/enterprises', expect.any(Object));
      expect(result).toEqual(mockEnterprise);
    });
  });
});
```

---

## Deliverables
1. Updated API client configuration pointing to consolidated backend
2. Unified ApiClient class with interceptors
3. API service modules for each domain (enterprises, projects, users, auth, assets)
4. Updated TypeScript type definitions
5. Unit tests for API services
6. Updated environment variables

Ensure the API client handles the GlobalResponse wrapper correctly.
```

---

## Next Step
After completing this prompt, proceed to [02-endpoint-mapping.md](02-endpoint-mapping.md)
