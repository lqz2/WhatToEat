import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { fridgeAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function FridgeScreen({ navigation }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // 添加食材的 Modal 状态
  const [modalVisible, setModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchItems = async () => {
    try {
      const response = await fridgeAPI.getFridgeItems();
      setItems(response.data || []);
    } catch (error) {
      console.log("获取食材失败:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, []),
  );

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert("错误", "请输入食材名称");
      return;
    }
    setIsAdding(true);
    
    // 1. 乐观更新（Optimistic Update）：提前更新UI，不等待网络请求
    const optimisticItem = {
      id: "temp-" + Date.now(), // 临时ID
      user_id: user?.id,
      name: newItemName.trim(),
      quantity: newItemQuantity.trim(),
    };
    
    setItems((prevItems) => [optimisticItem, ...prevItems]);
    
    // 关闭弹窗并清空状态，让用户感觉瞬间完成
    setModalVisible(false);
    setNewItemName("");
    setNewItemQuantity("");

    // 2. 发起真实的网络请求
    try {
      await fridgeAPI.addFridgeItem(optimisticItem.name, optimisticItem.quantity);
      // 成功后静默拉取真实数据重新赋值ID
      fetchItems();
    } catch (error) {
      // 若请求失败，则撤回乐观更新并报错
      Alert.alert("错误", "添加失败，可能是网络问题");
      setItems((prevItems) => prevItems.filter(item => item.id !== optimisticItem.id));
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = (id, name) => {
    const performDelete = async () => {
      // 1. 乐观更新：立刻在列表中移除该项
      const previousItems = [...items];
      setItems((prevItems) => prevItems.filter((item) => item.id !== id));
      
      // 2. 异步向服务器发送删除请求
      try {
        await fridgeAPI.deleteFridgeItem(id);
      } catch (error) {
        // 请求如果失败，把数据恢复回去，并提示
        Alert.alert("错误", "删除失败咯");
        setItems(previousItems);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`确认食材 "${name}" 已用完？`)) performDelete();
    } else {
      Alert.alert("确认", `确认食材 "${name}" 已用完？`, [
        { text: "取消", style: "cancel" },
        { text: "是的", style: "destructive", onPress: performDelete },
      ]);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const renderItem = ({ item }) => {
    const isOwn = item.user_id === user?.id;
    return (
      <View
        className={`bg-white rounded-2xl p-4 mb-3 shadow-sm border ${isOwn ? "border-gray-100" : "border-blue-100"}`}
      >
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-lg font-bold text-gray-800">{item.name}</Text>
              {!isOwn && (
                <View className="bg-blue-50 px-2 py-0.5 rounded-full ml-2">
                  <Text className="text-blue-500 text-xs text-center">共享</Text>
                </View>
              )}
            </View>
            <Text className="text-gray-500 mt-1">{item.quantity || "数量不详"}</Text>
          </View>
          {isOwn && (
            <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} className="bg-red-50 p-2 rounded-full">
              <Text className="text-red-500">消耗</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white pt-12 pb-4 px-5 border-b border-gray-100 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-dark">我的冰箱</Text>
          <Text className="text-gray-500 mt-1">共有 {items.length} 种食材</Text>
        </View>
        <TouchableOpacity className="bg-primary px-4 py-2 rounded-xl" onPress={() => setModalVisible(true)}>
          <Text className="text-white font-semibold">+ 塞进冰箱</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerClassName="p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-4xl mb-3">🥦</Text>
            <Text className="text-gray-500 text-center">冰箱是空的
快去超市买点菜吧</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-dark">添加新食材</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text className="text-gray-400 text-lg">关闭</Text>
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">食材名称</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50"
                placeholder="例如：西红柿、鸡蛋..."
                value={newItemName}
                onChangeText={setNewItemName}
              />
            </View>

            <View className="mb-8">
              <Text className="text-sm font-medium text-gray-700 mb-2">数量/备注</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50"
                placeholder="例如：2个、一瓶..."
                value={newItemQuantity}
                onChangeText={setNewItemQuantity}
              />
            </View>

            <TouchableOpacity
              className={`py-4 rounded-xl items-center ${isAdding ? "bg-gray-300" : "bg-primary"}`}
              onPress={handleAddItem}
              disabled={isAdding}
            >
              <Text className="text-white text-lg font-bold">{isAdding ? "正在塞进冰箱..." : "确认添加"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
