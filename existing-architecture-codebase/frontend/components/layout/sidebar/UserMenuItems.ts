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
  key?: string;
}
import { IconHome, IconBuilding } from "@tabler/icons-react";
import {
  IconChartBar,
  IconBulb,
  IconRobot,
  IconDatabase,
  IconBell,
  IconFolder,
  IconChartDots,
  IconUserCheck,
} from "@tabler/icons-react";

const UserMenuItems = (currentProject?: any): MenuitemsType[] => [
  {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconHome,
    href: "/dashboard",
  },
  {
    id: uniqueId(),
    title: "Patient Enrollment",
    icon: IconUserCheck,
    href: "/patient-enrollment",
  },
  {
    id: uniqueId(),
    title: "Compare",
    icon: IconChartBar,
    href: "/compare",
    disabled: false,
    key: "Compare",
  },

  {
    id: uniqueId(),
    title: "Predict",
    icon: IconBulb,
    href: "/predict",
    key: "Predict",
  },
  {
    id: uniqueId(),
    title: "Insights",
    icon: IconChartDots,
    href: "/insights",
    disabled: false,
    key: "Insights",
  },
  {
    id: uniqueId(),
    title: "Co-Pilot",
    icon: IconRobot,
    href: "/copilot",
    key: "Copilot",
  },
  {
    id: uniqueId(),
    title: "Data Management",
    icon: IconDatabase,
    href: "/data-management",
    disabled: true,
    key: "DataManagement",
  },
  {
    id: uniqueId(),
    title: "Notifications",
    icon: IconBell,
    href: "/notifications",
  },
  {
    id: uniqueId(),
    title: "Manage Project",
    icon: IconFolder,
    href: "/manage-project",
    show:
      currentProject?.role === "MANAGER" || currentProject?.role === "ADMIN",
  },
];

export default UserMenuItems;
