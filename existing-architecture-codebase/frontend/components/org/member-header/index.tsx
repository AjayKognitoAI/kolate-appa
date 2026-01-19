"use client";

import { FC, useState } from "react";
import { Button } from "@mui/material";
import { IconPlus } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import Header from "@/components/layout/header/Header";
import MemberInviteModal from "../member-invite-modal";

interface HeaderProps {}

const MemberHeader: FC<HeaderProps> = () => {
  const { data: session } = useSession();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  return (
    <>
      <Header
        title={`Hi, ${session?.user?.firstName} ${session?.user?.lastName}!`}
        subtitle="Welcome back! Here's an overview of the platform."
        rightContent={
          <Button
            variant="contained"
            startIcon={<IconPlus size={18} />}
            onClick={() => setInviteModalOpen(true)}
          >
            Add Members
          </Button>
        }
      />
      {inviteModalOpen && (
        <MemberInviteModal
          open={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
        />
      )}
    </>
  );
};

export default MemberHeader;
