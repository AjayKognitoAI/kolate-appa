"use client";

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from "react";
import { WIZARD_STEPS, ONBOARDING_STEPS } from "@/services/onboarding/onboarding-service";

// Types
export interface CompanyInfoData {
  name: string;
  description?: string;
  industry?: string;
  employeeCount?: string;
  logoUrl?: string;
  website?: string;
}

export interface AdminInfoData {
  firstName: string;
  lastName: string;
  jobTitle?: string;
  phone?: string;
}

export interface SSOConfigData {
  enabled: boolean;
  provider?: string;
  domain?: string;
  clientId?: string;
  clientSecret?: string;
  metadataUrl?: string;
}

export interface InvitedUser {
  email: string;
  role: string;
  name?: string;
}

export interface DatasourceConfig {
  type: string;
  name?: string;
  connectionString?: string;
  configured: boolean;
}

export interface OnboardingState {
  token: string;
  currentStep: number;
  enterpriseId: string | null;
  enterpriseName: string | null;
  enterpriseDomain: string | null;
  adminEmail: string | null;
  organizationId: string | null;
  status: string | null;
  companyInfo: CompanyInfoData | null;
  adminInfo: AdminInfoData | null;
  ssoConfig: SSOConfigData | null;
  invitedUsers: InvitedUser[];
  datasourceConfig: DatasourceConfig | null;
  isCompleted: boolean;
  isLoading: boolean;
  error: string | null;
  stepsCompleted: number[];
}

type OnboardingAction =
  | { type: "SET_TOKEN"; payload: string }
  | { type: "SET_ENTERPRISE_DATA"; payload: Partial<OnboardingState> }
  | { type: "SET_CURRENT_STEP"; payload: number }
  | { type: "NEXT_STEP" }
  | { type: "PREVIOUS_STEP" }
  | { type: "SET_COMPANY_INFO"; payload: CompanyInfoData }
  | { type: "SET_ADMIN_INFO"; payload: AdminInfoData }
  | { type: "SET_SSO_CONFIG"; payload: SSOConfigData }
  | { type: "ADD_INVITED_USER"; payload: InvitedUser }
  | { type: "REMOVE_INVITED_USER"; payload: string }
  | { type: "SET_DATASOURCE_CONFIG"; payload: DatasourceConfig }
  | { type: "MARK_STEP_COMPLETED"; payload: number }
  | { type: "SET_COMPLETED"; payload: boolean }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "RESET" };

const initialState: OnboardingState = {
  token: "",
  currentStep: 0,
  enterpriseId: null,
  enterpriseName: null,
  enterpriseDomain: null,
  adminEmail: null,
  organizationId: null,
  status: null,
  companyInfo: null,
  adminInfo: null,
  ssoConfig: null,
  invitedUsers: [],
  datasourceConfig: null,
  isCompleted: false,
  isLoading: false,
  error: null,
  stepsCompleted: [],
};

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case "SET_TOKEN":
      return { ...state, token: action.payload };

    case "SET_ENTERPRISE_DATA":
      return { ...state, ...action.payload };

    case "SET_CURRENT_STEP":
      return { ...state, currentStep: action.payload };

    case "NEXT_STEP":
      const nextStep = Math.min(state.currentStep + 1, WIZARD_STEPS.length - 1);
      return {
        ...state,
        currentStep: nextStep,
        stepsCompleted: state.stepsCompleted.includes(state.currentStep)
          ? state.stepsCompleted
          : [...state.stepsCompleted, state.currentStep],
      };

    case "PREVIOUS_STEP":
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 0),
      };

    case "SET_COMPANY_INFO":
      return { ...state, companyInfo: action.payload };

    case "SET_ADMIN_INFO":
      return { ...state, adminInfo: action.payload };

    case "SET_SSO_CONFIG":
      return { ...state, ssoConfig: action.payload };

    case "ADD_INVITED_USER":
      return {
        ...state,
        invitedUsers: [...state.invitedUsers, action.payload],
      };

    case "REMOVE_INVITED_USER":
      return {
        ...state,
        invitedUsers: state.invitedUsers.filter((u) => u.email !== action.payload),
      };

    case "SET_DATASOURCE_CONFIG":
      return { ...state, datasourceConfig: action.payload };

    case "MARK_STEP_COMPLETED":
      if (state.stepsCompleted.includes(action.payload)) {
        return state;
      }
      return {
        ...state,
        stepsCompleted: [...state.stepsCompleted, action.payload],
      };

    case "SET_COMPLETED":
      return { ...state, isCompleted: action.payload };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// Context
interface OnboardingContextType {
  state: OnboardingState;
  setToken: (token: string) => void;
  setEnterpriseData: (data: Partial<OnboardingState>) => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  setCompanyInfo: (data: CompanyInfoData) => void;
  setAdminInfo: (data: AdminInfoData) => void;
  setSsoConfig: (data: SSOConfigData) => void;
  addInvitedUser: (user: InvitedUser) => void;
  removeInvitedUser: (email: string) => void;
  setDatasourceConfig: (config: DatasourceConfig) => void;
  markStepCompleted: (step: number) => void;
  setCompleted: (completed: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  isStepCompleted: (step: number) => boolean;
  canProceed: () => boolean;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({
  children,
  initialToken = "",
}: {
  children: ReactNode;
  initialToken?: string;
}) {
  const [state, dispatch] = useReducer(onboardingReducer, {
    ...initialState,
    token: initialToken,
  });

  const setToken = useCallback((token: string) => {
    dispatch({ type: "SET_TOKEN", payload: token });
  }, []);

  const setEnterpriseData = useCallback((data: Partial<OnboardingState>) => {
    dispatch({ type: "SET_ENTERPRISE_DATA", payload: data });
  }, []);

  const goToStep = useCallback((step: number) => {
    dispatch({ type: "SET_CURRENT_STEP", payload: step });
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: "NEXT_STEP" });
  }, []);

  const previousStep = useCallback(() => {
    dispatch({ type: "PREVIOUS_STEP" });
  }, []);

  const setCompanyInfo = useCallback((data: CompanyInfoData) => {
    dispatch({ type: "SET_COMPANY_INFO", payload: data });
  }, []);

  const setAdminInfo = useCallback((data: AdminInfoData) => {
    dispatch({ type: "SET_ADMIN_INFO", payload: data });
  }, []);

  const setSsoConfig = useCallback((data: SSOConfigData) => {
    dispatch({ type: "SET_SSO_CONFIG", payload: data });
  }, []);

  const addInvitedUser = useCallback((user: InvitedUser) => {
    dispatch({ type: "ADD_INVITED_USER", payload: user });
  }, []);

  const removeInvitedUser = useCallback((email: string) => {
    dispatch({ type: "REMOVE_INVITED_USER", payload: email });
  }, []);

  const setDatasourceConfig = useCallback((config: DatasourceConfig) => {
    dispatch({ type: "SET_DATASOURCE_CONFIG", payload: config });
  }, []);

  const markStepCompleted = useCallback((step: number) => {
    dispatch({ type: "MARK_STEP_COMPLETED", payload: step });
  }, []);

  const setCompleted = useCallback((completed: boolean) => {
    dispatch({ type: "SET_COMPLETED", payload: completed });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: "SET_LOADING", payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: "SET_ERROR", payload: error });
  }, []);

  const isStepCompleted = useCallback(
    (step: number) => state.stepsCompleted.includes(step),
    [state.stepsCompleted]
  );

  const canProceed = useCallback(() => {
    const { currentStep, companyInfo, adminInfo } = state;

    switch (currentStep) {
      case 0: // Company Info
        return !!companyInfo?.name;
      case 1: // Admin Setup
        return !!adminInfo?.firstName && !!adminInfo?.lastName;
      case 2: // SSO Config (optional)
        return true;
      case 3: // Invite Users (optional)
        return true;
      case 4: // Datasource (optional)
        return true;
      case 5: // Review
        return !!companyInfo?.name;
      default:
        return false;
    }
  }, [state]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        state,
        setToken,
        setEnterpriseData,
        goToStep,
        nextStep,
        previousStep,
        setCompanyInfo,
        setAdminInfo,
        setSsoConfig,
        addInvitedUser,
        removeInvitedUser,
        setDatasourceConfig,
        markStepCompleted,
        setCompleted,
        setLoading,
        setError,
        isStepCompleted,
        canProceed,
        reset,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}

export default OnboardingContext;
