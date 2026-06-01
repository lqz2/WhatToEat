import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI } from "../services/api";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从 AsyncStorage 初始化 session 和 user
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        const userInfoStr = await AsyncStorage.getItem("user_info");

        if (token && userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          setSession({ access_token: token });
          setUser(userInfo);
        }
      } catch (e) {
        console.error("恢复登录状态失败:", e);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const signUp = async (email, password) => {
    try {
      const response = await authAPI.register(email, password);
      const data = response.data; // models.AuthResponse: access_token, user_id, email

      // 保存至本地存储
      await AsyncStorage.setItem("auth_token", data.access_token);
      const userInfo = { id: data.user_id, email: data.email };
      await AsyncStorage.setItem("user_info", JSON.stringify(userInfo));

      // 更新状态
      setSession({ access_token: data.access_token });
      setUser(userInfo);
      return data;
    } catch (error) {
      // 兼容原有的错误格式
      const errorMsg = error.response?.data?.error || error.message || "注册失败";
      throw new Error(errorMsg);
    }
  };

  const signIn = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const data = response.data; // models.AuthResponse: access_token, user_id, email

      // 保存至本地存储
      await AsyncStorage.setItem("auth_token", data.access_token);
      const userInfo = { id: data.user_id, email: data.email };
      await AsyncStorage.setItem("user_info", JSON.stringify(userInfo));

      // 更新状态
      setSession({ access_token: data.access_token });
      setUser(userInfo);
      return data;
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || "登录失败";
      throw new Error(errorMsg);
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.multiRemove(["auth_token", "user_info"]);
      setSession(null);
      setUser(null);
    } catch (error) {
      throw new Error("退出登录失败");
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
