# Phase 2.4: Integration Testing

## Objective
Test the complete frontend-backend integration to ensure everything works together correctly.

---

## Prompt

```
Using the test-engineer, test-automator, and typescript-pro agents, create comprehensive integration tests for the frontend-backend integration.

## Tasks

### 1. Setup Test Environment

```typescript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
  ],
};

// jest.setup.ts
import '@testing-library/jest-dom';
import { server } from './src/mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 2. Setup MSW (Mock Service Worker)

```typescript
// src/mocks/handlers.ts
import { rest } from 'msw';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const handlers = [
  // Enterprises
  rest.get(`${API_URL}/enterprises`, (req, res, ctx) => {
    const page = req.url.searchParams.get('page') || '1';
    const size = req.url.searchParams.get('size') || '10';

    return res(
      ctx.json({
        state: 'success',
        status: 200,
        message: 'OK',
        data: {
          items: [
            { id: 'ent_1', name: 'Enterprise 1', status: 'ACTIVE' },
            { id: 'ent_2', name: 'Enterprise 2', status: 'ACTIVE' },
          ],
          total: 2,
          page: parseInt(page),
          size: parseInt(size),
          pages: 1,
        },
      })
    );
  }),

  rest.get(`${API_URL}/enterprises/:id`, (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.json({
        state: 'success',
        status: 200,
        data: {
          id,
          name: 'Test Enterprise',
          organizationId: 'org_123',
          status: 'ACTIVE',
        },
      })
    );
  }),

  rest.post(`${API_URL}/enterprises`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        state: 'success',
        status: 201,
        data: {
          id: 'ent_new',
          ...(req.body as object),
        },
      })
    );
  }),

  // Projects
  rest.get(`${API_URL}/projects`, (req, res, ctx) => {
    return res(
      ctx.json({
        state: 'success',
        status: 200,
        data: {
          items: [
            { id: 'proj_1', name: 'Project 1', status: 'ACTIVE' },
          ],
          total: 1,
          page: 1,
          size: 10,
        },
      })
    );
  }),

  rest.get(`${API_URL}/projects/user/:userId`, (req, res, ctx) => {
    return res(
      ctx.json({
        state: 'success',
        status: 200,
        data: [
          { id: 'proj_1', name: 'User Project', status: 'ACTIVE' },
        ],
      })
    );
  }),

  // Users
  rest.get(`${API_URL}/users/me`, (req, res, ctx) => {
    return res(
      ctx.json({
        state: 'success',
        status: 200,
        data: {
          id: 'user_1',
          auth0Id: 'auth0|123',
          email: 'test@test.com',
          firstName: 'Test',
          lastName: 'User',
          status: 'ACTIVE',
        },
      })
    );
  }),

  // Auth
  rest.get(`${API_URL}/auth/organizations/:orgId/members`, (req, res, ctx) => {
    return res(
      ctx.json({
        state: 'success',
        status: 200,
        data: {
          items: [
            { userId: 'user_1', email: 'member@test.com' },
          ],
          total: 1,
        },
      })
    );
  }),

  // Error handlers
  rest.get(`${API_URL}/enterprises/error`, (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ message: 'Internal Server Error' }));
  }),

  rest.get(`${API_URL}/unauthorized`, (req, res, ctx) => {
    return res(ctx.status(401), ctx.json({ message: 'Unauthorized' }));
  }),
];

// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### 3. Integration Tests by Feature

#### Enterprise Management Integration Tests

```typescript
// src/__tests__/integration/enterprises.test.tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { EnterpriseList } from '@/components/admin/EnterpriseList';
import { EnterpriseForm } from '@/components/admin/EnterpriseForm';

const mockSession = {
  user: {
    id: 'user_1',
    email: 'test@test.com',
    orgId: 'org_123',
    permissions: ['enterprises:read', 'enterprises:write'],
    roles: ['admin'],
  },
  accessToken: 'test_token',
  expires: '2099-01-01',
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <SessionProvider session={mockSession}>
    <AuthProvider>{children}</AuthProvider>
  </SessionProvider>
);

describe('Enterprise Management Integration', () => {
  describe('EnterpriseList', () => {
    it('should fetch and display enterprises from the consolidated API', async () => {
      render(<EnterpriseList />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Enterprise 1')).toBeInTheDocument();
        expect(screen.getByText('Enterprise 2')).toBeInTheDocument();
      });
    });

    it('should handle pagination correctly', async () => {
      render(<EnterpriseList />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      // Override handler for this test
      server.use(
        rest.get(`${API_URL}/enterprises`, (req, res, ctx) => {
          return res(ctx.status(500));
        })
      );

      render(<EnterpriseList />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('EnterpriseForm', () => {
    it('should create a new enterprise via the consolidated API', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();

      render(<EnterpriseForm onSuccess={onSuccess} />, { wrapper: Wrapper });

      await user.type(screen.getByLabelText(/name/i), 'New Enterprise');
      await user.type(screen.getByLabelText(/admin email/i), 'admin@new.com');
      await user.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should display validation errors', async () => {
      const user = userEvent.setup();

      render(<EnterpriseForm />, { wrapper: Wrapper });

      await user.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });
  });
});
```

#### Project Management Integration Tests

```typescript
// src/__tests__/integration/projects.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectDashboard } from '@/components/projects/ProjectDashboard';
import { ProjectUsers } from '@/components/projects/ProjectUsers';

describe('Project Management Integration', () => {
  describe('ProjectDashboard', () => {
    it('should fetch user projects from consolidated API', async () => {
      render(<ProjectDashboard userId="user_1" />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('User Project')).toBeInTheDocument();
      });
    });

    it('should allow creating a new project', async () => {
      const user = userEvent.setup();

      render(<ProjectDashboard userId="user_1" />, { wrapper: Wrapper });

      await user.click(screen.getByRole('button', { name: /new project/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/project name/i), 'Test Project');
      await user.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('ProjectUsers', () => {
    it('should fetch project users from consolidated API', async () => {
      render(<ProjectUsers projectId="proj_1" />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('member@test.com')).toBeInTheDocument();
      });
    });
  });
});
```

#### Authentication Integration Tests

```typescript
// src/__tests__/integration/auth.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PermissionGate } from '@/components/auth/PermissionGate';

jest.mock('next-auth/react');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('Authentication Integration', () => {
  describe('ProtectedRoute', () => {
    it('should render children when authenticated', async () => {
      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        { wrapper: Wrapper }
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should redirect when not authenticated', async () => {
      const pushMock = jest.fn();
      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
        push: pushMock,
      });

      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith('/auth/login');
      });
    });
  });

  describe('PermissionGate', () => {
    it('should render children when user has permission', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      render(
        <PermissionGate permission="enterprises:read">
          <div>Has Permission</div>
        </PermissionGate>,
        { wrapper: Wrapper }
      );

      expect(screen.getByText('Has Permission')).toBeInTheDocument();
    });

    it('should render fallback when user lacks permission', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: {
          ...mockSession,
          user: { ...mockSession.user, permissions: [] },
        },
        status: 'authenticated',
      });

      render(
        <PermissionGate permission="enterprises:delete" fallback={<div>No Access</div>}>
          <div>Has Permission</div>
        </PermissionGate>,
        { wrapper: Wrapper }
      );

      expect(screen.getByText('No Access')).toBeInTheDocument();
      expect(screen.queryByText('Has Permission')).not.toBeInTheDocument();
    });
  });
});
```

### 4. End-to-End User Flow Tests

```typescript
// src/__tests__/integration/user-flows.test.tsx
describe('Complete User Flows', () => {
  describe('Enterprise Onboarding Flow', () => {
    it('should complete the full onboarding flow', async () => {
      const user = userEvent.setup();

      // Step 1: Create enterprise
      render(<OnboardingWizard />, { wrapper: Wrapper });

      await user.type(screen.getByLabelText(/enterprise name/i), 'New Company');
      await user.type(screen.getByLabelText(/admin email/i), 'admin@newcompany.com');
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 2: Configure datasource
      await waitFor(() => {
        expect(screen.getByText(/configure datasource/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/datasource name/i), 'Main DB');
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 3: Invite team members
      await waitFor(() => {
        expect(screen.getByText(/invite team/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/email/i), 'team@newcompany.com');
      await user.click(screen.getByRole('button', { name: /send invite/i }));

      // Step 4: Complete
      await user.click(screen.getByRole('button', { name: /complete/i }));

      await waitFor(() => {
        expect(screen.getByText(/onboarding complete/i)).toBeInTheDocument();
      });
    });
  });

  describe('Project Creation Flow', () => {
    it('should create project and add users', async () => {
      const user = userEvent.setup();

      render(<ProjectCreateFlow />, { wrapper: Wrapper });

      // Create project
      await user.type(screen.getByLabelText(/project name/i), 'New Project');
      await user.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(screen.getByText(/project created/i)).toBeInTheDocument();
      });

      // Add user
      await user.click(screen.getByRole('button', { name: /add user/i }));
      await user.type(screen.getByLabelText(/email/i), 'member@test.com');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText('member@test.com')).toBeInTheDocument();
      });
    });
  });
});
```

### 5. API Response Verification Tests

```typescript
// src/__tests__/integration/api-responses.test.ts
import { enterpriseApi, projectApi, userApi, authApi } from '@/services/api';

describe('API Response Format Verification', () => {
  it('should handle GlobalResponse wrapper for enterprises', async () => {
    const result = await enterpriseApi.getAll(1, 10);

    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(Array.isArray(result.items)).toBe(true);
  });

  it('should handle GlobalResponse wrapper for single enterprise', async () => {
    const result = await enterpriseApi.getById('ent_1');

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('status');
  });

  it('should handle camelCase property names', async () => {
    const result = await enterpriseApi.getById('ent_1');

    expect(result).toHaveProperty('organizationId');
    expect(result).not.toHaveProperty('organization_id');
  });
});
```

### 6. Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run integration tests only
npm test -- --testPathPattern=integration

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test -- src/__tests__/integration/enterprises.test.tsx
```

---

## Test Coverage Requirements

Ensure the following coverage:
- [ ] All API services have unit tests (>80% coverage)
- [ ] All components with API calls have integration tests
- [ ] Auth flow is fully tested
- [ ] Permission-based rendering is tested
- [ ] Error handling is tested
- [ ] Loading states are tested
- [ ] Pagination is tested

---

## Deliverables
1. MSW handlers for all API endpoints
2. Integration tests for all major features
3. Authentication flow tests
4. Permission-based component tests
5. End-to-end user flow tests
6. API response verification tests
7. >80% test coverage
```

---

## Next Step
After completing Phase 2, proceed to [Phase 3: UI/UX Modernization](../phase-3-ui-ux-modernization/01-ui-audit.md)
