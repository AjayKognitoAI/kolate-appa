import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const publicRoutes = [
  "/public",
  "/sso-configuration",
  "/unauthorized",
  "/error",
];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const roles = req.auth?.user?.roles || [];
  const isAdmin = Array.isArray(roles) ? roles.includes("root:admin") : false;
  const isOrgAdmin = Array.isArray(roles) ? roles.includes("org:admin") : false;
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const isOrgAdminRoute = req.nextUrl.pathname.startsWith("/org");
  const isPublicRoute = publicRoutes.some(
    (route) => req.nextUrl.pathname === route
  );
  const isUser = Array.isArray(roles) && roles.includes("org:member");

  // Allow auth API routes
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  if (!isLoggedIn && req.nextUrl.pathname === "/") {
    return NextResponse.next();
  }

  if (
    isLoggedIn &&
    !roles?.length &&
    req.nextUrl.pathname !== "/setup" &&
    !isPublicRoute
  ) {
    // Redirect authenticated users without roles to the dashboard

    return NextResponse.redirect(new URL("/setup", req.nextUrl));
  }

  if (
    isLoggedIn &&
    roles?.length > 0 &&
    (req.nextUrl.pathname === "/" || req.nextUrl.pathname === "/setup")
  ) {
    // Redirect authenticated users to the dashboard
    return NextResponse.redirect(new URL("/api/auth/redirect", req.nextUrl));
  }

  if (
    !isLoggedIn &&
    !isApiAuthRoute &&
    !isPublicRoute &&
    req.nextUrl.pathname !== "/"
  ) {
    // Redirect unauthenticated users to root page
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  // Restrict admin routes to users with root:admin role
  if (isLoggedIn && isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
  }

  // Restrict org admin routes to users with org:admin role
  if (isLoggedIn && isOrgAdminRoute && !isOrgAdmin) {
    return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
  }

  // Restrict admin users to only /admin routes
  if (isLoggedIn && isAdmin && !isAdminRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.nextUrl));
  }

  // Restrict org admin users to only /org routes
  if (isLoggedIn && isOrgAdmin && !isOrgAdminRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL("/org/dashboard", req.nextUrl));
  }

  // If roles array is empty, treat as a regular user (not admin or org admin)
  if (isLoggedIn && isUser) {
    // Prevent user from accessing /admin or /org routes
    if (isAdminRoute || isOrgAdminRoute) {
      return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
    }
    // Allow access to all non-admin, non-org routes (default behavior)
    return NextResponse.next();
  }

  return NextResponse.next();
});

// Configure which routes to run middleware on
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|images|favicon.ico|kolate-ico.svg).*)",
  ],
};
