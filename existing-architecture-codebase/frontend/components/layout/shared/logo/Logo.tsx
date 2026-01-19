"use client";
import { useContext } from "react";

import Link from "next/link";
import { styled } from "@mui/material";
import config from "@/context/config";
import Image from "next/image";
import { CustomizerContext } from "@/context/customizerContext";
import { useSession } from "next-auth/react";
import { urlWrapper } from "@/utils/url-wrapper";

const Logo = () => {
  const { isCollapse, isSidebarHover, activeDir, activeMode } =
    useContext(CustomizerContext);
  const TopbarHeight = config.topbarHeight;

  const LinkStyled = styled(Link)(() => ({
    height: TopbarHeight,
    width: isCollapse == "mini-sidebar" && !isSidebarHover ? "40px" : "180px",
    overflow: "hidden",
    display: "block",
  }));

  const session = useSession();
  const roles = session?.data?.user?.roles;

  return (
    <LinkStyled
      href={
        roles?.includes("root:admin")
          ? "/admin/dashboard"
          : roles?.includes("root:admin")
          ? "/org/dashboard"
          : "/dashboard"
      }
    >
      {activeMode === "dark" ? (
        <Image
          src={urlWrapper.images + "logo/kolate-logo.png"}
          alt="logo"
          height={TopbarHeight}
          width={140}
          priority
          style={{ objectFit: "contain" }}
        />
      ) : (
        <Image
          src={urlWrapper.images + "logo/kolate-logo.png"}
          alt="logo"
          height={TopbarHeight}
          width={140}
          priority
          style={{ objectFit: "contain" }}
        />
      )}
    </LinkStyled>
  );
};

export default Logo;
