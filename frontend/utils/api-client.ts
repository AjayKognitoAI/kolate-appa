/**
 * Unified API Client for Consolidated FastAPI Backend
 *
 * This module provides a single axios instance for all API calls to the
 * consolidated backend, replacing the multiple service-specific instances.
 *
 * Migration: Spring Boot Microservices → FastAPI Consolidated Backend
 */

import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosInstance,
} from "axios";
import { signOut } from "@/auth";
import { signOut as ClientSignOut } from "next-auth/react";

// =============================================================================
// Configuration
// =============================================================================

/**
 * API Base URL - Points to consolidated FastAPI backend
 * Old: Multiple URLs for different microservices
 * New: Single consolidated backend URL
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * API Version prefix
 */
export const API_VERSION = "/api/v1";

/**
 * Full API URL
 */
export const API_URL = `${API_BASE_URL}${API_VERSION}`;

/**
 * Frontend URL for internal API routes (NextAuth, etc.)
 */
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "";

/**
 * Request timeout in milliseconds
 */
const DEFAULT_TIMEOUT = 30000;

// =============================================================================
// Axios Instance Configuration
// =============================================================================

/**
 * Create a configured axios instance with common settings
 */
const createAxiosInstance = (baseURL: string): AxiosInstance => {
  return axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    timeout: DEFAULT_TIMEOUT,
  });
};

/**
 * Public API client (no authentication required)
 */
export const publicApi = createAxiosInstance(API_BASE_URL);

/**
 * Private API client (authentication required)
 * This is the main client for authenticated requests
 */
export const privateApi = createAxiosInstance(API_BASE_URL);

/**
 * Server-side API client factory
 * Creates an axios instance with token already set (for SSR/API routes)
 */
export const createServerApi = (token?: string): AxiosInstance => {
  const instance = createAxiosInstance(API_BASE_URL);
  if (token) {
    instance.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
  return instance;
};

// =============================================================================
// Token Refresh Logic
// =============================================================================

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let failedQueue: {
  resolve: (token: string | null) => void;
  reject: (err: unknown) => void;
}[] = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Refresh the access token via NextAuth
 */
async function refreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${FRONTEND_URL}/api/auth/refresh-token`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.accessToken || null;
  } catch {
    return null;
  }
}

/**
 * Handle sign out on authentication failure
 */
async function handleSignOut(): Promise<null> {
  if (typeof window === "undefined") {
    await signOut();
  } else {
    await ClientSignOut();
  }
  return null;
}

// =============================================================================
// Request Interceptors
// =============================================================================

/**
 * Add authorization header to requests
 */
const addAuthorizationHeader = async (
  config: InternalAxiosRequestConfig
): Promise<InternalAxiosRequestConfig> => {
  const token = privateApi.defaults.headers.common.Authorization;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = token as string;
  }
  return config;
};

/**
 * Handle request errors
 */
const handleRequestError = (error: AxiosError): Promise<never> => {
  return Promise.reject(error);
};

// Apply request interceptor to private API
privateApi.interceptors.request.use(addAuthorizationHeader, handleRequestError);

// =============================================================================
// Response Interceptors
// =============================================================================

/**
 * Create a response interceptor with token refresh logic
 */
const createResponseInterceptor = (instance: AxiosInstance) => {
  return instance.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => response,
    async (error: AxiosError): Promise<never> => {
      const originalRequest = error.config as AxiosRequestConfig & {
        _retry?: boolean;
      };

      // Handle 401 Unauthorized - attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = refreshToken()
            .then((newToken) => {
              setAuthToken(newToken || "");
              processQueue(null, newToken);
              return newToken;
            })
            .catch((refreshError) => {
              processQueue(refreshError, null);
              return handleSignOut();
            })
            .finally(() => {
              isRefreshing = false;
              refreshPromise = null;
            });
        }

        try {
          const newToken = await new Promise<string | null>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });

          if (newToken) {
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${newToken}`,
            };
            return instance(originalRequest);
          }
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
};

// Apply response interceptor to private API
createResponseInterceptor(privateApi);

// =============================================================================
// Token Management
// =============================================================================

/**
 * Set the authorization token for all authenticated requests
 */
export const setAuthToken = (token: string): void => {
  if (token) {
    privateApi.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete privateApi.defaults.headers.common.Authorization;
  }
};

/**
 * Clear the authorization token
 */
export const clearAuthToken = (): void => {
  delete privateApi.defaults.headers.common.Authorization;
};

/**
 * Get the current authorization token
 */
export const getAuthToken = (): string | undefined => {
  return privateApi.defaults.headers.common.Authorization as string | undefined;
};

// =============================================================================
// API Client Class (for object-oriented usage)
// =============================================================================

/**
 * Unified API Client class
 * Provides a clean interface for making API calls to the consolidated backend
 */
export class ApiClient {
  private instance: AxiosInstance;

  constructor(authenticated: boolean = true) {
    this.instance = authenticated ? privateApi : publicApi;
  }

  /**
   * Build full API path with version prefix
   */
  private buildPath(endpoint: string): string {
    // If endpoint already starts with /api/v1, use as-is
    if (endpoint.startsWith(API_VERSION)) {
      return endpoint;
    }
    // If endpoint starts with /api but not /api/v1, replace /api with /api/v1
    if (endpoint.startsWith("/api/") && !endpoint.startsWith("/api/v1/")) {
      return endpoint.replace("/api/", `${API_VERSION}/`);
    }
    // Otherwise, prepend API_VERSION
    return `${API_VERSION}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  }

  async get<T = unknown>(
    endpoint: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.get<T>(this.buildPath(endpoint), config);
    return response.data;
  }

  async post<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.post<T>(
      this.buildPath(endpoint),
      data,
      config
    );
    return response.data;
  }

  async put<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.put<T>(
      this.buildPath(endpoint),
      data,
      config
    );
    return response.data;
  }

  async patch<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.patch<T>(
      this.buildPath(endpoint),
      data,
      config
    );
    return response.data;
  }

  async delete<T = unknown>(
    endpoint: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.delete<T>(
      this.buildPath(endpoint),
      config
    );
    return response.data;
  }

  /**
   * Upload file with multipart/form-data
   */
  async upload<T = unknown>(
    endpoint: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.post<T>(this.buildPath(endpoint), formData, {
      ...config,
      headers: {
        ...config?.headers,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }
}

// =============================================================================
// Default Export - Backward Compatible API Object
// =============================================================================

/**
 * Default API object for backward compatibility
 * Maintains the same interface as the old axios setup
 */
const api = Object.assign(privateApi, {
  public: {
    get: publicApi.get.bind(publicApi),
    post: publicApi.post.bind(publicApi),
    put: publicApi.put.bind(publicApi),
    delete: publicApi.delete.bind(publicApi),
    patch: publicApi.patch.bind(publicApi),
  },
  private: {
    get: privateApi.get.bind(privateApi),
    post: privateApi.post.bind(privateApi),
    put: privateApi.put.bind(privateApi),
    delete: privateApi.delete.bind(privateApi),
    patch: privateApi.patch.bind(privateApi),
  },
});

export { api };
export default api;

// =============================================================================
// Singleton instances for common use cases
// =============================================================================

/**
 * Pre-configured API client instance (authenticated)
 */
export const apiClient = new ApiClient(true);

/**
 * Pre-configured public API client instance (unauthenticated)
 */
export const publicApiClient = new ApiClient(false);
