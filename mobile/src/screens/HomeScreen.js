import React, { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { recommendAPI } from "../services/api";

export default function HomeScreen() {
  const [recommendations, setRecommendations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = async () => {
    try {
      const response = await recommendAPI.getRecommendations();
      setRecommendations(response.data || []);
    } catch (error) {
      console.log("获取推荐失败:", error.message);
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

  const renderDishCard = ({ item }) => (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-lg font-bold text-gray-800">{item.name}</Text>
            {item.is_favorite && <Text className="ml-2 text-lg">❤️</Text>}
          </View>
          <View className="flex-row items-center mt-1">
            <View className="bg-primary/10 px-2 py-0.5 rounded-full mr-2">
              <Text className="text-primary text-xs font-medium">{item.cuisine}</Text>
            </View>
            {item.tags?.map((tag, index) => (
              <View key={index} className="bg-gray-100 px-2 py-0.5 rounded-full mr-1">
                <Text className="text-gray-600 text-xs">{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      {item.description ? (
        <Text className="text-gray-500 text-sm mt-2" numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-500">加载中...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white pt-12 pb-4 px-5 border-b border-gray-100">
        <Text className="text-2xl font-bold text-dark">今天吃什么</Text>
        <Text className="text-gray-500 mt-1">根据你的口味推荐</Text>
      </View>

      <FlatList
        data={recommendations}
        renderItem={renderDishCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerClassName="p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-4xl mb-3">🍜</Text>
            <Text className="text-gray-500 text-center">
              {recommendations.length === 0 ? '还没有菜品\n去"我的菜单"添加菜品吧！' : "暂无推荐"}
            </Text>
          </View>
        }
      />
    </View>
  );
}
