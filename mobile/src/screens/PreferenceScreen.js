import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Alert, RefreshControl, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { recommendAPI } from "../services/api";

const TAG_OPTIONS = [
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
  "偏辣",
  "偏甜",
  "偏酸",
  "清淡",
  "少油",
  "重口味",
  "无辣不欢",
  "减脂餐",
  "其他",
];

const getColorTheme = (index) => {
  const themes = [
    { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
    { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
    { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
    { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
    { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
    { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
    { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200" },
    { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
    { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
    { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
    { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
    { bg: "bg-fuchsia-100", text: "text-fuchsia-700", border: "border-fuchsia-200" },
    { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
    { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
  ];
  return themes[index % themes.length];
};

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
    // 1. 乐观更新：立刻将新标签加入列表
    const previousPreferences = [...preferences];
    setPreferences((prev) => [...prev, { cuisine, weight: 1 }]);

    // 2. 异步向服务器发送请求
    try {
      await recommendAPI.createPreference(cuisine, 1);
      // 成功后静默拉取一下确保数据一致性 (不阻塞UI)
      fetchPreferences();
    } catch (error) {
      // 发生错误，回退状态
      Alert.alert("错误", "添加偏好失败，请检查网络");
      setPreferences(previousPreferences);
    }
  };

  const handleRemovePreference = async (cuisine) => {
    // 1. 乐观更新：立刻将该标签从列表中移除
    const previousPreferences = [...preferences];
    setPreferences((prev) => prev.filter((p) => p.cuisine !== cuisine));

    // 2. 异步向服务器发送请求
    try {
      await recommendAPI.deletePreference(cuisine);
      fetchPreferences();
    } catch (error) {
      // 发生错误，回退状态
      Alert.alert("错误", "删除偏好失败，请检查网络");
      setPreferences(previousPreferences);
    }
  };

  const preferredCuisines = preferences.map((p) => p.cuisine);
  const availableCuisines = TAG_OPTIONS.filter((c) => !preferredCuisines.includes(c));

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white pt-12 pb-4 px-5 border-b border-gray-100">
        <Text className="text-2xl font-bold text-dark">口味偏好</Text>
        <Text className="text-gray-500 mt-1">定制你的专属 AI 私厨标签</Text>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchPreferences} tintColor="#FF6B35" />}
      >
        <View className="p-5">
          <Text className="text-base font-bold text-gray-800 mb-4">已选标签 (点击取消)</Text>
          {preferredCuisines.length > 0 ? (
            <View className="flex-row flex-wrap">
              {preferredCuisines.map((item, index) => {
                const tagIndex = TAG_OPTIONS.indexOf(item);
                const theme = getColorTheme(tagIndex !== -1 ? tagIndex : index);
                return (
                  <TouchableOpacity
                    key={item}
                    className={`px-4 py-2 rounded-full mr-3 mb-3 border ${theme.bg} ${theme.border} shadow-sm`}
                    onPress={() => handleRemovePreference(item)}
                  >
                    <Text className={`text-base font-bold ${theme.text}`}>{item} ×</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="py-6 items-center bg-white rounded-2xl border border-gray-100 mb-4">
              <Text className="text-3xl mb-2">🍽️</Text>
              <Text className="text-gray-400">目前还没有选择任何偏好标签</Text>
            </View>
          )}

          <Text className="text-base font-bold text-gray-800 mt-6 mb-4">添加更多标签</Text>
          <View className="flex-row flex-wrap">
            {availableCuisines.map((cuisine) => {
              const theme = getColorTheme(TAG_OPTIONS.indexOf(cuisine));
              return (
                <TouchableOpacity
                  key={cuisine}
                  className="bg-white px-4 py-2 rounded-full mr-3 mb-3 border border-gray-200 shadow-sm"
                  onPress={() => handleAddPreference(cuisine)}
                >
                  <Text className="text-base font-medium text-gray-600">{cuisine} +</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
