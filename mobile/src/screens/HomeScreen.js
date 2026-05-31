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
import { useFocusEffect } from "@react-navigation/native";
import { recommendAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function HomeScreen() {
  const { signOut } = useAuth();
  const [recommendData, setRecommendData] = useState({ type: "text", data: "" });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await recommendAPI.getRecommendations();
      // 获取到新的结构 { type: "list", data: [...] } 或 { type: "text", data: "..." }
      if (response.data) {
        setRecommendData(response.data);
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
      fetchRecommendations();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecommendations();
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
        <TouchableOpacity onPress={signOut} className="bg-gray-100 p-2 rounded-full">
          <Text className="text-base">退出</Text>
        </TouchableOpacity>
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
