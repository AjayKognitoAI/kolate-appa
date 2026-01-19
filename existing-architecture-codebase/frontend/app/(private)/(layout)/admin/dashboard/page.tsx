"use client";
import { Box } from "@mui/material";
import PageContainer from "@/components/container/PageContainer";
import DashboardHeader from "@/components/admin/admin-dashboard/dashboard-header";
import DashboardSubheader from "@/components/admin/admin-dashboard/dashboard-subheader";
import DashboardBody from "@/components/admin/admin-dashboard/dashboard-body";
import InviteModal from "@/components/admin/invite-modal";
import { useState } from "react";
import MemberTable from "@/components/org/member-table";
import EnterpriseSetupModal from "@/components/org/enterprise-setup-modal";

export default function DashboardPage() {
  const [openModal, setOpenModal] = useState(false);
  return (
    <PageContainer title="Dashboard" description="Admin Dashboard">
      <Box px={3}>
        <DashboardHeader onAddEnterprise={() => setOpenModal(true)} />
        <DashboardSubheader />
        <DashboardBody />
        <InviteModal open={openModal} onClose={() => setOpenModal(false)} />
      </Box>
    </PageContainer>
  );
}
