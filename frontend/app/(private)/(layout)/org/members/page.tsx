import { Box } from "@mui/material";
import PageContainer from "@/components/container/PageContainer";
import MemberTable from "@/components/org/member-table";
import MemberHeader from "@/components/org/member-header";

export default function SettingsPage() {
  return (
    <PageContainer title="Members" description="Enterprise Members">
      <Box px={3}>
        <MemberHeader />
        <MemberTable />
      </Box>
    </PageContainer>
  );
}
