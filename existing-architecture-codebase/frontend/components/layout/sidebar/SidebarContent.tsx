import { Box, Typography } from "@mui/material";
import Logo from "../shared/logo/Logo";
import Scrollbar from "@/components/custom-scroll/Scrollbar";
import SidebarItems from "./SidebarItems";
import SettingsNav from "./settings-nav";
import SidebarProfile from "./SidebarProfile";
import { useContext } from "react";
import { CustomizerContext } from "@/context/customizerContext";
import { useTheme } from "@mui/material";
import { useSession } from "next-auth/react";

const SidebarContent = ({
  showScrollbar = true,
}: {
  showScrollbar?: boolean;
}) => {
  const { isCollapse, isSidebarHover, setIsMobileSidebar } =
    useContext(CustomizerContext);
  const theme = useTheme();
  const { data: session } = useSession();

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Logo */}
      <Box
        px={2}
        pb={2}
        sx={{
          ...(isCollapse == "mini-sidebar" && {
            [theme.breakpoints.up("lg")]: {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
          }),
          ...(!isSidebarHover && {
            [theme.breakpoints.up("lg")]: {
              justifyContent: "start",
            },
          }),
        }}
      >
        <Logo />
      </Box>
      {/* Project Card Section */}

      {showScrollbar ? (
        <Scrollbar sx={{ flex: 1 }}>
          <SidebarItems />
        </Scrollbar>
      ) : (
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <SidebarItems />
        </Box>
      )}
      {isCollapse === "full-sidebar" ? (
        <Box sx={{ px: 2, pb: 3 }}>
          <SettingsNav setIsMobileSidebar={setIsMobileSidebar} />
          <SidebarProfile />
        </Box>
      ) : (
        ""
      )}
    </Box>
  );
};

export default SidebarContent;
