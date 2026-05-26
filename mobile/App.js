import "./global.css";
import "./nativewind-setup";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <Text className="text-5xl mb-4">🍽️</Text>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-gray-500 mt-3">加载中...</Text>
      </View>
    );
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
