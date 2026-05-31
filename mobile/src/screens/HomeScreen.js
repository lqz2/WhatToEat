import React, { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl, SafeAreaView, ActivityIndicator, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { recommendAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function HomeScreen() {
  const { signOut } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await recommendAPI.getRecommendations();
      // 后端返回的是 { "recommendations": "文字建议..." }
      setRecommendations(response.data.recommendations || "");
    } catch (error) {
      console.log("获取推荐失败:", error.message);
      setRecommendations("获取推荐失败，请检查网络或配置。");
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
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <Text className="text-4xl mb-4">👨‍🍳</Text>
          <Text className="text-lg leading-7 text-gray-800">
            {recommendations || "你的冰箱里好像还没有东西，快去添加吧！"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onRefresh}
          className="bg-primary mt-6 py-4 rounded-2xl items-center shadow-md"
        >
          <Text className="text-white text-lg font-bold">换一批推荐</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
}
