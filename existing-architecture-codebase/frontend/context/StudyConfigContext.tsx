"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type {
  StudyConfigWizardState,
  CreateModelRequest,
  ModelReferenceRequest,
  CreateFieldMetadataRequest,
  PreprocessingConfigRequest,
  ServiceConfigRequest,
  ChartConfigRequest,
  WizardStep,
  StepConfig,
} from "@/types/ml-evaluation-admin.types";

// Wizard steps configuration
export const WIZARD_STEPS: StepConfig[] = [
  { id: 1, key: "models", title: "Models", description: "Upload or reference ML models" },
  { id: 2, key: "fields", title: "Fields", description: "Define input field metadata" },
  { id: 3, key: "linking", title: "Link & Configure", description: "Link models with settings" },
  { id: 4, key: "charts", title: "Charts", description: "Configure analytics" },
  { id: 5, key: "preview", title: "Preview & Test", description: "Validate and activate" },
];

// Initial state
const getInitialState = (studySlug: string, moduleId: string, studyName: string): StudyConfigWizardState => ({
  studySlug,
  moduleId,
  studyName,
  models: [],
  uploadedModelIds: [],
  fieldMetadata: null,
  fieldMetadataId: null,
  linkedModels: [],
  preprocessing: {
    requires_one_hot: true,
    missing_value_strategy: "zero_fill",
    feature_engineering: [],
  },
  serviceConfig: {
    cache_ttl_seconds: 300,
    batch_prediction_max_rows: 1000,
    enable_execution_tracking: true,
  },
  chartConfig: null,
  currentStep: 1,
  completedSteps: [],
  isDirty: false,
  isLoading: false,
  error: null,
});

// Context value interface
interface StudyConfigContextValue {
  state: StudyConfigWizardState;
  steps: StepConfig[];

  // Navigation
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  canProceed: () => boolean;
  isStepCompleted: (step: number) => boolean;
  markStepCompleted: (step: number) => void;

  // Model operations
  addModel: (model: CreateModelRequest) => void;
  updateModel: (index: number, model: CreateModelRequest) => void;
  removeModel: (index: number) => void;
  addUploadedModelId: (modelId: string) => void;

  // Field metadata operations
  setFieldMetadata: (metadata: CreateFieldMetadataRequest) => void;
  setFieldMetadataId: (id: string) => void;

  // Model linking operations
  linkModel: (modelRef: ModelReferenceRequest) => void;
  unlinkModel: (modelKey: string) => void;
  updateLinkedModel: (modelKey: string, updates: Partial<ModelReferenceRequest>) => void;
  reorderLinkedModels: (fromIndex: number, toIndex: number) => void;

  // Preprocessing & Service config
  setPreprocessing: (config: PreprocessingConfigRequest) => void;
  setServiceConfig: (config: ServiceConfigRequest) => void;

  // Chart config
  setChartConfig: (config: ChartConfigRequest | null) => void;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
  loadExistingConfig: (config: Partial<StudyConfigWizardState>) => void;
}

// Create context
const StudyConfigContext = createContext<StudyConfigContextValue | undefined>(undefined);

// Initial config from existing ML configuration (loaded from API)
export interface InitialMLConfig {
  models?: CreateModelRequest[];
  uploadedModelIds?: string[];
  linkedModels?: ModelReferenceRequest[];
  fieldMetadata?: CreateFieldMetadataRequest;
  fieldMetadataId?: string;
  chartConfig?: ChartConfigRequest | null;
  preprocessing?: PreprocessingConfigRequest;
  serviceConfig?: ServiceConfigRequest;
  completedSteps?: number[];
}

// Provider props
interface StudyConfigProviderProps {
  children: ReactNode;
  studySlug: string;
  moduleId: string;
  studyName: string;
  initialConfig?: InitialMLConfig | null;
}

// Provider component
export const StudyConfigProvider: React.FC<StudyConfigProviderProps> = ({
  children,
  studySlug,
  moduleId,
  studyName,
  initialConfig,
}) => {
  const [state, setState] = useState<StudyConfigWizardState>(() => {
    const baseState = getInitialState(studySlug, moduleId, studyName);

    // If we have existing config from API, merge it with the base state
    if (initialConfig) {
      return {
        ...baseState,
        models: initialConfig.models ?? [],
        uploadedModelIds: initialConfig.uploadedModelIds ?? [],
        linkedModels: initialConfig.linkedModels ?? [],
        fieldMetadata: initialConfig.fieldMetadata ?? null,
        fieldMetadataId: initialConfig.fieldMetadataId ?? null,
        chartConfig: initialConfig.chartConfig ?? null,
        preprocessing: initialConfig.preprocessing ?? baseState.preprocessing,
        serviceConfig: initialConfig.serviceConfig ?? baseState.serviceConfig,
        completedSteps: initialConfig.completedSteps ?? [],
        isDirty: false,
      };
    }

    return baseState;
  });

  // Navigation
  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= WIZARD_STEPS.length) {
      setState((prev) => ({ ...prev, currentStep: step }));
    }
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep < WIZARD_STEPS.length) {
        return { ...prev, currentStep: prev.currentStep + 1 };
      }
      return prev;
    });
  }, []);

  const previousStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep > 1) {
        return { ...prev, currentStep: prev.currentStep - 1 };
      }
      return prev;
    });
  }, []);

  const canProceed = useCallback(() => {
    const { currentStep, models, fieldMetadata, linkedModels } = state;
    switch (currentStep) {
      case 1:
        return models.length > 0;
      case 2:
        return fieldMetadata !== null && fieldMetadata.fields.length > 0;
      case 3:
        return linkedModels.length > 0;
      case 4:
        return true; // Charts are optional
      case 5:
        return true;
      default:
        return false;
    }
  }, [state]);

  const isStepCompleted = useCallback(
    (step: number) => state.completedSteps.includes(step),
    [state.completedSteps]
  );

  const markStepCompleted = useCallback((step: number) => {
    setState((prev) => {
      if (!prev.completedSteps.includes(step)) {
        return { ...prev, completedSteps: [...prev.completedSteps, step] };
      }
      return prev;
    });
  }, []);

  // Model operations
  const addModel = useCallback((model: CreateModelRequest) => {
    setState((prev) => ({
      ...prev,
      models: [...prev.models, model],
      isDirty: true,
    }));
  }, []);

  const updateModel = useCallback((index: number, model: CreateModelRequest) => {
    setState((prev) => {
      const newModels = [...prev.models];
      newModels[index] = model;
      return { ...prev, models: newModels, isDirty: true };
    });
  }, []);

  const removeModel = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      models: prev.models.filter((_, i) => i !== index),
      isDirty: true,
    }));
  }, []);

  const addUploadedModelId = useCallback((modelId: string) => {
    setState((prev) => ({
      ...prev,
      uploadedModelIds: [...prev.uploadedModelIds, modelId],
    }));
  }, []);

  // Field metadata operations
  const setFieldMetadata = useCallback((metadata: CreateFieldMetadataRequest) => {
    setState((prev) => ({
      ...prev,
      fieldMetadata: metadata,
      isDirty: true,
    }));
  }, []);

  const setFieldMetadataId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, fieldMetadataId: id }));
  }, []);

  // Model linking operations
  const linkModel = useCallback((modelRef: ModelReferenceRequest) => {
    setState((prev) => {
      // Check if already linked
      if (prev.linkedModels.some((m) => m.model_key === modelRef.model_key)) {
        return prev;
      }
      return {
        ...prev,
        linkedModels: [...prev.linkedModels, modelRef],
        isDirty: true,
      };
    });
  }, []);

  const unlinkModel = useCallback((modelKey: string) => {
    setState((prev) => ({
      ...prev,
      linkedModels: prev.linkedModels.filter((m) => m.model_key !== modelKey),
      isDirty: true,
    }));
  }, []);

  const updateLinkedModel = useCallback(
    (modelKey: string, updates: Partial<ModelReferenceRequest>) => {
      setState((prev) => ({
        ...prev,
        linkedModels: prev.linkedModels.map((m) =>
          m.model_key === modelKey ? { ...m, ...updates } : m
        ),
        isDirty: true,
      }));
    },
    []
  );

  const reorderLinkedModels = useCallback((fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const newLinkedModels = [...prev.linkedModels];
      const [removed] = newLinkedModels.splice(fromIndex, 1);
      newLinkedModels.splice(toIndex, 0, removed);
      // Update display order
      const updatedModels = newLinkedModels.map((m, i) => ({
        ...m,
        display_order: i + 1,
      }));
      return { ...prev, linkedModels: updatedModels, isDirty: true };
    });
  }, []);

  // Preprocessing & Service config
  const setPreprocessing = useCallback((config: PreprocessingConfigRequest) => {
    setState((prev) => ({
      ...prev,
      preprocessing: { ...prev.preprocessing, ...config },
      isDirty: true,
    }));
  }, []);

  const setServiceConfig = useCallback((config: ServiceConfigRequest) => {
    setState((prev) => ({
      ...prev,
      serviceConfig: { ...prev.serviceConfig, ...config },
      isDirty: true,
    }));
  }, []);

  // Chart config
  const setChartConfig = useCallback((config: ChartConfigRequest | null) => {
    setState((prev) => ({
      ...prev,
      chartConfig: config,
      isDirty: true,
    }));
  }, []);

  // State management
  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const resetState = useCallback(() => {
    setState(getInitialState(studySlug, moduleId, studyName));
  }, [studySlug, moduleId, studyName]);

  const loadExistingConfig = useCallback((config: Partial<StudyConfigWizardState>) => {
    setState((prev) => ({ ...prev, ...config, isDirty: false }));
  }, []);

  const value: StudyConfigContextValue = {
    state,
    steps: WIZARD_STEPS,
    goToStep,
    nextStep,
    previousStep,
    canProceed,
    isStepCompleted,
    markStepCompleted,
    addModel,
    updateModel,
    removeModel,
    addUploadedModelId,
    setFieldMetadata,
    setFieldMetadataId,
    linkModel,
    unlinkModel,
    updateLinkedModel,
    reorderLinkedModels,
    setPreprocessing,
    setServiceConfig,
    setChartConfig,
    setLoading,
    setError,
    resetState,
    loadExistingConfig,
  };

  return (
    <StudyConfigContext.Provider value={value}>
      {children}
    </StudyConfigContext.Provider>
  );
};

// Custom hook to use the context
export const useStudyConfig = (): StudyConfigContextValue => {
  const context = useContext(StudyConfigContext);
  if (context === undefined) {
    throw new Error("useStudyConfig must be used within a StudyConfigProvider");
  }
  return context;
};

export default StudyConfigContext;
