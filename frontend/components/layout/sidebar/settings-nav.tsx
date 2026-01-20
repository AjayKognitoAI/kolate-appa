import React from "react";
import { usePathname } from "next/navigation";
import { uniqueId } from "lodash";
import { IconSettings } from "@tabler/icons-react";
import NavItem from "./NavItem";
import { useSession } from "next-auth/react";

interface SettingsNavProps {
  setIsMobileSidebar: (open: boolean) => void;
}

const SettingsNav: React.FC<SettingsNavProps> = ({ setIsMobileSidebar }) => {
  const session = useSession();
  const pathname = usePathname();
  const pathDirect = pathname;

  return (
    session.data?.user?.roles?.includes("org:admin") && (
      <NavItem
        item={{
          id: uniqueId(),
          title: "Settings",
          icon: IconSettings,
          href: "/org/settings",
        }}
        pathDirect={pathDirect}
        onClick={() => setIsMobileSidebar(false)}
      />
    )
  );
};

export default SettingsNav;
