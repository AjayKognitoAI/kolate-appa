# Phase 2.2: Endpoint Mapping

## Objective
Update all frontend components and pages to use the new API endpoints from the consolidated backend.

---

## Prompt

```
Using the typescript-pro agent, update all frontend components to use the new API services.

## Source Location
`existing-architecture-codebase/frontend/src/`

## Tasks

### 1. Find All API Calls

Search for existing API calls that need updating:
- Look for `axios.get`, `axios.post`, `fetch()` calls
- Search for service imports from old API modules
- Find any hardcoded API URLs

Patterns to search:
- `/api/auth-manager/`
- `/api/enterprise-manager/`
- `/api/project-manager/`
- `/api/user-manager/`
- `/api/asset-manager/`

### 2. Endpoint Mapping Reference

Use this mapping to update all API calls:

| Old Endpoint | New Endpoint |
|-------------|--------------|
| `/api/auth-manager/v1/user/organizations/{org}/members` | `/api/v1/auth/organizations/{org}/members` |
| `/api/auth-manager/v1/user/organizations/{org}/invitations` | `/api/v1/auth/organizations/{org}/invitations` |
| `/api/auth-manager/v1/roles` | `/api/v1/auth/roles` |
| `/api/enterprise-manager/v1/enterprises` | `/api/v1/enterprises` |
| `/api/enterprise-manager/v1/enterprises/{id}` | `/api/v1/enterprises/{id}` |
| `/api/enterprise-manager/v1/enterprises/{org}/organization` | `/api/v1/enterprises/organization/{org}` |
| `/api/project-manager/v1/project` | `/api/v1/projects` |
| `/api/project-manager/v1/project/{id}` | `/api/v1/projects/{id}` |
| `/api/project-manager/v1/project/{id}/users` | `/api/v1/projects/{id}/users` |
| `/api/project-manager/v1/project/{id}/roles` | `/api/v1/projects/{id}/roles` |
| `/api/user-manager/v1/user` | `/api/v1/users/me` (for current user) |
| `/api/user-manager/v1/users` | `/api/v1/users` |
| `/api/user-manager/v1/users/{org}/organization` | `/api/v1/users/organization/{org}` |
| `/api/asset-manager/v1/enterprise-upload` | `/api/v1/assets/upload` |

### 3. Update Components by Feature Area

#### Enterprise Management Components
```typescript
// Before
import axios from 'axios';

const EnterpriseList = () => {
  const fetchEnterprises = async () => {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/enterprise-manager/v1/enterprises`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  };
};

// After
import { enterpriseApi } from '@/services/api';

const EnterpriseList = () => {
  const fetchEnterprises = async () => {
    return await enterpriseApi.getAll();
  };
};
```

#### Project Management Components
```typescript
// Before
const ProjectDashboard = () => {
  useEffect(() => {
    fetch(`/api/project-manager/v1/project/user/${userId}`)
      .then(res => res.json())
      .then(setProjects);
  }, [userId]);
};

// After
import { projectApi } from '@/services/api';

const ProjectDashboard = () => {
  useEffect(() => {
    projectApi.getUserProjects(userId).then(setProjects);
  }, [userId]);
};
```

#### User Management Components
```typescript
// Before
const UserManagement = () => {
  const inviteUser = async (email: string) => {
    await axios.post(
      `/api/user-manager/v1/user/invite`,
      { email, organizationId },
      { headers: authHeaders }
    );
  };
};

// After
import { userApi } from '@/services/api';

const UserManagement = () => {
  const inviteUser = async (email: string) => {
    await userApi.invite({ email, organizationId });
  };
};
```

### 4. Update Redux/State Management

If using Redux Toolkit with RTK Query or async thunks:

```typescript
// Before: src/store/slices/enterpriseSlice.ts
export const fetchEnterprises = createAsyncThunk(
  'enterprises/fetchAll',
  async (_, { getState }) => {
    const { token } = getState().auth;
    const response = await axios.get(
      `${API_URL}/api/enterprise-manager/v1/enterprises`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data;
  }
);

// After: src/store/slices/enterpriseSlice.ts
import { enterpriseApi } from '@/services/api';

export const fetchEnterprises = createAsyncThunk(
  'enterprises/fetchAll',
  async ({ page, size }: { page: number; size: number }) => {
    return await enterpriseApi.getAll(page, size);
  }
);
```

### 5. Update React Query Hooks (if used)

```typescript
// Before: src/hooks/useEnterprises.ts
export const useEnterprises = () => {
  return useQuery('enterprises', async () => {
    const { data } = await axios.get(`${API_URL}/api/enterprise-manager/v1/enterprises`);
    return data.data;
  });
};

// After: src/hooks/useEnterprises.ts
import { enterpriseApi } from '@/services/api';

export const useEnterprises = (page = 1, size = 10) => {
  return useQuery(
    ['enterprises', page, size],
    () => enterpriseApi.getAll(page, size),
    {
      keepPreviousData: true,
    }
  );
};

export const useEnterprise = (id: string) => {
  return useQuery(
    ['enterprise', id],
    () => enterpriseApi.getById(id),
    { enabled: !!id }
  );
};

export const useCreateEnterprise = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (data: EnterpriseCreate) => enterpriseApi.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('enterprises');
      },
    }
  );
};
```

### 6. Update Form Submissions

```typescript
// Before
const EnterpriseForm = () => {
  const onSubmit = async (data: FormData) => {
    try {
      await axios.post(
        `${API_URL}/api/enterprise-manager/v1/enterprises`,
        data,
        { headers: { Authorization: `Bearer ${token}`, 'org-id': orgId } }
      );
      toast.success('Enterprise created');
    } catch (error) {
      toast.error('Failed to create enterprise');
    }
  };
};

// After
import { enterpriseApi } from '@/services/api';

const EnterpriseForm = () => {
  const onSubmit = async (data: EnterpriseCreate) => {
    try {
      await enterpriseApi.create(data);
      toast.success('Enterprise created');
    } catch (error) {
      toast.error('Failed to create enterprise');
    }
  };
};
```

### 7. Update File Upload Components

```typescript
// Before
const FileUploader = () => {
  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    await axios.post(
      `${API_URL}/api/asset-manager/v1/enterprise-upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      }
    );
  };
};

// After
import { assetApi } from '@/services/api';

const FileUploader = () => {
  const handleUpload = async (file: File) => {
    await assetApi.upload(file, 'uploads/');
  };
};
```

### 8. Components to Update Checklist

Search and update these component directories:

```
src/
├── components/
│   ├── admin/
│   │   ├── EnterpriseList.tsx
│   │   ├── EnterpriseForm.tsx
│   │   ├── UserManagement.tsx
│   │   └── AdminDashboard.tsx
│   ├── projects/
│   │   ├── ProjectList.tsx
│   │   ├── ProjectForm.tsx
│   │   ├── ProjectUsers.tsx
│   │   └── ProjectRoles.tsx
│   ├── users/
│   │   ├── UserProfile.tsx
│   │   ├── UserInvite.tsx
│   │   └── UserList.tsx
│   └── shared/
│       └── FileUpload.tsx
├── pages/ (or app/ for Next.js 13+)
│   ├── admin/
│   ├── projects/
│   ├── users/
│   └── api/ (if using API routes as proxy)
├── hooks/
│   ├── useEnterprises.ts
│   ├── useProjects.ts
│   ├── useUsers.ts
│   └── useAuth.ts
└── store/
    ├── slices/
    │   ├── enterpriseSlice.ts
    │   ├── projectSlice.ts
    │   └── userSlice.ts
    └── api/ (RTK Query)
```

### 9. Generate Tests for Updated Components

Using the /generate-tests command:

```typescript
// src/components/admin/__tests__/EnterpriseList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { EnterpriseList } from '../EnterpriseList';
import { enterpriseApi } from '@/services/api';

jest.mock('@/services/api');

describe('EnterpriseList', () => {
  it('should display enterprises from API', async () => {
    const mockEnterprises = {
      items: [
        { id: '1', name: 'Enterprise 1' },
        { id: '2', name: 'Enterprise 2' },
      ],
      total: 2,
      page: 1,
      size: 10,
    };

    (enterpriseApi.getAll as jest.Mock).mockResolvedValue(mockEnterprises);

    render(<EnterpriseList />);

    await waitFor(() => {
      expect(screen.getByText('Enterprise 1')).toBeInTheDocument();
      expect(screen.getByText('Enterprise 2')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (enterpriseApi.getAll as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<EnterpriseList />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

---

## Validation Checklist

After updating, verify:
- [ ] All API calls use new service modules
- [ ] No hardcoded old API URLs remain
- [ ] Authentication headers are handled by API client
- [ ] org-id header is automatically included
- [ ] Error handling works correctly
- [ ] Loading states display properly
- [ ] Data displays correctly from new response format

## Commands to Find Remaining Old Endpoints

```bash
# Search for old API patterns
grep -r "api/auth-manager" src/
grep -r "api/enterprise-manager" src/
grep -r "api/project-manager" src/
grep -r "api/user-manager" src/
grep -r "api/asset-manager" src/
grep -r "localhost:9000" src/
```

---

## Deliverables
1. All components updated to use new API services
2. Redux/state management updated
3. React Query hooks updated (if applicable)
4. Form submissions updated
5. File upload components updated
6. Unit tests for updated components
7. No remaining references to old API endpoints
```

---

## Next Step
After completing this prompt, proceed to [03-auth-flow-update.md](03-auth-flow-update.md)
