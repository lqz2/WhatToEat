import React from "react";
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();

  const menuItems = [
    {
      title: "冰箱共享",
      subtitle: "与家人共同管理食材",
      icon: "🤝",
      onPress: () => navigation.navigate("Share"),
    },
    {
      title: "口味偏好",
      subtitle: "设置喜欢的菜系和权重",
      icon: "🎯",
      onPress: () => navigation.navigate("Preferences"),
    },
    {
      title: "我的菜单",
      subtitle: "记录你的私房拿手菜",
      icon: "❤️",
      onPress: () => navigation.navigate("CustomMenu"),
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView>
        {/* 用户信息头部 */}
        <View className="bg-white px-6 pt-12 pb-8 items-center border-b border-gray-100">
          <View className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center mb-4">
            <Text className="text-4xl">👤</Text>
          </View>
          <Text className="text-2xl font-bold text-gray-800">{user?.email?.split("@")[0] || "我的账户"}</Text>
          <Text className="text-gray-500 mt-1">{user?.email}</Text>
        </View>

        {/* 菜单列表 */}
        <View className="mt-6 px-4">
          <Text className="text-sm font-medium text-gray-400 mb-3 px-2">功能设置</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={item.onPress}
              className="bg-white rounded-2xl p-4 mb-3 flex-row items-center border border-gray-100"
            >
              <View className="w-12 h-12 bg-gray-50 rounded-xl items-center justify-center mr-4">
                <Text className="text-2xl">{item.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800">{item.title}</Text>
                <Text className="text-gray-500 text-sm mt-0.5">{item.subtitle}</Text>
              </View>
              <Text className="text-gray-300 text-xl">›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 退出登录 */}
        <View className="mt-6 px-4 pb-10">
          <TouchableOpacity
            onPress={signOut}
            className="bg-white rounded-2xl p-4 flex-row items-center justify-center border border-red-50"
          >
            <Text className="text-red-500 text-lg font-bold">退出登录</Text>
          </TouchableOpacity>
          <Text className="text-center text-gray-300 text-xs mt-6">WhatToEat v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
