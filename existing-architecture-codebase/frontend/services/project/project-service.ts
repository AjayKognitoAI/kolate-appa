import { privateAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

const PROJECT_ENDPOINTS = API_CONFIG.PROJECT_MANAGER;
const USER_ENDPOINTS = API_CONFIG.USER_MANAGER;
const ENTERPRISE_ENDPOINTS = API_CONFIG.ENTERPRISE_MANAGER;

export interface ProjectUser {
  user_auth0_id: string;
  role_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;
  job_title?: string | null;
  role_id?: string;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  created_by: string;
  project_users: ProjectUser[];
}

export interface UpdateProjectRequest {
  name: string;
  description: string;
  status: string;
  updated_by: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string;
  status?: string;
  created_by: string;
  updated_by?: string;
  project_users: ProjectUser[];
  created_at: string;
  updated_at: string;
  total_users?: number | null;
}

export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

export type PermissionType = "FULL_ACCESS" | "READ_ONLY" | "HIDDEN";

export interface ProjectPermissions {
  PREDICT: PermissionType;
  COPILOT: PermissionType;
  COMPARE: PermissionType;
  INSIGHTS: PermissionType;
}

export interface UserProjectRolePermission {
  project_id: string;
  project_name: string;
  role: string;
  role_id: string;
  permissions: ProjectPermissions;
}

export const projectService = {
  createProject: async (
    data: CreateProjectRequest
  ): Promise<ApiResponse<ProjectResponse>> => {
    const response = await privateAxios.post(
      PROJECT_ENDPOINTS.PROJECT,
      data
    );
    return response.data;
  },

  getProject: async (
    projectId: string
  ): Promise<ApiResponse<ProjectResponse>> => {
    const response = await privateAxios.get(
      `${PROJECT_ENDPOINTS.PROJECT}/${projectId}`
    );
    return response.data;
  },

  updateProject: async (
    projectId: string,
    data: UpdateProjectRequest
  ): Promise<ApiResponse<ProjectResponse>> => {
    const response = await privateAxios.put(
      `${PROJECT_ENDPOINTS.PROJECT}/${projectId}`,
      data
    );
    return response.data;
  },

  deleteProject: async (projectId: string): Promise<ApiResponse<null>> => {
    const response = await privateAxios.delete(
      `${PROJECT_ENDPOINTS.PROJECT}/${projectId}`
    );
    return response.data;
  },
  deleteProjectUser: async (
    projectId: string,
    userAuth0Id: string
  ): Promise<ApiResponse<null>> => {
    const response = await privateAxios.delete(
      `${PROJECT_ENDPOINTS.PROJECT}/${projectId}/users/${decodeURI(
        userAuth0Id
      )}`
    );
    return response.data;
  },

  searchProjects: async (params: {
    name_pattern?: string;
    page?: number;
    size?: number;
    sort_by?: string;
    sort_direction?: string;
    status?: string;
  }): Promise<
    ApiResponse<{ content: ProjectResponse[]; total_elements: number }>
  > => {
    const {
      name_pattern,
      page = 0,
      size = 10,
      sort_by = "created_at",
      sort_direction = "desc",
      status,
    } = params;
    const response = await privateAxios.get(
      PROJECT_ENDPOINTS.PROJECT_SEARCH,
      {
        params: {
          name_pattern,
          page,
          size,
          sort_by,
          sort_direction,
          status,
        },
      }
    );
    return response.data;
  },

  listProjects: async (params: {
    page?: number;
    size?: number;
    sort_by?: string;
    sort_direction?: string;
  }): Promise<
    ApiResponse<{ content: ProjectResponse[]; total_elements: number }>
  > => {
    const {
      page = 0,
      size = 10,
      sort_by = "createdAt",
      sort_direction = "desc",
    } = params;
    const response = await privateAxios.get(PROJECT_ENDPOINTS.PROJECT, {
      params: {
        page,
        size,
        sort_by,
        sort_direction,
      },
    });
    return response.data;
  },

  getProjectUsers: async (
    projectId: string
  ): Promise<ApiResponse<ProjectUser[]>> => {
    const response = await privateAxios.get(
      `${PROJECT_ENDPOINTS.PROJECT}/${projectId}/users`
    );
    return response.data;
  },

  addProjectUser: async (
    projectId: string,
    data: { user_auth0_id: string; role_id: string; role?: string }
  ): Promise<ApiResponse<null>> => {
    const response = await privateAxios.post(
      `${PROJECT_ENDPOINTS.PROJECT}/${projectId}/users`,
      data
    );
    return response.data;
  },

  updateProjectUserRole: async (
    projectId: string,
    userAuth0Id: string,
    newRole: string
  ): Promise<ApiResponse<null>> => {
    const response = await privateAxios.put(
      `${PROJECT_ENDPOINTS.PROJECT}/${projectId}/users/${decodeURI(
        userAuth0Id
      )}/role`,
      null,
      {
        params: {
          role: newRole,
        },
      }
    );
    return response.data;
  },

  getProjectStatistics: async (): Promise<ApiResponse<any>> => {
    const response = await privateAxios.get(
      PROJECT_ENDPOINTS.PROJECTS_STATISTICS
    );
    return response.data;
  },

  searchUsers: async (params: {
    q: string;
    page?: number;
    size?: number;
  }): Promise<ApiResponse<{ content: any[]; total_elements: number }>> => {
    const { q, page = 0, size = 20 } = params;
    const response = await privateAxios.get(
      USER_ENDPOINTS.USERS_SEARCH,
      {
        params: { q, page, size },
      }
    );
    return response.data;
  },

  getUserProjectsByAuth0Id: async (
    auth0Id: string
  ): Promise<ApiResponse<any>> => {
    const response = await privateAxios.get(
      `${PROJECT_ENDPOINTS.PROJECT}/user/${decodeURI(auth0Id)}`
    );
    return response.data;
  },

  getProjectRoles: async (
    projectId: string
  ): Promise<
    ApiResponse<{ id: string; name: string; description: string }[]>
  > => {
    const response = await privateAxios.get(
      `${PROJECT_ENDPOINTS.PROJECT}/${projectId}/roles`
    );
    return response.data;
  },
};

export const getEnterpriseProjectStatistics = (organizationId: string) => {
  return privateAxios.get<ApiResponse<any>>(
    `${ENTERPRISE_ENDPOINTS.ENTERPRISES}/${organizationId}/projects/statistics`
  );
};

export const getEnterpriseProjects = (
  organizationId: string,
  params: {
    page?: number;
    size?: number;
    sort_by?: string;
    sort_direction?: string;
  }
) => {
  const {
    page = 0,
    size = 10,
    sort_by = "createdAt",
    sort_direction = "desc",
  } = params;

  return privateAxios.get<ApiResponse<any>>(
    `${ENTERPRISE_ENDPOINTS.ENTERPRISES}/${organizationId}/projects`,
    {
      params: {
        page,
        size,
        sort_by,
        sort_direction,
      },
    }
  );
};

export const createProjectRole = (
  projectId: string,
  data: {
    name: string;
    description: string;
    role_permissions: Record<string, "FULL_ACCESS" | "READ_ONLY" | "HIDDEN">;
  }
) => {
  return privateAxios.post<ApiResponse<any>>(
    `${PROJECT_ENDPOINTS.PROJECT}/${projectId}/role`,
    data
  );
};

export const updateRolePermissions = (
  roleId: string,
  name: string,
  description: string,
  permissions: Record<string, "FULL_ACCESS" | "READ_ONLY" | "HIDDEN">
) => {
  return privateAxios.put<ApiResponse<any>>(
    `${PROJECT_ENDPOINTS.PROJECT}/role/permissions`,
    { id: roleId, name, description, permissions }
  );
};

export const getRoleWithPermissions = (roleId: string) => {
  return privateAxios.get<ApiResponse<any>>(
    `${PROJECT_ENDPOINTS.PROJECT}/role/${roleId}`
  );
};

/**
 * Delete a role from a project
 */
export const deleteProjectRole = (projectId: string, roleId: string) => {
  return privateAxios.delete<ApiResponse<null>>(
    `${PROJECT_ENDPOINTS.PROJECT}/${projectId}/role/${roleId}`
  );
};

/**
 * Move users from an old role to a new role and delete the old role
 */
export const moveUsersAndDeleteRole = (
  projectId: string,
  oldRoleId: string,
  newRoleId: string
) => {
  return privateAxios.delete<ApiResponse<string>>(
    `${PROJECT_ENDPOINTS.PROJECT}/${projectId}/role/${oldRoleId}/move/${newRoleId}`
  );
};

export const getUserProjectsRolesPermissions = (auth0Id: string) =>
  privateAxios.get<ApiResponse<UserProjectRolePermission[]>>(
    `${PROJECT_ENDPOINTS.PROJECT}/user/${encodeURIComponent(
      auth0Id
    )}/roles-permissions`
  );
