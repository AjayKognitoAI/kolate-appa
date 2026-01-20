import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (session) {
    const roles = session?.user?.roles || [];
    // Check if user has root:admin role
    if (Array.isArray(roles) && roles.includes("root:admin")) {
      return NextResponse.redirect(
        new URL("/admin/dashboard", process.env.NEXTAUTH_URL)
      );
    }

    // Check if user has org:admin role
    if (Array.isArray(roles) && roles.includes("org:admin")) {
      return NextResponse.redirect(
        new URL("/org/dashboard", process.env.NEXTAUTH_URL)
      );
    }

    // Default redirect for authenticated users without specific roles
    return NextResponse.redirect(
      new URL("/dashboard", process.env.NEXTAUTH_URL)
    );
  }

  // Redirect unauthenticated users to home page
  return NextResponse.redirect(new URL("/", process.env.NEXTAUTH_URL));
}
