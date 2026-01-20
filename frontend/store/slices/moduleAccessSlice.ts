import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Trial {
  id: number | null;
  name?: string;
  icon_url?: string;
  trial_access?: boolean;
  description?: string; // ✅ added for accordion UI
  module_id?: number;
  created_at?: string | null;
  slug?: string;
}

export interface ModuleAccess {
  id: number;
  name: string;
  is_standalone: boolean;
  module_access?: boolean;
  trials: Trial[];
  created_at?: string;
  slug?: string;
}

interface State {
  modules: ModuleAccess[];
}

const initialState: State = {
  modules: [],
};

const moduleAccessSlice = createSlice({
  name: "moduleAccess",
  initialState,
  reducers: {
    setModules(state, action: PayloadAction<ModuleAccess[]>) {
      state.modules = action.payload;
    },
  },
});

// ✅ Selectors
export const getModuleList = (state: { moduleAccess: State }) =>
  state.moduleAccess.modules;

// ✅ Helper function to get trial name
export const getTrialName = (
  state: { moduleAccess: State },
  moduleSlug: string,
  trialSlug: string
): string | undefined => {
  const trials =
    state.moduleAccess.modules.find((m) => m.slug === moduleSlug)?.trials ?? [];
  const trial = trials.find((t) => t.slug === trialSlug);
  return trial?.name ?? trialSlug;
};

export const { setModules } = moduleAccessSlice.actions;
export default moduleAccessSlice.reducer;
