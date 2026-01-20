import React from "react";
import { Tabs, Tab, Box } from "@mui/material";

export interface PredictSectionTabsProps {
  value: number; // active tab index
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
  permission?: string;
}

const PredictSectionTabs: React.FC<PredictSectionTabsProps> = ({
  value,
  onChange,
  permission,
}) => {
  return (
    <Box borderBottom={1} borderColor="divider" borderRadius={0} pl={1} mt={3}>
      {permission === "FULL_ACCESS" ? (
        <Tabs
          value={value}
          onChange={onChange}
          textColor="primary"
          indicatorColor="primary"
          variant="standard"
        >
          <Tab label="Patient List" />
          <Tab label="History" />
          <Tab label="Bookmarks" />
          <Tab label="Shared reports" />
        </Tabs>
      ) : (
        <Tabs
          value={value}
          onChange={onChange}
          textColor="primary"
          indicatorColor="primary"
          variant="standard"
        >
          <Tab label="Shared reports" />
        </Tabs>
      )}
    </Box>
  );
};

export default PredictSectionTabs;
