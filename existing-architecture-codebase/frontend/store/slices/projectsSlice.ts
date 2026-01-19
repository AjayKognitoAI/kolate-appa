import {
  UserProjectRolePermission,
  ProjectPermissions,
} from "@/services/project/project-service";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ProjectsState {
  list: UserProjectRolePermission[];
  currentProject: UserProjectRolePermission | null;
}

const initialState: ProjectsState = {
  list: [],
  currentProject: null,
};

const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    setProjects(state, action: PayloadAction<UserProjectRolePermission[]>) {
      state.list = action.payload;

      // Get stored project ID from localStorage
      const storedProjectId = localStorage.getItem("currentProjectId");

      if (action.payload.length > 0) {
        if (storedProjectId) {
          // Try to find the stored project in the new list
          const storedProject = action.payload.find(
            (p) => p.project_id === storedProjectId
          );
          if (storedProject) {
            state.currentProject = storedProject;
          } else {
            // If stored project not found, use first project
            state.currentProject = action.payload[0];
            localStorage.setItem(
              "currentProjectId",
              action.payload[0].project_id
            );
          }
        } else {
          // No stored project, use first project
          state.currentProject = action.payload[0];
          localStorage.setItem(
            "currentProjectId",
            action.payload[0].project_id
          );
        }
      } else {
        // No projects in list, clear current project
        state.currentProject = null;
        localStorage.removeItem("currentProjectId");
      }
    },
    setCurrentProject(
      state,
      action: PayloadAction<UserProjectRolePermission | null>
    ) {
      state.currentProject = action.payload;
      // Sync with localStorage
      if (action.payload) {
        localStorage.setItem("currentProjectId", action.payload.project_id);
      } else {
        localStorage.removeItem("currentProjectId");
      }
    },
    clearProjects(state) {
      state.list = [];
      state.currentProject = null;
    },
  },
});

// Selectors
export const getProjectsList = (state: { projects: ProjectsState }) =>
  state.projects.list;
export const getCurrentProject = (state: { projects: ProjectsState }) =>
  state.projects.currentProject;

// Return a single permission value (e.g. "FULL_ACCESS" | "READ_ONLY" | "HIDDEN")
// Usage: getCurrentProjectPermission(state, 'PREDICT')
export const getCurrentProjectPermission = (
  state: { projects: ProjectsState },
  key: keyof ProjectPermissions
) =>
  state.projects.currentProject?.permissions?.[key as keyof ProjectPermissions];

export const { setProjects, setCurrentProject, clearProjects } =
  projectsSlice.actions;
export default projectsSlice.reducer;
