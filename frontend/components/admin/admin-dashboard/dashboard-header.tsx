"use client";

import { FC, useState } from "react";
import { Button } from "@mui/material";
import { IconPlus } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import Header from "@/components/layout/header/Header";
import InviteModal from "../invite-modal";

interface DashboardHeaderProps {
  onAddEnterprise?: () => void;
}

const DashboardHeader: FC<DashboardHeaderProps> = ({ onAddEnterprise }) => {
  const { data: session } = useSession();

  return (
    <>
      <Header
        title={`Hi, ${session?.user?.firstName} ${session?.user?.lastName}!`}
        subtitle="Welcome back! Here's an overview of the platform."
        rightContent={
          <Button
            variant="contained"
            startIcon={<IconPlus size={18} />}
            onClick={onAddEnterprise}
          >
            Add Enterprise
          </Button>
        }
      />
    </>
  );
};

export default DashboardHeader;
