"use server";
import { JWT, encode } from "next-auth/jwt";
import { cookies } from "next/headers";

const SESSION_SECURE = process.env.NEXTAUTH_URL!.startsWith("https://");
const sessionCookie = SESSION_SECURE
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";

export const updateSessionToken = async (token: JWT) => {
  const sessionToken = await encode({
    token: token,
    secret: process.env.NEXTAUTH_SECRET!,
    salt: sessionCookie,
    maxAge: 60 * 60 * 24 * 30,
  });

  (await cookies()).set(sessionCookie, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });
};

export const setForceLoginCookie = async (value: number) => {
  (await cookies()).set("login", value.toString(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
};

export const getForceLoginCookie = async () => {
  // return cookies().get("login");
  return false;
};

export const deleteForceLoginCookie = async () => {
  (await cookies()).delete("login");
};
