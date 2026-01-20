import { handlers } from "@/auth";
import { encode, getToken, JWT } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const { POST } = handlers;

const SESSION_SECURE =
  process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
const COOKIE_NAME = SESSION_SECURE
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";
const MAX_AGE = 30 * 24 * 60 * 60;

export async function GET(req: NextRequest) {
  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET!,
    salt: COOKIE_NAME,
    secureCookie: SESSION_SECURE,
  })) as JWT;

  if (token?.expiresAt && token.expiresAt < Math.floor(Date.now() / 1000)) {
    try {
      const refreshedToken = await refreshAccessToken(token);
      return await handleRefreshedToken(req, refreshedToken);
    } catch (error) {
      console.error("Error refreshing access token:", error);
      return logoutUser();
    }
  }

  return handlers.GET(req);
}

async function handleRefreshedToken(req: NextRequest, token: JWT) {
  const encodedToken = await encodeToken(token);

  const updatedReq = new NextRequest(req.url, {
    headers: new Headers(req.headers),
  });
  updatedReq.cookies.set(COOKIE_NAME, encodedToken);

  const response = await handlers.GET(updatedReq);
  response.headers.set(
    "Set-Cookie",
    await createAuthCookieString(encodedToken)
  );

  return response;
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) {
    throw new Error("Missing refresh token");
  }

  const response = await fetch(`${process.env.AUTH0_ISSUER}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    cache: "no-cache",
    body: new URLSearchParams({
      client_id: process.env.AUTH0_CLIENT_ID!,
      client_secret: process.env.AUTH0_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    }),
  });

  const tokens = await response.json();

  if (!response.ok) {
    if (tokens.error === "invalid_grant") {
      // The refresh token has expired or is invalid
      throw new Error("Refresh token expired");
    }
    throw new Error(tokens.error_description || "Failed to refresh token");
  }

  return {
    ...token,
    accessToken: tokens.access_token,
    expiresAt: Math.floor(Date.now() / 1000 + tokens.expires_in),
    refreshToken: tokens.refresh_token ?? token.refreshToken,
  };
}

async function encodeToken(token: JWT): Promise<string> {
  return encode({
    token,
    secret: process.env.NEXTAUTH_SECRET!,
    salt: COOKIE_NAME,
    maxAge: MAX_AGE,
  });
}

async function createAuthCookieString(sessionToken: string): Promise<string> {
  const cookieAttributes = [
    `${COOKIE_NAME}=${sessionToken}`,
    `Max-Age=${MAX_AGE}`,
    `Path=/`,
    "HttpOnly",
    SESSION_SECURE ? "Secure" : "",
    "SameSite=Lax",
  ]
    .filter(Boolean)
    .join("; ");

  return cookieAttributes;
}

async function logoutUser(): Promise<NextResponse> {
  const cookieStore = cookies();
  (await cookieStore).delete(COOKIE_NAME);

  const response = NextResponse.json(
    { error: "Session expired. Please log in again." },
    { status: 401 }
  );

  response.headers.set(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; ${
      SESSION_SECURE ? "Secure; " : ""
    }SameSite=Lax`
  );

  return response;
}
