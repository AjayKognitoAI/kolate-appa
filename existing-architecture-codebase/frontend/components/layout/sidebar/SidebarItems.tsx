import AdminMenuitems from "./AdminMenuItems";
import OrgAdminMenuitems from "./OrgAdminMenuItems";
import { usePathname } from "next/navigation";
import { Box, List, useMediaQuery } from "@mui/material";
import NavItem from "./NavItem";
import NavCollapse from "./NavCollapse";
import NavGroup from "./NavGroup/NavGroup";
import { useContext, useMemo } from "react";
import { CustomizerContext } from "@/context/customizerContext";
import { useSession } from "next-auth/react";
import UserMenuItems from "./UserMenuItems";
import { getModuleList } from "@/store/slices/moduleAccessSlice";
import { getCurrentProject } from "@/store/slices/projectsSlice";
import { ProjectPermissions } from "@/services/project/project-service";
import { useAppSelector } from "@/store";

const SidebarItems = () => {
  const pathname = usePathname();
  const pathDirect = pathname;
  const session = useSession();
  const roles = session?.data?.user?.roles;
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf("/"));
  const { isSidebarHover, isCollapse, isMobileSidebar, setIsMobileSidebar } =
    useContext(CustomizerContext);

  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up("lg"));
  const hideMenu: any = lgUp
    ? isCollapse == "mini-sidebar" && !isSidebarHover
    : "";

  const currentProject = useAppSelector(getCurrentProject);
  const modules = useAppSelector(getModuleList);

  const items = useMemo(() => {
    const email = session?.data?.user?.email;
    // Show root admin menu when the user explicitly has the root:admin role
    // or when the signed-in email is the known kolate admin (fallback).
    if (roles?.includes("root:admin") || email === "admin-dev@kolate.ai") {
      return AdminMenuitems;
    } else if (roles?.includes("org:admin")) {
      return OrgAdminMenuitems;
    } else {
      return UserMenuItems(currentProject);
    }
  }, [roles, session, currentProject]);

  type PermissionKey = keyof ProjectPermissions;

  const hasModuleAccess = (module: string) => {
    const key = module.toUpperCase() as PermissionKey;
    return (
      modules?.some((mod) => mod.name === module) &&
      currentProject?.permissions &&
      currentProject?.permissions[key] !== "HIDDEN"
    );
  };

  return (
    <Box sx={{ px: 2 }}>
      <List sx={{ pt: 0 }} className="sidebarNav">
        {items?.map((item) => {
          // {/********SubHeader**********/}

          if (item?.key && !hasModuleAccess(item.key)) {
            return null;
          }
          if (item?.show === false) return null;
          if (item.subheader) {
            return (
              <NavGroup item={item} hideMenu={hideMenu} key={item.subheader} />
            );

            // {/********If Sub Menu**********/}
            /* eslint no-else-return: "off" */
          } else if (item.children) {
            return (
              <NavCollapse
                menu={item}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                pathWithoutLastPart={pathWithoutLastPart}
                level={1}
                key={item.id}
                onClick={() => setIsMobileSidebar(!isMobileSidebar)}
              />
            );

            // {/********If Sub No Menu**********/}
          } else {
            return (
              <NavItem
                item={item}
                key={item.id}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                onClick={() => setIsMobileSidebar(!isMobileSidebar)}
              />
            );
          }
        })}
      </List>
    </Box>
  );
};
export default SidebarItems;
