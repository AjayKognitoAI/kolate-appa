// components/enterprise/module-permission-form.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  Typography,
  Skeleton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import moduleService, { ModuleAccess } from "@/services/module/module-service";

interface ModulePermissionFormProps {
  enterpriseId: string;
  organizationId: string;
  enterpriseName: string;
  onSubmit: (payload: {
    grant_access: any[];
    revoke_access: any[];
  }) => Promise<void>;
}

const ModulePermissionForm: React.FC<ModulePermissionFormProps> = ({
  enterpriseId,
  organizationId,
  enterpriseName,
  onSubmit,
}) => {
  const [modules, setModules] = useState<ModuleAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModules, setSelectedModules] = useState<Record<string, any>>(
    {}
  );

  // ✅ Fetch modules
  useEffect(() => {
    if (enterpriseId) {
      setLoading(true);
      moduleService
        .getEnterpriseModules(enterpriseId)
        .then((res) => {
          setModules(res.data.data);

          // Initialize checkbox state
          const initialState: Record<string, any> = {};
          res.data.data.forEach((mod) => {
            initialState[mod.id] = {
              module_access: mod.module_access,
              trials: mod.trials.filter((t) => t.trial_access).map((t) => t.id),
            };
          });
          setSelectedModules(initialState);
        })
        .finally(() => setLoading(false));
    }
  }, [enterpriseId]);

  // ✅ Toggle module
  const handleModuleToggle = (module: ModuleAccess) => {
    setSelectedModules((prev) => {
      const current = prev[module.id] || { module_access: false, trials: [] };
      const allTrialIds = module.trials.map((t) => t.id);
      const newAccess = !current.module_access;
      return {
        ...prev,
        [module.id]: {
          module_access: newAccess,
          trials: newAccess ? allTrialIds : [],
        },
      };
    });
  };

  // ✅ Toggle trial
  const handleTrialToggle = (moduleId: number, trialId: number) => {
    setSelectedModules((prev) => {
      const current = prev[moduleId] || { module_access: false, trials: [] };
      const isSelected = current.trials.includes(trialId);
      const updatedTrials = isSelected
        ? current.trials.filter((id: number) => id !== trialId)
        : [...current.trials, trialId];
      return {
        ...prev,
        [moduleId]: {
          module_access: updatedTrials.length > 0,
          trials: updatedTrials,
        },
      };
    });
  };

  // ✅ Submit logic (returns payload to parent)
  const handleSubmit = async () => {
    const grant_access: any[] = [];
    const revoke_access: any[] = [];

    modules.forEach((mod) => {
      const selected = selectedModules[mod.id] || {
        module_access: false,
        trials: [],
      };

      if (mod.is_standalone) {
        if (selected.module_access && !mod.module_access) {
          grant_access.push({ module_id: mod.id, id: null });
        } else if (!selected.module_access && mod.module_access) {
          revoke_access.push({ module_id: mod.id, id: null });
        }
      } else {
        mod.trials.forEach((trial) => {
          const isNowSelected = selected.trials.includes(trial.id);
          if (isNowSelected && !trial.trial_access) {
            grant_access.push({ module_id: mod.id, trial_id: trial.id });
          } else if (!isNowSelected && trial.trial_access) {
            revoke_access.push({ module_id: mod.id, trial_id: trial.id });
          }
        });
      }
    });

    await onSubmit({ grant_access, revoke_access });
  };

  return (
    <Box>
      {loading
        ? [...Array(3)].map((_, i) => (
            <Box key={i} mb={2}>
              <Skeleton variant="text" width={180} height={30} />
              {[...Array(3)].map((__, j) => (
                <Skeleton
                  key={j}
                  variant="rectangular"
                  width="80%"
                  height={28}
                  sx={{ mt: 1, borderRadius: 1 }}
                />
              ))}
            </Box>
          ))
        : modules.map((module) =>
            module.is_standalone ? (
              <Box
                key={module.id}
                sx={{
                  p: 1.5,
                  mb: 2,
                  border: "1px solid #e0e0e0",
                  borderRadius: 0.5,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={
                        selectedModules[module.id]?.module_access || false
                      }
                      onChange={() => handleModuleToggle(module)}
                    />
                  }
                  label={<Typography>{module.name}</Typography>}
                />
              </Box>
            ) : (
              <Accordion
                key={module.id}
                disableGutters
                sx={{ mb: 2, "&:before": { display: "none" } }}
                defaultExpanded
                variant="outlined"
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={
                          module.trials.length > 0 &&
                          module.trials.every((t) =>
                            selectedModules[module.id]?.trials?.includes(t.id)
                          )
                        }
                        indeterminate={
                          selectedModules[module.id]?.trials?.length > 0 &&
                          selectedModules[module.id]?.trials?.length <
                            module.trials.length
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          handleModuleToggle(module);
                        }}
                        onFocus={(e) => e.stopPropagation()}
                      />
                    }
                    label={<Typography>{module.name}</Typography>}
                  />
                </AccordionSummary>
                <AccordionDetails sx={{ pl: 5, pb: 1 }}>
                  {module.trials.map((trial) => (
                    <FormControlLabel
                      key={trial.id}
                      control={
                        <Checkbox
                          checked={
                            selectedModules[module.id]?.trials?.includes(
                              trial.id
                            ) || false
                          }
                          onChange={() =>
                            handleTrialToggle(module.id, trial.id as number)
                          }
                        />
                      }
                      label={trial.name}
                      sx={{ display: "block" }}
                    />
                  ))}
                </AccordionDetails>
              </Accordion>
            )
          )}
      <Divider sx={{ my: 2 }} />

      <Box display="flex" gap={2}>
        <Typography
          onClick={handleSubmit}
          sx={{
            flex: 1,
            bgcolor: "primary.main",
            color: "white",
            py: 1,
            textAlign: "center",
            borderRadius: 1,
            cursor: "pointer",
          }}
        >
          Save
        </Typography>
      </Box>
    </Box>
  );
};

export default ModulePermissionForm;
