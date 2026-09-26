import axios from "axios";
import Cookies from "js-cookie";

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    const url = process.env.NEXT_PUBLIC_API_URL;
    return url;
  }
  
  return "http://localhost:8000";
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  }
  if (config.url && !config.url.startsWith("http")) {
    config.url = config.url.startsWith("/") ? config.url : `/${config.url}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      Cookies.remove("access_token");
      Cookies.remove("refresh_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export interface Post {
  id: number;
  name: string;
  description?: string;
  price: string;
  image_s3_key?: string;
  image_bw_s3_key?: string;
  image_thumbnail_s3_key?: string;
  image_url?: string;
  bw_image_url?: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface Profile {
  id: number;
  user: number;
  username: string;
  email: string;
  age?: number | null;
  course?: string | null;
  city?: string | null;
  created_at: string;
  updated_at: string;
}

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await api.post("/auth/token/", { username, password });
    return response.data;
  },

  register: async (data: RegisterData): Promise<{ message: string }> => {
    const response = await api.post("/auth/register/", data);
    return response.data;
  },

  refreshToken: async (refresh: string): Promise<LoginResponse> => {
    const response = await api.post("/auth/token/refresh/", { refresh });
    return response.data;
  },
};

export const productsApi = {
  list: async (): Promise<Post[]> => {
    const response = await api.get("/posts/");
    return response.data.results || response.data;
  },

  get: async (id: number): Promise<Post> => {
    const response = await api.get(`/posts/${id}/`);
    return response.data;
  },

  create: async (data: Omit<Post, "id" | "created_at" | "updated_at">): Promise<Post> => {
    const response = await api.post("/posts/", data);
    return response.data;
  },

  update: async (id: number, data: Partial<Post>): Promise<Post> => {
    const response = await api.patch(`/posts/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/posts/${id}/`);
  },

  uploadImage: async (id: number, file: File): Promise<{ message: string; s3_key: string; image_url: string }> => {
    const formData = new FormData();
    formData.append("image", file);
    const uploadApi = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        Authorization: `Bearer ${Cookies.get("access_token")}`,
      },
    });
    const response = await uploadApi.post(`/posts/${id}/upload-image/`, formData);
    return response.data;
  },
};

export const profileApi = {
  get: async (): Promise<Profile> => {
    const response = await api.get("/auth/profile/");
    return response.data;
  },

  update: async (data: Partial<Profile>): Promise<Profile> => {
    const response = await api.patch("/auth/profile/", data);
    return response.data;
  },
};

export interface Log {
  id: string;
  action_type: string;
  model_name: string;
  data?: string;
  timestamp: string;
  user_id?: string;
  ip_address?: string;
  username?: string;
  path?: string;
  method?: string;
}

export const logsApi = {
  list: async (params?: {
    limit?: number;
    action_type?: string;
    model_name?: string;
  }): Promise<{ logs: Log[]; count: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.action_type) queryParams.append("action_type", params.action_type);
    if (params?.model_name) queryParams.append("model_name", params.model_name);

    const queryString = queryParams.toString();
    const url = `/logs/${queryString ? `?${queryString}` : ""}`;
    const response = await api.get(url);
    return response.data;
  },
};
