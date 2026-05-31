import React, { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, RefreshControl, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { dishAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function DishListScreen({ navigation }) {
  const { user } = useAuth();
  const [dishes, setDishes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDishes = async () => {
    try {
      const response = await dishAPI.getDishes();
      setDishes(response.data || []);
    } catch (error) {
      console.log("获取菜品失败:", error.message);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDishes();
    }, []),
  );

  const handleDelete = (id, name) => {
    const performDelete = async () => {
      try {
        await dishAPI.deleteDish(id);
        fetchDishes();
      } catch (error) {
        Alert.alert("错误", "删除失败 123");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`确定要删除"${name}"吗？`)) {
        performDelete();
      }
    } else {
      Alert.alert("确认删除", `确定要删除"${name}"吗？`, [
        { text: "取消", style: "cancel" },
        {
          text: "删除",
          style: "destructive",
          onPress: performDelete,
        },
      ]);
    }
  };

  const handleToggleFavorite = async (id) => {
    try {
      await dishAPI.toggleFavorite(id);
      fetchDishes();
    } catch (error) {
      Alert.alert("错误", "操作失败");
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDishes();
  };

  const isOwnDish = (dish) => dish.user_id === user?.id;

  const renderDishItem = ({ item }) => {
    const own = isOwnDish(item);
    return (
      <View className={`bg-white rounded-xl p-4 mb-3 border ${own ? "border-gray-100" : "border-blue-100"}`}>
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-base font-semibold text-gray-800">{item.name}</Text>
              {item.is_favorite && <Text className="ml-1">❤️</Text>}
              {!own && (
                <View className="bg-blue-50 px-2 py-0.5 rounded-full ml-2">
                  <Text className="text-blue-500 text-xs">共享</Text>
                </View>
              )}
            </View>
            <View className="flex-row items-center mt-1">
              <View className="bg-primary/10 px-2 py-0.5 rounded-full mr-2">
                <Text className="text-primary text-xs">{item.cuisine}</Text>
              </View>
              {item.tags?.map((tag, index) => (
                <View key={index} className="bg-gray-100 px-2 py-0.5 rounded-full mr-1">
                  <Text className="text-gray-500 text-xs">{tag}</Text>
                </View>
              ))}
            </View>
            {item.description && (
              <Text className="text-gray-400 text-xs mt-1" numberOfLines={1}>
                {item.description}
              </Text>
            )}
          </View>

          {own && (
            <View className="flex-row">
              <TouchableOpacity className="p-2 mr-1" onPress={() => handleToggleFavorite(item.id)}>
                <Text className="text-lg">{item.is_favorite ? "💔" : "🤍"}</Text>
              </TouchableOpacity>
              <TouchableOpacity className="p-2 mr-1" onPress={() => navigation.navigate("AddDish", { dish: item })}>
                <Text className="text-lg">✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity className="p-2" onPress={() => handleDelete(item.id, item.name)}>
                <Text className="text-lg">🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white pt-12 pb-4 px-5 border-b border-gray-100 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-dark">我的菜单</Text>
          <Text className="text-gray-500 mt-1">{dishes.length} 道菜品</Text>
        </View>
        <TouchableOpacity className="bg-primary px-4 py-2 rounded-xl" onPress={() => navigation.navigate("AddDish")}>
          <Text className="text-white font-semibold">+ 添加</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={dishes}
        renderItem={renderDishItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerClassName="p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-4xl mb-3">📝</Text>
            <Text className="text-gray-500 text-center">还没有添加菜品{"\n"}点击上方"添加"按钮开始</Text>
          </View>
        }
      />
    </View>
  );
}
