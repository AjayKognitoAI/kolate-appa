import { privateAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

const ENDPOINTS = API_CONFIG.USER_MANAGER;

export interface CreateUserRequest {
  auth0_id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  email: string;
  mobile: string;
}

export interface User {
  id: string;
  auth0_id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  email: string;
  mobile: string;
}

export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

export const userService = {
  /**
   * Creates a new user.
   * @param data User creation payload
   * @returns Promise with created user data
   */
  createUser: async (data: CreateUserRequest): Promise<ApiResponse<User>> => {
    const response = await privateAxios.post(ENDPOINTS.USER, data);
    return response.data;
  },

  /**
   * Retrieves a user by auth0_id.
   * @param auth0_id The Auth0 user ID
   * @returns Promise with user data
   */
  getUserByAuth0Id: async (auth0_id: string): Promise<ApiResponse<User>> => {
    const response = await privateAxios.get(ENDPOINTS.USER, {
      params: { auth0_id: decodeURI(auth0_id ?? "") },
    });
    return response.data;
  },
};

export default userService;
