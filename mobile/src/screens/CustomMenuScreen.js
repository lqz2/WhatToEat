import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { customDishAPI } from "../services/api";

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

const getTagTheme = (index) => {
  const themes = [
    { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
    { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
    { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
    { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
    { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
    { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200" },
    { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
    { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
    { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
    { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
  ];
  return themes[index % themes.length];
};

const getCardTheme = (index) => {
  const themes = [
    { accent: "bg-orange-500", light: "bg-orange-50", border: "border-orange-100" },
    { accent: "bg-emerald-500", light: "bg-emerald-50", border: "border-emerald-100" },
    { accent: "bg-blue-500", light: "bg-blue-50", border: "border-blue-100" },
    { accent: "bg-violet-500", light: "bg-violet-50", border: "border-violet-100" },
    { accent: "bg-rose-500", light: "bg-rose-50", border: "border-rose-100" },
    { accent: "bg-teal-500", light: "bg-teal-50", border: "border-teal-100" },
  ];
  return themes[index % themes.length];
};

export default function CustomMenuScreen() {
  const [dishes, setDishes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchDishes = async () => {
    try {
      const response = await customDishAPI.getDishes();
      setDishes(response.data || []);
    } catch (error) {
      console.log("获取自定义菜品失败:", error.message);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDishes();
    }, []),
  );

  const resetForm = () => {
    setName("");
    setIngredients("");
    setSelectedTags([]);
    setShowForm(false);
  };

  const handleAddDish = async () => {
    if (!name.trim()) {
      Alert.alert("提示", "请输入菜名");
      return;
    }
    if (!ingredients.trim()) {
      Alert.alert("提示", "请输入所需食材");
      return;
    }

    setSubmitting(true);
    const previousDishes = [...dishes];
    const tagsString = selectedTags.join(",");
    const tempDish = {
      id: Date.now(),
      name: name.trim(),
      ingredients: ingredients.trim(),
      tag: tagsString,
      created_at: new Date().toISOString(),
    };
    setDishes((prev) => [tempDish, ...prev]);
    resetForm();

    try {
      await customDishAPI.addDish(tempDish.name, tempDish.ingredients, tempDish.tag);
      // 添加成功后重新拉取列表，获取服务端真实 ID（确保后续删除可用）
      await fetchDishes();
    } catch (error) {
      Alert.alert("错误", "添加菜品失败，请检查网络");
      setDishes(previousDishes);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDish = async (id, dishName) => {
    // Web 平台用 window.confirm，原生平台用 Alert.alert
    let confirmed = false;
    if (Platform.OS === "web") {
      confirmed = window.confirm(`确定要删除「${dishName}」吗？`);
    } else {
      confirmed = await new Promise((resolve) => {
        Alert.alert("删除菜品", `确定要删除「${dishName}」吗？`, [
          { text: "取消", style: "cancel", onPress: () => resolve(false) },
          { text: "删除", style: "destructive", onPress: () => resolve(true) },
        ]);
      });
    }

    if (!confirmed) return;

    // 乐观更新：先从列表中移除
    const previousDishes = [...dishes];
    setDishes((prev) => prev.filter((d) => d.id !== id));

    try {
      await customDishAPI.deleteDish(id);
    } catch (error) {
      console.log("删除失败:", error.response?.status, error.response?.data || error.message);
      // 失败回滚
      setDishes(previousDishes);
      if (Platform.OS === "web") {
        window.alert(`删除失败: ${error.response?.data?.error || error.message}`);
      } else {
        Alert.alert("错误", "删除失败，请检查网络");
      }
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {/* 顶部标题栏 */}
      <View className="bg-white pt-12 pb-4 px-5 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-dark">我的菜单</Text>
            <Text className="text-gray-500 mt-1">记录你喜欢的私房菜</Text>
          </View>
          <TouchableOpacity
            onPress={() => (showForm ? resetForm() : setShowForm(true))}
            className={`px-4 py-2 rounded-full ${showForm ? "bg-gray-200" : "bg-orange-500"}`}
          >
            <Text className={`font-bold ${showForm ? "text-gray-700" : "text-white"}`}>
              {showForm ? "取消" : "+ 添加"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDishes} tintColor="#FF6B35" />}
        keyboardShouldPersistTaps="handled"
      >
        {/* 添加表单 */}
        {showForm && (
          <View className="bg-white mx-4 mt-4 rounded-2xl p-5 border border-orange-100 shadow-sm">
            <Text className="text-base font-bold text-gray-800 mb-4">添加新菜品</Text>

            {/* 菜名 */}
            <Text className="text-sm font-medium text-gray-500 mb-1">菜名</Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-800 border border-gray-200 mb-4"
              placeholder="例如：番茄炒蛋"
              placeholderTextColor="#C4C9D2"
              value={name}
              onChangeText={setName}
              maxLength={50}
            />

            {/* 食材 */}
            <Text className="text-sm font-medium text-gray-500 mb-1">所需食材</Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-800 border border-gray-200 mb-4"
              placeholder="例如：番茄、鸡蛋、葱、盐、糖"
              placeholderTextColor="#C4C9D2"
              value={ingredients}
              onChangeText={setIngredients}
              multiline
              numberOfLines={2}
              maxLength={200}
              textAlignVertical="top"
              style={{ minHeight: 60 }}
            />

            {/* 口味标签 */}
            <Text className="text-sm font-medium text-gray-500 mb-2">口味标签（可选，可多选）</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row flex-wrap">
                {TAG_OPTIONS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  const theme = getTagTheme(TAG_OPTIONS.indexOf(tag));
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() =>
                        setSelectedTags((prev) => (isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]))
                      }
                      className={`px-3 py-1.5 rounded-full mr-2 mb-2 border ${
                        isSelected ? `${theme.bg} ${theme.border}` : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <Text className={`text-sm font-medium ${isSelected ? theme.text : "text-gray-500"}`}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* 提交按钮 */}
            <TouchableOpacity
              onPress={handleAddDish}
              disabled={submitting}
              className={`rounded-xl py-3 items-center ${submitting ? "bg-gray-300" : "bg-orange-500"}`}
            >
              <Text className="text-white font-bold text-base">{submitting ? "添加中..." : "添加菜品"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 菜品列表 */}
        <View className="px-4 mt-4">
          <Text className="text-base font-bold text-gray-800 mb-3">已有菜品 ({dishes.length})</Text>

          {dishes.length > 0 ? (
            dishes.map((dish, index) => {
              const card = getCardTheme(index);
              // tag 可能是逗号分隔字符串，拆分为数组
              const tags = dish.tag ? dish.tag.split(",").filter(Boolean) : [];
              return (
                <View key={dish.id} className={`bg-white rounded-2xl p-4 mb-3 border ${card.border} shadow-sm`}>
                  <View className="flex-row items-start">
                    {/* 左侧色条 */}
                    <View className={`w-1 h-12 rounded-full ${card.accent} mr-3 mt-1`} />
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-lg font-bold text-gray-800 flex-1">{dish.name}</Text>
                        <TouchableOpacity
                          onPress={() => handleDeleteDish(dish.id, dish.name)}
                          className="ml-2 w-7 h-7 items-center justify-center rounded-full bg-red-50"
                        >
                          <Text className="text-red-400 text-sm font-bold">×</Text>
                        </TouchableOpacity>
                      </View>

                      <Text className="text-gray-500 text-sm mt-1">🥬 {dish.ingredients}</Text>

                      {tags.length > 0 && (
                        <View className="flex-row flex-wrap mt-2">
                          {tags.map((t) => {
                            const tagIndex = TAG_OPTIONS.indexOf(t);
                            const tagTheme = tagIndex !== -1 ? getTagTheme(tagIndex) : null;
                            return (
                              <View
                                key={t}
                                className={`px-2 py-0.5 rounded-full border mr-1.5 mb-1 ${
                                  tagTheme ? `${tagTheme.bg} ${tagTheme.border}` : "bg-gray-100 border-gray-200"
                                }`}
                              >
                                <Text className={`text-xs font-medium ${tagTheme ? tagTheme.text : "text-gray-500"}`}>
                                  {t}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View className="py-10 items-center bg-white rounded-2xl border border-gray-100">
              <Text className="text-4xl mb-3">📋</Text>
              <Text className="text-gray-400">还没有添加任何菜品</Text>
              <Text className="text-gray-300 text-sm mt-1">点击上方「+ 添加」记录你的私房菜</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
