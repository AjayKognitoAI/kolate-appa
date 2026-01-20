/**
 * Modern Breadcrumbs Component
 *
 * Auto-generates breadcrumbs from pathname or accepts custom items.
 */

"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumbs as MuiBreadcrumbs,
  Link,
  Typography,
  Box,
} from "@mui/material";
import { IconHome, IconChevronRight } from "@tabler/icons-react";
import NextLink from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  showHome?: boolean;
  maxItems?: number;
}

const formatLabel = (segment: string): string => {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  showHome = true,
  maxItems = 4,
}) => {
  const pathname = usePathname();

  const breadcrumbs = React.useMemo(() => {
    if (items) return items;

    const segments = pathname.split("/").filter(Boolean);
    return segments.map((segment, index) => ({
      label: formatLabel(segment),
      href: index < segments.length - 1 ? `/${segments.slice(0, index + 1).join("/")}` : undefined,
    }));
  }, [pathname, items]);

  if (breadcrumbs.length === 0) return null;

  return (
    <MuiBreadcrumbs
      aria-label="Breadcrumb navigation"
      separator={<IconChevronRight size={16} />}
      maxItems={maxItems}
      sx={{ mb: 2 }}
    >
      {showHome && (
        <Link
          component={NextLink}
          href="/"
          color="inherit"
          sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          aria-label="Home"
        >
          <IconHome size={18} />
        </Link>
      )}
      {breadcrumbs.map((item, index) =>
        item.href ? (
          <Link
            key={index}
            component={NextLink}
            href={item.href}
            color="inherit"
            underline="hover"
          >
            {item.label}
          </Link>
        ) : (
          <Typography key={index} color="text.primary" fontWeight={500}>
            {item.label}
          </Typography>
        )
      )}
    </MuiBreadcrumbs>
  );
};

export default Breadcrumbs;
