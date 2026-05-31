import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { recommendAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [recommendData, setRecommendData] = useState({ type: "text", data: "" });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const CACHE_KEY = "CACHED_RECOMMENDATIONS_" + user?.id;
  const CACHE_TIME_KEY = "CACHED_RECOMMENDATIONS_TIME_" + user?.id;
  const SIX_HOURS = 6 * 60 * 60 * 1000; // 6 小时的毫秒数

  const fetchRecommendations = async (forceRefresh = false) => {
    setLoading(true);
    try {
      // 如果不是强制刷新，先检查缓存
      if (!forceRefresh) {
        const cachedTimeStr = await AsyncStorage.getItem(CACHE_TIME_KEY);
        if (cachedTimeStr) {
          const cachedTime = parseInt(cachedTimeStr, 10);
          const now = Date.now();

          // 如果更新时间距今未超过 6 小时，直接使用缓存
          if (now - cachedTime < SIX_HOURS) {
            const cachedDataStr = await AsyncStorage.getItem(CACHE_KEY);
            if (cachedDataStr) {
              setRecommendData(JSON.parse(cachedDataStr));
              setLoading(false);
              setRefreshing(false);
              return; // 结束函数，不再调用后端 API
            }
          }
        }
      }

      const response = await recommendAPI.getRecommendations();
      // 获取到新的结构 { type: "list", data: [...] } 或 { type: "text", data: "..." }
      if (response.data) {
        setRecommendData(response.data);
        // 保存到缓存和记录当前时间
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(response.data));
        await AsyncStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      }
    } catch (error) {
      console.log("获取推荐失败:", error.message);
      setRecommendData({ type: "text", data: "获取推荐失败，请检查网络或配置。" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRecommendations(false); // 切换页面时，不强制刷新，优先走缓存
    }, [user?.id]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecommendations(true); // 用户手动点击"换一批"或下拉刷新时，强制请求 LLM
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-gray-500 mt-2">智能大模型正在分析你的冰箱...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white pt-12 pb-4 px-5 border-b border-gray-100 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-dark">今日 AI 推荐</Text>
          <Text className="text-gray-500 mt-1">基于你冰箱里的食材</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
      >
        {recommendData.type === "list" ? (
          recommendData.data.map((item, index) => (
            <View key={index} className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center mb-3">
                <View className="bg-primary/10 w-8 h-8 rounded-full items-center justify-center mr-3">
                  <Text className="text-primary font-bold">{index + 1}</Text>
                </View>
                <Text className="text-xl font-bold text-gray-800 flex-1">{item.name}</Text>
              </View>

              <View className="bg-orange-50/50 p-3 rounded-xl mb-3">
                <Text className="text-gray-600 text-sm leading-5">
                  <Text className="font-semibold text-orange-700">推荐理由：</Text>
                  {item.reason}
                </Text>
              </View>

              <Text className="text-gray-700 leading-6">
                <Text className="font-semibold text-gray-900">👩‍🍳 做法提示：</Text>
                {item.steps}
              </Text>
            </View>
          ))
        ) : (
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <Text className="text-4xl mb-4">👨‍🍳</Text>
            <Text className="text-lg leading-7 text-gray-800">
              {recommendData.data || "你的冰箱里好像还没有东西，快去添加吧！"}
            </Text>
          </View>
        )}

        <TouchableOpacity onPress={onRefresh} className="bg-primary mt-2 mb-10 py-4 rounded-2xl items-center shadow-md">
          <Text className="text-white text-lg font-bold">换一批推荐</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
