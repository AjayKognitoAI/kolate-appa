import { useMediaQuery, Box, Drawer, useTheme } from "@mui/material";
import config from "@/context/config";
import { CustomizerContext } from "@/context/customizerContext";
import { useContext } from "react";
import React from "react";
import SidebarContent from "./SidebarContent";

const Sidebar = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.down("lg"));
  const {
    isCollapse,
    isSidebarHover,
    setIsSidebarHover,
    isMobileSidebar,
    setIsMobileSidebar,
  } = useContext(CustomizerContext);

  const MiniSidebarWidth = config.miniSidebarWidth;
  const SidebarWidth = config.sidebarWidth;
  const theme = useTheme();
  const toggleWidth =
    isCollapse == "mini-sidebar" && !isSidebarHover
      ? MiniSidebarWidth
      : SidebarWidth;

  const onHoverEnter = () => {
    if (isCollapse == "mini-sidebar") {
      setIsSidebarHover(true);
    }
  };

  const onHoverLeave = () => {
    setIsSidebarHover(false);
  };

  return (
    <>
      {!lgUp ? (
        <Box
          sx={{
            zIndex: 100,
            width: toggleWidth,
            flexShrink: 0,
            ...(isCollapse == "mini-sidebar" && {
              position: "absolute",
            }),
          }}
        >
          <Drawer
            anchor="left"
            open
            onMouseEnter={onHoverEnter}
            onMouseLeave={onHoverLeave}
            variant="permanent"
            PaperProps={{
              sx: {
                transition: theme.transitions.create("width", {
                  duration: theme.transitions.duration.shortest,
                }),
                width: toggleWidth,
              },
            }}
          >
            <SidebarContent showScrollbar={true} />
          </Drawer>
        </Box>
      ) : (
        <Drawer
          anchor="left"
          open={isMobileSidebar}
          onClose={() => setIsMobileSidebar(false)}
          variant="temporary"
          PaperProps={{
            sx: {
              width: SidebarWidth,
              border: "0 !important",
              boxShadow: (theme) => theme.shadows[8],
            },
          }}
        >
          <SidebarContent showScrollbar={false} />
        </Drawer>
      )}
    </>
  );
};

export default Sidebar;
