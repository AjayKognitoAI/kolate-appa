"use client";
import { CustomizerContext } from "@/context/customizerContext";
import { IconButton, useMediaQuery } from "@mui/material";
import { IconMenu2 } from "@tabler/icons-react";
import React, { useContext } from "react";

const HeaderMobileMenu = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up("lg"));
  const { isCollapse, setIsCollapse, isMobileSidebar, setIsMobileSidebar } =
    useContext(CustomizerContext);
  return (
    !lgUp && (
      <IconButton
        color="inherit"
        aria-label="menu"
        onClick={() => {
          if (lgUp) {
            isCollapse === "full-sidebar"
              ? setIsCollapse("mini-sidebar")
              : setIsCollapse("full-sidebar");
          } else {
            setIsMobileSidebar(!isMobileSidebar);
          }
        }}
        sx={{ mr: 2 }}
      >
        <IconMenu2 size="21" />
      </IconButton>
    )
  );
};

export default HeaderMobileMenu;
