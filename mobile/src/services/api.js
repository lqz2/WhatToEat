import axios from "axios";
import { supabase } from "./supabase";

// 后端 API 地址，部署后替换为公网 URL
const API_BASE_URL = "https://eat.13129988.xyz/api";
// const API_BASE_URL = 'http://localhost:8080/api'; // iOS 模拟器使用此地址
// const API_BASE_URL = 'https://your-deployed-url.com/api'; // 生产环境

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器：自动附加 JWT Token
api.interceptors.request.use(
  async (config) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截器：处理 401 错误
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token 过期，尝试刷新
      const {
        data: { session },
        error: refreshError,
      } = await supabase.auth.refreshSession();
      if (refreshError || !session) {
        // 刷新失败，退出登录
        await supabase.auth.signOut();
        return Promise.reject(error);
      }
      // 使用新 Token 重试
      error.config.headers.Authorization = `Bearer ${session.access_token}`;
      return api.request(error.config);
    }
    return Promise.reject(error);
  },
);

// ========== 认证 API ==========
export const authAPI = {
  register: (email, password) => api.post("/auth/register", { email, password }),
  login: (email, password) => api.post("/auth/login", { email, password }),
};

// ========== 冰箱食材 API ==========
export const fridgeAPI = {
  getFridgeItems: () => api.get("/fridge"),
  addFridgeItem: (name, quantity = "") => api.post("/fridge", { name, quantity }),
  deleteFridgeItem: (id) => api.delete(`/fridge/${id}`),
};

// ========== 推荐与偏好 API ==========
export const recommendAPI = {
  getRecommendations: () => api.get("/recommend"),
  getPreferences: () => api.get("/preferences"),
  createPreference: (cuisine, weight = 1) => api.post("/preferences", { cuisine, weight }),
  deletePreference: (cuisine) => api.delete(`/preferences/${encodeURIComponent(cuisine)}`),
};

// ========== 共享 API ==========
export const shareAPI = {
  shareMenu: (email) => api.post("/share", { shared_with_email: email }),
  cancelShare: (id) => api.delete(`/share/${id}`),
  getSharedList: () => api.get("/shared"),
};

export default api;
