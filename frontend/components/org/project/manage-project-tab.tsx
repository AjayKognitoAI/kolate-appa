import React, { useState } from "react";
import TeamMembers from "./team-members";
import { Tabs, Tab, Box } from "@mui/material";
import { ProjectResponse } from "@/services/project/project-service";
import RoleTemplates from "./role-templates";

const tabs = [
  { label: "Team Members" },
  { label: "Role Templates" },
  // { label: "Audit Logs" },
];

const ManageProjectTab = ({
  projectId,
  setProject,
}: {
  projectId: string;
  setProject: React.Dispatch<React.SetStateAction<ProjectResponse | null>>;
}) => {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <Box>
      <Tabs
        value={selectedTab}
        onChange={(_e, newValue) => setSelectedTab(newValue)}
        indicatorColor="primary"
        textColor="primary"
        sx={{ mb: 2, borderBottom: "1px solid #e0e0e0" }}
      >
        {tabs.map((tab, idx) => (
          <Tab
            key={tab.label}
            label={tab.label}
            sx={{ fontWeight: 500, fontSize: 14, mr: 4, pb: 1 }}
          />
        ))}
      </Tabs>
      <Box>
        {selectedTab === 0 && (
          <TeamMembers projectId={projectId} setProject={setProject} />
        )}
        {selectedTab === 1 && (
          <RoleTemplates projectId={projectId} setProject={setProject} />
        )}

        {/* Add content for other tabs as needed */}
      </Box>
    </Box>
  );
};

export default ManageProjectTab;
