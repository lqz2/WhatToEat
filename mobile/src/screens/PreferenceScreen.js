import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Alert, FlatList, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { recommendAPI } from "../services/api";

const CUISINE_OPTIONS = [
  "川菜",
  "粤菜",
  "湘菜",
  "鲁菜",
  "浙菜",
  "闽菜",
  "苏菜",
  "徽菜",
  "东北菜",
  "家常菜",
  "西餐",
  "日料",
  "韩餐",
  "东南亚菜",
  "其他",
];

export default function PreferenceScreen() {
  const [preferences, setPreferences] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPreferences = async () => {
    try {
      const response = await recommendAPI.getPreferences();
      setPreferences(response.data || []);
    } catch (error) {
      console.log("获取偏好失败:", error.message);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPreferences();
    }, []),
  );

  const handleAddPreference = async (cuisine) => {
    try {
      await recommendAPI.createPreference(cuisine, 1);
      fetchPreferences();
    } catch (error) {
      Alert.alert("错误", "添加偏好失败");
    }
  };

  const handleRemovePreference = async (cuisine) => {
    try {
      await recommendAPI.deletePreference(cuisine);
      fetchPreferences();
    } catch (error) {
      Alert.alert("错误", "删除偏好失败");
    }
  };

  const handleWeightChange = async (cuisine, newWeight) => {
    try {
      await recommendAPI.createPreference(cuisine, newWeight);
      fetchPreferences();
    } catch (error) {
      Alert.alert("错误", "更新权重失败");
    }
  };

  const preferredCuisines = preferences.map((p) => p.cuisine);
  const availableCuisines = CUISINE_OPTIONS.filter((c) => !preferredCuisines.includes(c));

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white pt-12 pb-4 px-5 border-b border-gray-100">
        <Text className="text-2xl font-bold text-dark">口味偏好</Text>
        <Text className="text-gray-500 mt-1">设置你喜欢的菜系，获取个性化推荐</Text>
      </View>

      <FlatList
        data={preferences}
        keyExtractor={(item) => item.id.toString()}
        contentContainerClassName="p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchPreferences} tintColor="#FF6B35" />}
        ListHeaderComponent={
          preferences.length > 0 ? (
            <Text className="text-sm font-medium text-gray-600 mb-3">已选菜系（点击 +/- 调整权重）</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View className="bg-white rounded-xl p-4 mb-3 flex-row items-center justify-between border border-gray-100">
            <View className="flex-row items-center flex-1">
              <View className="bg-primary/10 px-3 py-1.5 rounded-full mr-3">
                <Text className="text-primary font-medium">{item.cuisine}</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-gray-500 text-sm mr-2">权重: {item.weight}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <TouchableOpacity
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-2"
                onPress={() => handleWeightChange(item.cuisine, Math.max(1, item.weight - 1))}
              >
                <Text className="text-gray-600 font-bold">-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center mr-3"
                onPress={() => handleWeightChange(item.cuisine, item.weight + 1)}
              >
                <Text className="text-primary font-bold">+</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleRemovePreference(item.cuisine)}>
                <Text className="text-red-500 text-lg">✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="py-10 items-center">
            <Text className="text-4xl mb-3">🎯</Text>
            <Text className="text-gray-500">还没有设置口味偏好</Text>
            <Text className="text-gray-400 text-sm mt-1">从下方选择你喜欢的菜系</Text>
          </View>
        }
      />

      {/* 添加菜系 */}
      {availableCuisines.length > 0 && (
        <View className="bg-white border-t border-gray-100 p-4">
          <Text className="text-sm font-medium text-gray-600 mb-3">添加菜系偏好</Text>
          <View className="flex-row flex-wrap">
            {availableCuisines.map((cuisine) => (
              <TouchableOpacity
                key={cuisine}
                className="bg-gray-100 px-3 py-2 rounded-full mr-2 mb-2"
                onPress={() => handleAddPreference(cuisine)}
              >
                <Text className="text-gray-700">{cuisine}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
