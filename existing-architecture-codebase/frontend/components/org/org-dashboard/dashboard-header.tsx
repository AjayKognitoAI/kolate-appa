"use client";

import { FC, useState } from "react";
import { Button } from "@mui/material";
import { IconPlus } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import Header from "@/components/layout/header/Header";

interface DashboardHeaderProps {}

const OrgDashboardHeader: FC<DashboardHeaderProps> = () => {
  const { data: session } = useSession();

  return (
    <>
      <Header
        title={`Hi, ${session?.user?.firstName} ${session?.user?.lastName}!`}
        subtitle="Welcome back! Here's an overview of the platform."
      />
    </>
  );
};

export default OrgDashboardHeader;
