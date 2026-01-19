import { uniqueId } from "lodash";

interface MenuitemsType {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: string;
  children?: MenuitemsType[];
  chip?: string;
  chipColor?: string;
  variant?: string;
  external?: boolean;
}
import { IconHome, IconBuilding, IconDatabase, IconFlask } from "@tabler/icons-react";

const AdminMenuItems: MenuitemsType[] = [
  {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconHome,
    href: "/admin/dashboard",
  },
  {
    id: uniqueId(),
    title: "Enterprises",
    icon: IconBuilding,
    href: "/admin/enterprises",
  },
  {
    id: uniqueId(),
    title: "Data Pipeline",
    icon: IconDatabase,
    href: "/admin/data-pipeline",
  },
  {
    id: uniqueId(),
    title: "Studies",
    icon: IconFlask,
    href: "/admin/trials",
  },
];

export default AdminMenuItems;
