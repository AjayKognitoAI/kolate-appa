import NextAuth from "next-auth";
import Auth0Provider from "next-auth/providers/auth0";
import "next-auth/jwt";
import { jwtDecode } from "jwt-decode";

// Extend the built-in session type
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    expiresAt?: number; // Unix timestamp in seconds
    refreshToken?: string; // Store refresh token for manual refresh
    user?: {
      orgId?: string;
      firstName?: string;
      lastName?: string;
      updatedAt?: string;
      sub?: string;
      email?: string;
      roles?: string[];
      permissions?: string[];
      image?: string;
    };
    refresh?: boolean; // Custom field to trigger manual refresh
  }
}

// Extend the built-in token type
declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    orgId?: string;
    firstName?: string;
    lastName?: string;
    updatedAt?: string;
    sub?: string;
    roles?: string[];
    permissions?: string[];
    image?: string;
  }
}

interface Auth0Profile {
  org_id?: string;
  given_name?: string;
  family_name?: string;
  updated_at?: string;
  sub?: string;
  [key: string]: any; // Allow dynamic claim keys
  permissions?: string[];
  picture?: string;
}

// --- Modular Auth0 Token Refresh Helper ---
async function refreshAuth0Token(refreshToken: string) {
  const response = await fetch(`${process.env.AUTH0_ISSUER}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH0_CLIENT_ID!,
      client_secret: process.env.AUTH0_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const tokensOrError = await response.json();
  console.log(
    "[auth] Refresh response status:",
    response.status,
    tokensOrError
  );
  if (!response.ok) throw tokensOrError;
  return tokensOrError;
}

// --- Modular decode helper for Auth0 access token ---
function decodeAuth0AccessToken(
  accessToken: string,
  email: string,
  isRefreshing?: boolean
) {
  try {
    const decodedToken: any = jwtDecode(accessToken);
    const rolesClaimKey =
      process.env.NEXT_PUBLIC_AUTH_ROLES_CLAIM_KEY ||
      "https://kolate-dev.com/roles";
    const roles = decodedToken[rolesClaimKey] || [];

    const permissions = decodedToken.permissions || [];

    if (roles?.length === 0 && isRefreshing) {
      return { roles: ["org:member"], permissions };
    }

    return { roles, permissions };
  } catch (error) {
    console.error("Error decoding access token:", error);
    return { roles: undefined, permissions: undefined };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Auth0Provider({ 
      clientId: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
      issuer: process.env.AUTH0_ISSUER,
      authorization: {
        params: {
          prompt: "login", // Force login prompt every time
          audience: process.env.AUTH0_AUDIENCE,
          scope: "openid profile email offline_access",
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      // Initial sign in
      if (profile) {
        const auth0Profile = profile as Auth0Profile;
        token.firstName = auth0Profile.given_name || undefined;
        token.lastName = auth0Profile.family_name || undefined;
        token.updatedAt = auth0Profile.updated_at || undefined;
        token.sub = auth0Profile.sub || undefined;
        token.image = auth0Profile.picture || undefined;
        token.orgId = auth0Profile.org_id || undefined;
        token.email = auth0Profile.email || undefined;
      }

      if (account?.access_token) {
        token.accessToken = account.access_token;
        // Store refresh token if present
        if (account.refresh_token) {
          token.refreshToken = account.refresh_token;
          token.expiresAt = account.expires_at;
        }
        const { roles, permissions } = decodeAuth0AccessToken(
          account.access_token,
          token?.email ?? ""
        );
        if (roles) token.roles = roles;
          // if (roles) token.roles = ["org:member"];
        if (permissions) token.permissions = permissions;
      }

      // If token is still valid, return it
      if (
        token.accessToken &&
        (!token.expiresAt ||
          (typeof token.expiresAt === "number" &&
            Date.now() < token.expiresAt * 1000))
      ) {
        return token;
      }
      // If no refresh token and token is expired, throw
      if (!token.refreshToken || typeof token.refreshToken !== "string") {
        throw new TypeError("Missing refresh_token");
      }
      // Try to refresh Auth0 token
      try {
        const tokensOrError = await refreshAuth0Token(
          token.refreshToken as string
        );
        token.accessToken = tokensOrError.access_token;
        token.refreshToken = tokensOrError.refresh_token || token.refreshToken;
        const { roles, permissions } = decodeAuth0AccessToken(
          tokensOrError.access_token,
          token?.email ?? "",
          true
        );
        if (permissions) token.permissions = permissions;
        if (tokensOrError.expires_in) {
          token.expiresAt = Math.floor(
            Date.now() / 1000 + tokensOrError.expires_in
          );
        }
        return token;
      } catch (error) {
        console.error("Error refreshing Auth0 access_token", error);
        (token as any).error = "RefreshTokenError";
        return token;
      }
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.expiresAt = token.expiresAt;

      if (session.user) {
        session.user.orgId = token.orgId;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.updatedAt = token.updatedAt;
        session.user.sub = token.sub;
        session.user.image = token.image;

        // Add roles and permissions to the session
        session.user.roles = token.roles;
        session.user.permissions = token.permissions;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle redirect after successful authentication
      // if (url.startsWith(baseUrl)) {
      //   return `${baseUrl}/api/auth/redirect`;
      // }
      return baseUrl;
    },
  },
});
