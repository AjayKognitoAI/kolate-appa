import React from "react";
import {
  Grid,
  Typography,
  Box,
  Breadcrumbs,
  Theme,
  Avatar,
} from "@mui/material";
import NextLink from "next/link";

import { IconCircle } from "@tabler/icons-react";
import { ArrowRight, ChevronRight } from "@mui/icons-material";

interface BreadCrumbType {
  items?: any[];
}

const Breadcrumb = ({ items }: BreadCrumbType) => (
  <Breadcrumbs
    separator={<ChevronRight color="disabled" sx={{ fontSize: "18px" }} />}
    sx={{ alignItems: "center" }}
    aria-label="breadcrumb"
  >
    {items
      ? items.map((item) => (
          <div key={item.title}>
            {item.to ? (
              <NextLink href={item.to} passHref>
                <Typography variant="button" color="textPrimary">
                  {item.title}
                </Typography>
              </NextLink>
            ) : (
              <Typography variant="button" color="textSecondary">
                {item.title}
              </Typography>
            )}
          </div>
        ))
      : ""}
  </Breadcrumbs>
);

export default Breadcrumb;
