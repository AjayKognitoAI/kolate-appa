# Phase 2.3: Auth Flow Update

## Objective
Update the frontend authentication flow to work seamlessly with the consolidated backend's Auth0 integration.

---

## Prompt

```
Using the typescript-pro and security-auditor agents, update the frontend authentication flow for the consolidated backend.

## Source Location
`existing-architecture-codebase/frontend/`

## Tasks

### 1. Review Current NextAuth Configuration

Find and review the current NextAuth.js configuration (likely in `src/app/api/auth/[...nextauth]/route.ts` or `pages/api/auth/[...nextauth].ts`).

### 2. Update NextAuth Configuration

```typescript
// src/app/api/auth/[...nextauth]/route.ts (Next.js 13+)
// or src/pages/api/auth/[...nextauth].ts (Next.js 12)

import NextAuth, { NextAuthOptions } from 'next-auth';
import Auth0Provider from 'next-auth/providers/auth0';

export const authOptions: NextAuthOptions = {
  providers: [
    Auth0Provider({
      clientId: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
      issuer: process.env.AUTH0_ISSUER_BASE_URL,
      authorization: {
        params: {
          audience: process.env.AUTH0_AUDIENCE,
          scope: 'openid profile email offline_access',
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      // Initial sign in
      if (account && profile) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
          // Extract organization ID from Auth0 profile
          orgId: (profile as any).org_id || (profile as any)['https://your-namespace/org_id'],
          permissions: (profile as any).permissions || [],
          roles: (profile as any)['https://your-namespace/roles'] || [],
        };
      }

      // Return previous token if not expired
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Token expired, try to refresh
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken as string;
      session.user = {
        ...session.user,
        id: token.sub as string,
        orgId: token.orgId as string,
        permissions: token.permissions as string[],
        roles: token.roles as string[],
      };
      session.error = token.error as string | undefined;
      return session;
    },
  },

  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  debug: process.env.NODE_ENV === 'development',
};

async function refreshAccessToken(token: any) {
  try {
    const response = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.AUTH0_CLIENT_ID!,
        client_secret: process.env.AUTH0_CLIENT_SECRET!,
        refresh_token: token.refreshToken,
      }),
    });

    const tokens = await response.json();

    if (!response.ok) throw tokens;

    return {
      ...token,
      accessToken: tokens.access_token,
      accessTokenExpires: Date.now() + tokens.expires_in * 1000,
      refreshToken: tokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error('Error refreshing access token', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 3. Update Type Definitions

```typescript
// src/types/next-auth.d.ts
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    accessToken: string;
    error?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      orgId: string;
      permissions: string[];
      roles: string[];
    };
  }

  interface Profile {
    org_id?: string;
    permissions?: string[];
    'https://your-namespace/org_id'?: string;
    'https://your-namespace/roles'?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
    orgId: string;
    permissions: string[];
    roles: string[];
    error?: string;
  }
}
```

### 4. Create Auth Context & Hooks

```typescript
// src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    orgId: string;
    permissions: string[];
    roles: string[];
  } | null;
  accessToken: string | null;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const hasPermission = (permission: string): boolean => {
    return session?.user?.permissions?.includes(permission) ?? false;
  };

  const hasRole = (role: string): boolean => {
    return session?.user?.roles?.includes(role) ?? false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((p) => hasPermission(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((p) => hasPermission(p));
  };

  const value: AuthContextType = {
    isAuthenticated: !!session?.user,
    isLoading: status === 'loading',
    user: session?.user
      ? {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          orgId: session.user.orgId,
          permissions: session.user.permissions,
          roles: session.user.roles,
        }
      : null,
    accessToken: session?.accessToken ?? null,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 5. Create Permission-Based Components

```typescript
// src/components/auth/PermissionGate.tsx
'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionGateProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  role?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  role,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole } = useAuth();

  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  }

  if (role) {
    hasAccess = hasAccess && hasRole(role);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

```typescript
// src/components/auth/ProtectedRoute.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: string;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  permission,
  redirectTo = '/auth/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && permission && !hasPermission(permission)) {
      router.push('/unauthorized');
    }
  }, [isAuthenticated, isLoading, permission, hasPermission, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (permission && !hasPermission(permission)) {
    return null;
  }

  return <>{children}</>;
}
```

### 6. Update API Client with Session

```typescript
// src/lib/api-client.ts (updated)
import axios, { AxiosInstance } from 'axios';
import { getSession } from 'next-auth/react';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(async (config) => {
      const session = await getSession();

      if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      }

      if (session?.user?.orgId) {
        config.headers['org-id'] = session.user.orgId;
      }

      // Add user ID for audit purposes
      if (session?.user?.id) {
        config.headers['user-id'] = session.user.id;
      }

      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Session expired - trigger re-authentication
          const session = await getSession();
          if (session?.error === 'RefreshAccessTokenError') {
            // Redirect to login
            window.location.href = '/auth/login?error=session_expired';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ... rest of methods
}
```

### 7. Create Login/Logout Pages

```typescript
// src/app/auth/login/page.tsx
'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  useEffect(() => {
    // Auto-redirect to Auth0 if no error
    if (!error) {
      signIn('auth0', { callbackUrl });
    }
  }, [error, callbackUrl]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1>Authentication Error</h1>
        <p>{error === 'session_expired' ? 'Your session has expired' : error}</p>
        <button onClick={() => signIn('auth0', { callbackUrl })}>
          Sign In Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to login...</p>
    </div>
  );
}
```

```typescript
// src/app/auth/logout/page.tsx
'use client';

import { signOut } from 'next-auth/react';
import { useEffect } from 'react';

export default function LogoutPage() {
  useEffect(() => {
    signOut({
      callbackUrl: `${process.env.NEXT_PUBLIC_AUTH0_ISSUER_BASE_URL}/v2/logout?client_id=${process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}&returnTo=${encodeURIComponent(window.location.origin)}`,
    });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Signing out...</p>
    </div>
  );
}
```

### 8. Update Layout with Auth Provider

```typescript
// src/app/layout.tsx
import { AuthProvider } from '@/contexts/AuthContext';
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

### 9. Security Audit Checklist

Using the security-auditor agent, verify:

- [ ] Access tokens are never stored in localStorage
- [ ] Refresh token rotation is implemented
- [ ] CSRF protection is enabled
- [ ] Secure cookie settings in production
- [ ] Token expiration is properly handled
- [ ] Permission checks happen on both frontend and backend
- [ ] Sensitive data is not exposed in client-side state
- [ ] Auth errors are handled gracefully without exposing details

### 10. Generate Auth Tests

```typescript
// src/contexts/__tests__/AuthContext.test.tsx
import { renderHook } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { AuthProvider, useAuth } from '../AuthContext';

jest.mock('next-auth/react');

describe('useAuth', () => {
  it('should return authenticated state when session exists', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          id: 'user_1',
          email: 'test@test.com',
          orgId: 'org_1',
          permissions: ['projects:read', 'projects:write'],
          roles: ['admin'],
        },
        accessToken: 'token',
      },
      status: 'authenticated',
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.orgId).toBe('org_1');
  });

  it('should check permissions correctly', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          permissions: ['projects:read', 'projects:write'],
        },
      },
      status: 'authenticated',
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.hasPermission('projects:read')).toBe(true);
    expect(result.current.hasPermission('projects:delete')).toBe(false);
  });
});
```

---

## Deliverables
1. Updated NextAuth configuration with token refresh
2. TypeScript type definitions for session
3. Auth context with permission helpers
4. Permission-based components (PermissionGate, ProtectedRoute)
5. Updated API client with session integration
6. Login/logout pages
7. Security audit completed
8. Unit tests for auth components
```

---

## Next Step
After completing this prompt, proceed to [04-integration-testing.md](04-integration-testing.md)
