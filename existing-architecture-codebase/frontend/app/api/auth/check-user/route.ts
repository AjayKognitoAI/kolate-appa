import { auth } from "@/auth";
import userService from "@/services/user/user-services";
import { set } from "lodash";
import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";

interface SessionWithRefreshToken extends Session {
  refreshToken?: string;
}

function getUserInfo(session: any) {
  const user = session?.user || {};
  return {
    auth0_id: user.sub || "",
    organization_id: user.orgId || "",
    first_name: user.firstName || "",
    last_name: user.lastName || "",
    avatar_url: user.image || "",
    email: user.email || "",
    mobile: "", // Not present in session
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userInfo = getUserInfo(session);
    let accessToken = session.accessToken || "";
    let userCreated = false;
    let foundUser = false;

    try {
      // setAuthorizationHeader(accessToken);
      const user = await userService.getUserByAuth0Id(userInfo.auth0_id);
      console.log("[check-user] user response:", {
        user,
      });
      foundUser = true;
    } catch {
      const post = await userService.createUser(userInfo);
      console.log("[check-user] post response:", {
        post,
      });
      userCreated = true;
    }

    if (true) {
      const refreshRes = await fetch(
        `${process.env.NEXTAUTH_URL}/api/auth/refresh-token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refreshToken: (session as SessionWithRefreshToken).refreshToken,
          }),
        }
      );
      console.log(
        "[check-user] Refresh token response status:",
        refreshRes.status
      );
      const refreshData = await refreshRes.json();
      console.log("[check-user] Refresh token response data:", refreshData);
      if (!refreshRes.ok) {
        return NextResponse.json(
          {
            error: "Failed to refresh token",
            refreshStatus: refreshRes.status,
            refreshData,
          },
          { status: 500 }
        );
      }
    }

    console.log("[check-user] Success response:", {
      user: userInfo,
      accessToken,
    });
    return NextResponse.json({ user: userInfo, accessToken });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
