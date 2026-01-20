import React from "react";
import { useAppSelector } from "@/store";
import { getCurrentProject } from "@/store/slices/projectsSlice";
import predictService from "@/services/predict/predict-service";
import AddPatientProfileModalBase, {
  AddPatientProfileModalBaseProps,
} from "../AddPatientProfileModalBase";
import { ModalConfig, ResultDisplayConfig } from "@/utils/predict/predict-trials.config";

interface AddPatientProfileModalProps
  extends Omit<
    AddPatientProfileModalBaseProps<any>,
    "getFields" | "uploadCsv" | "createRecord" | "title" | "runPrediction" | "getSamplePatients"
  > {
  modalConfig: ModalConfig;
  resultDisplay?: ResultDisplayConfig;
  runPrediction?: (patient: any, projectId: string) => Promise<any>;
}

const AddPatientProfileModal: React.FC<AddPatientProfileModalProps> = ({
  modalConfig,
  resultDisplay,
  runPrediction,
  ...props
}) => {
  const project = useAppSelector(getCurrentProject);

  return (
    <AddPatientProfileModalBase<any>
      {...props}
      title={modalConfig.title}
      getFields={modalConfig.getFields}
      uploadCsv={async (file, projectId, trialSlug) => {
        const res = await predictService.uploadPatientRecord(
          file,
          projectId,
          trialSlug
        );
        return res.data?.data || [];
      }}
      createRecord={async (projectId, trialSlug, data) => {
        const processedData = modalConfig.reorderData
          ? modalConfig.reorderData(data)
          : data;
        const res = await predictService.createPatientRecord(
          projectId,
          trialSlug,
          processedData
        );
        return res.data;
      }}
      runPrediction={
        runPrediction
          ? async (patient) => runPrediction(patient, project?.project_id ?? "")
          : undefined
      }
      getSamplePatients={modalConfig.getSamplePatients}
    />
  );
};

export default AddPatientProfileModal;
