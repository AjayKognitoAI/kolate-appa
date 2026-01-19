import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import ModulePermissionForm from "./module-permission-form";
import moduleService from "@/services/module/module-service";

export default function ModulePermissionModal({
  open,
  onClose,
  enterpriseId,
  organizationId,
  enterpriseName,
}: {
  open: boolean;
  onClose: () => void;
  enterpriseId: string;
  organizationId: string;
  enterpriseName: string;
}) {
  const handleSubmit = async (payload: {
    grant_access: any[];
    revoke_access: any[];
  }) => {
    await moduleService.manageAccess({
      enterprise_id: enterpriseId,
      organization_id: organizationId,
      ...payload,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Manage access - {enterpriseName}</DialogTitle>
      <DialogContent dividers>
        <ModulePermissionForm
          enterpriseId={enterpriseId}
          organizationId={organizationId}
          enterpriseName={enterpriseName}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
