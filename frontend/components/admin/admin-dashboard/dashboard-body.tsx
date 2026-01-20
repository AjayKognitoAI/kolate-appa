"use client";

import { Box, Typography } from "@mui/material";
import EnterpriseTable from "../enterprise/enterprise-table";

const DashboardBody = () => {
  return (
    <Box>
      {/* Enterprise Table Section */}
      <Box>
        {/* <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
          Enterprises
        </Typography> */}
        <EnterpriseTable />
      </Box>
    </Box>
  );
};

export default DashboardBody;
