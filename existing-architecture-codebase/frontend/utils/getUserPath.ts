type Role = string;

export function getUserPath(roles: Role[] | Role): string {
  const roleList = Array.isArray(roles) ? roles : [roles];

  // Example logic: customize as needed for your app
  if (roleList.includes("root:admin")) return "/admin/dashboard";
  if (roleList.includes("org:admin")) return "/org/dashboard";
  if (roleList.includes("org:member")) return "/dashboard";
  // Add more role/path mappings as needed

  // Default path if no role matches
  return "/dashboard";
}
