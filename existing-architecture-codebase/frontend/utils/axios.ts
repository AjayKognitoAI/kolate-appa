import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

import { signOut } from "@/auth";
import { signOut as ClientSignOut } from "next-auth/react";

// Base API URL from environment variable
const baseURL = process.env.NEXT_PUBLIC_API_URL || "/api";
const frontendBaseURL = process.env.NEXT_PUBLIC_FRONTEND_URL || "/api";
const mlEvalBaseURL = process.env.NEXT_PUBLIC_ML_EVAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "/api";
const patientEnrollmentBaseURL = process.env.NEXT_PUBLIC_PATIENT_ENROLLMENT_API_URL || process.env.NEXT_PUBLIC_API_URL || "/api";

// Public axios instance (no authentication)
export const publicAxios = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds timeout
});

// Private axios instance (with authentication token)
export const privateAxios = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// ML Evaluation Service axios instance (with authentication token)
export const mlEvalAxios = axios.create({
  baseURL: mlEvalBaseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Patient Enrollment Service axios instance (with authentication token)
export const patientEnrollmentAxios = axios.create({
  baseURL: patientEnrollmentBaseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Server-side axios instance that takes token explicitly
export const createServerAxios = (token?: string) => {
  const instance = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    timeout: 30000,
  });

  return instance;
};

// Request interceptor for private axios instance
privateAxios.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig
  ): Promise<InternalAxiosRequestConfig> => {
    // If Authorization header is already set in defaults, use it
    const token = privateAxios.defaults.headers.common.Authorization;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = token as string;
    }
    return config;
  },
  (error: AxiosError): Promise<never> => {
    return Promise.reject(error);
  }
);

// Request interceptor for ML Eval axios instance (shares auth with privateAxios)
mlEvalAxios.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig
  ): Promise<InternalAxiosRequestConfig> => {
    // Use the same auth token as privateAxios
    const token = privateAxios.defaults.headers.common.Authorization;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = token as string;
    }
    return config;
  },
  (error: AxiosError): Promise<never> => {
    return Promise.reject(error);
  }
);

// Request interceptor for Patient Enrollment axios instance (shares auth with privateAxios)
patientEnrollmentAxios.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig
  ): Promise<InternalAxiosRequestConfig> => {
    // Use the same auth token as privateAxios
    const token = privateAxios.defaults.headers.common.Authorization;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = token as string;
    }
    return config;
  },
  (error: AxiosError): Promise<never> => {
    return Promise.reject(error);
  }
);

// --- Refresh token logic ---
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let failedQueue: {
  resolve: (token: string | null) => void;
  reject: (err: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Dummy refreshToken function, replace with your actual implementation
async function refreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${frontendBaseURL}/api/auth/refresh-token`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.accessToken || null;
  } catch (err) {
    return null;
  }
}

// Response interceptor for private axios instance
privateAxios.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  async (error: AxiosError): Promise<never> => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is 401 (Unauthorized) and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshToken()
          .then((newToken) => {
            setAuthorizationHeader(newToken || "");
            processQueue(null, newToken);
            return newToken;
          })
          .catch((refreshError) => {
            processQueue(refreshError, null);
            // Optionally sign out if refresh fails
            if (typeof window === "undefined") {
              return signOut().then(() => null);
            } else {
              return ClientSignOut().then(() => null);
            }
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
          return privateAxios(originalRequest);
        }
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Response interceptor for ML Eval axios instance (same refresh logic)
mlEvalAxios.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  async (error: AxiosError): Promise<never> => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshToken()
          .then((newToken) => {
            setAuthorizationHeader(newToken || "");
            processQueue(null, newToken);
            return newToken;
          })
          .catch((refreshError) => {
            processQueue(refreshError, null);
            if (typeof window === "undefined") {
              return signOut().then(() => null);
            } else {
              return ClientSignOut().then(() => null);
            }
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
          return mlEvalAxios(originalRequest);
        }
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Response interceptor for Patient Enrollment axios instance (same refresh logic)
patientEnrollmentAxios.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  async (error: AxiosError): Promise<never> => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshToken()
          .then((newToken) => {
            setAuthorizationHeader(newToken || "");
            processQueue(null, newToken);
            return newToken;
          })
          .catch((refreshError) => {
            processQueue(refreshError, null);
            if (typeof window === "undefined") {
              return signOut().then(() => null);
            } else {
              return ClientSignOut().then(() => null);
            }
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
          return patientEnrollmentAxios(originalRequest);
        }
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const setAuthorizationHeader = (token: string) => {
  if (token) {
    privateAxios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete privateAxios.defaults.headers.common.Authorization;
  }
};

// Helper function to use throughout the app
// Create a function that defaults to private instance but also exposes both options
const api = Object.assign(
  // Default to private instance when called as api(...)
  privateAxios,
  {
    // Access public and private instances explicitly when needed
    public: {
      get: publicAxios.get.bind(publicAxios),
      post: publicAxios.post.bind(publicAxios),
      put: publicAxios.put.bind(publicAxios),
      delete: publicAxios.delete.bind(publicAxios),
      patch: publicAxios.patch.bind(publicAxios),
    },
    private: {
      get: privateAxios.get.bind(privateAxios),
      post: privateAxios.post.bind(privateAxios),
      put: privateAxios.put.bind(privateAxios),
      delete: privateAxios.delete.bind(privateAxios),
      patch: privateAxios.patch.bind(privateAxios),
    },
  }
);

export { api };
export default api;
