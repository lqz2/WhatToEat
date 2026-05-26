import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 从环境变量或常量获取 Supabase 配置
// 部署时替换为你的 Supabase 项目 URL 和 Anon Key
const SUPABASE_URL = "https://nxlobybpzqqcpezmbqyv.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bG9ieWJwenFxY3Blem1icXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDIwNTUsImV4cCI6MjA5NTMxODA1NX0.GfAGFyYRUyICnuatQZt4C3gJKzzRDlaUeeoj89HMvxg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
