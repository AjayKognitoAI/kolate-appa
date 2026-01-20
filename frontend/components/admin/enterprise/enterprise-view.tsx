import React from "react";
import { Box, Drawer, IconButton, Tabs, Tab, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EnterpriseAboutTab from "./enterprise-about-tab";
import EnterpriseProjectsTab from "./enterprise-projects-tab";
import { getEnterprise } from "@/services/org-admin/enterprise-setup";
import ModulePermissionForm from "./module-permission-form";
import moduleService from "@/services/module/module-service";

export default function EnterpriseView({
  open,
  onClose,
  enterpriseId,
  orgId,
}: {
  open: boolean;
  onClose: () => void;
  enterpriseId: string;
  orgId: string;
}) {
  const [tabIndex, setTabIndex] = React.useState(0);
  const [enterprise, setEnterprise] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open && enterpriseId) {
      setLoading(true);
      getEnterprise(enterpriseId)
        .then((res) => {
          setEnterprise(res.data.data);
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error("Failed to fetch enterprise data", err);
        })
        .finally(() => setLoading(false));
    } else if (!open) {
      setEnterprise(null);
    }
  }, [open, enterpriseId]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          maxWidth: 768,
          width: "100%",
          padding: 2,
          boxSizing: "border-box",
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
        },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">{enterprise?.name || "Enterprise"}</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Tabs value={tabIndex} onChange={(e, newValue) => setTabIndex(newValue)}>
        <Tab label="About" />
        <Tab label="Model(s) Permission" />
        <Tab label="Project" />
      </Tabs>
      <Box mt={2}>
        {tabIndex === 0 ? (
          <EnterpriseAboutTab enterprise={enterprise} loading={loading} />
        ) : tabIndex === 1 ? (
          <ModulePermissionForm
            enterpriseId={enterpriseId}
            organizationId={orgId}
            enterpriseName={enterprise?.name || ""}
            onSubmit={async (payload) => {
              await moduleService.manageAccess({
                enterprise_id: enterpriseId,
                organization_id: orgId,
                ...payload,
              });
            }}
          />
        ) : (
          <EnterpriseProjectsTab orgId={orgId} />
        )}
      </Box>
    </Drawer>
  );
}
