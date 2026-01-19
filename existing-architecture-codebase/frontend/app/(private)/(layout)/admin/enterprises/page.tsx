"use client";

import { Box } from "@mui/material";
import PageContainer from "@/components/container/PageContainer";
import EnterpriseTable from "@/components/admin/enterprise/enterprise-table";

export default function EnterprisesPage() {
  return (
    <PageContainer title="Enterprises" description="Enterprises">
      <Box sx={{ mt: 2, px: 3 }}>
        <EnterpriseTable isEnterprisePage />
      </Box>
    </PageContainer>
  );
}
