import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !password || !confirmPassword) {
      Alert.alert("错误", "请填写所有字段");
      return;
    }
    if (password.length < 6) {
      Alert.alert("错误", "密码至少需要 6 位");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("错误", "两次输入的密码不一致");
      return;
    }

    setLoading(true);
    // 自动补全后缀
    const email = username.includes("@") ? username : `${username}@whattoeat.com`;
    try {
      await signUp(email, password);
      Alert.alert("注册成功", "请登录");
      navigation.navigate("Login");
    } catch (error) {
      Alert.alert("注册失败", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerClassName="flex-1 justify-center px-6">
        <View className="items-center mb-10">
          <Text className="text-5xl mb-3">🍽️</Text>
          <Text className="text-3xl font-bold text-dark">创建账号</Text>
          <Text className="text-gray-500 mt-2">开始管理你的菜单</Text>
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">账号</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-gray-50"
            placeholder="请输入账号"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">密码</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-gray-50"
            placeholder="请输入密码（至少 6 位）"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">确认密码</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-gray-50"
            placeholder="请再次输入密码"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          className={`rounded-xl py-4 items-center ${loading ? "bg-gray-400" : "bg-primary"}`}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-lg font-semibold">注册</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-600">已有账号？</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text className="text-primary font-semibold ml-1">去登录</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
