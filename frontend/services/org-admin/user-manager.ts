import { privateAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

const ENDPOINTS = API_CONFIG.USER_MANAGER;

// Types
export interface UserInviteRequest {
  inviter_name: string;
  invitee_email: string;
  role_id: string;
}

export interface UserInviteResponse {
  user_id: string;
  invitee_email: string;
  inviter_name: string;
  role_id: string;
  message: string;
}

export interface ApiResponse<T> {
  status: string;
  message: string | null;
  data: T;
}

export const userManagerService = {
  /**
   * Invites a new user by sending inviter and invitee details
   * @param data User invitation details
   * @returns Promise with user invitation response
   */
  inviteUser: async (
    data: UserInviteRequest
  ): Promise<ApiResponse<UserInviteResponse>> => {
    const response = await privateAxios.post(
      ENDPOINTS.USER_INVITE,
      data
    );
    return response.data;
  },

  /**
   * Fetches a paginated list of users
   * @param page Page number (default 0)
   * @param size Page size (default 10)
   * @returns Promise with paginated user list
   */
  getUsers: async (page: number = 0, size: number = 10): Promise<any> => {
    const response = await privateAxios.get(ENDPOINTS.USERS, {
      params: { page, size },
    });
    return response.data;
  },

  /**
   * Fetches all user roles
   * @returns Promise with list of user roles
   */
  getUserRoles: async (): Promise<any> => {
    const response = await privateAxios.get(ENDPOINTS.USERS_ROLES);
    return response.data;
  },

  /**
   * Updates a user's role
   * @param user_id The user's ID
   * @param role_id The new role ID
   * @returns Promise with API response
   */
  updateUserRole: async (
    user_id: string,
    role_id: string
  ): Promise<ApiResponse<null>> => {
    const response = await privateAxios.put(ENDPOINTS.USERS_ROLES, {
      user_id,
      role_id,
    });
    return response.data;
  },

  /**
   * Blocks or unblocks a user
   * @param auth0_id The user's Auth0 ID
   * @param action 'block' or 'unblock'
   * @returns Promise with API response
   */
  updateUserStatus: async (
    auth0_id: string,
    action: "block" | "unblock"
  ): Promise<ApiResponse<any>> => {
    const response = await privateAxios.patch(
      `${ENDPOINTS.USERS}/${decodeURI(auth0_id)}`,
      {},
      { params: { action } }
    );
    return response.data;
  },
};

export default userManagerService;
