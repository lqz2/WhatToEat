import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { shareAPI } from "../services/api";

export default function ShareScreen() {
  const [sharedList, setSharedList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchSharedList = async () => {
    try {
      const response = await shareAPI.getSharedList();
      setSharedList(response.data || []);
    } catch (error) {
      console.log("获取共享列表失败:", error.message);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSharedList();
    }, []),
  );

  const handleShare = async () => {
    if (!email.trim()) {
      Alert.alert("错误", "请输入对方邮箱");
      return;
    }

    setAdding(true);
    try {
      await shareAPI.shareMenu(email.trim());
      Alert.alert("成功", `已共享菜单给 ${email}`);
      setEmail("");
      fetchSharedList();
    } catch (error) {
      Alert.alert("错误", error.response?.data?.error || "共享失败");
    } finally {
      setAdding(false);
    }
  };

  const handleCancelShare = (id, email) => {
    Alert.alert("取消共享", `确定要取消与 ${email} 的共享吗？`, [
      { text: "取消", style: "cancel" },
      {
        text: "确定",
        style: "destructive",
        onPress: async () => {
          try {
            await shareAPI.cancelShare(id);
            fetchSharedList();
          } catch (error) {
            Alert.alert("错误", "取消共享失败");
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View className="bg-white pt-12 pb-4 px-5 border-b border-gray-100">
        <Text className="text-2xl font-bold text-dark">菜单共享</Text>
        <Text className="text-gray-500 mt-1">与家人朋友共享你的菜单</Text>
      </View>

      {/* 添加共享 */}
      <View className="bg-white p-4 border-b border-gray-100">
        <Text className="text-sm font-medium text-gray-600 mb-2">共享给好友（输入对方邮箱）</Text>
        <View className="flex-row">
          <TextInput
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base bg-gray-50 mr-3"
            placeholder="好友的邮箱地址"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            className={`rounded-xl px-5 justify-center ${adding ? "bg-gray-400" : "bg-primary"}`}
            onPress={handleShare}
            disabled={adding}
          >
            <Text className="text-white font-semibold">{adding ? "..." : "共享"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 共享列表 */}
      <FlatList
        data={sharedList}
        keyExtractor={(item) => item.id.toString()}
        contentContainerClassName="p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchSharedList} tintColor="#FF6B35" />}
        ListHeaderComponent={
          sharedList.length > 0 ? <Text className="text-sm font-medium text-gray-600 mb-3">共享记录</Text> : null
        }
        renderItem={({ item }) => (
          <View className="bg-white rounded-xl p-4 mb-3 flex-row items-center justify-between border border-gray-100">
            <View className="flex-1">
              <View className="flex-row items-center">
                <View className={`px-2 py-0.5 rounded-full mr-2 ${item.is_owner ? "bg-green-50" : "bg-blue-50"}`}>
                  <Text className={`text-xs font-medium ${item.is_owner ? "text-green-600" : "text-blue-600"}`}>
                    {item.is_owner ? "我共享" : "共享给我"}
                  </Text>
                </View>
                <Text className="text-gray-800 font-medium">{item.email || "未知用户"}</Text>
              </View>
              <Text className="text-gray-400 text-xs mt-1">{item.created_at}</Text>
            </View>

            {item.is_owner && (
              <TouchableOpacity onPress={() => handleCancelShare(item.id, item.email)}>
                <Text className="text-red-500">取消</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View className="py-10 items-center">
            <Text className="text-4xl mb-3">🤝</Text>
            <Text className="text-gray-500">还没有共享记录</Text>
            <Text className="text-gray-400 text-sm mt-1">输入好友邮箱开始共享</Text>
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
}
