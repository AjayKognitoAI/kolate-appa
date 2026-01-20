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
import {
  IconUserPlus,
  IconChartBar,
  IconStack,
  IconUserCog,
} from "@tabler/icons-react";

const OrgAdminMenuItems: MenuitemsType[] = [
  {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconChartBar,
    href: "/org/dashboard",
  },
  {
    id: uniqueId(),
    title: "Members",
    icon: IconUserPlus,
    href: "/org/members",
  },
  {
    id: uniqueId(),
    title: "Projects",
    icon: IconStack,
    href: "/org/projects",
  },
  // {
  //   id: uniqueId(),
  //   title: "privileges",
  //   icon: IconUserCog,
  //   href: "/org/privileges",
  // },
];

export default OrgAdminMenuItems;
