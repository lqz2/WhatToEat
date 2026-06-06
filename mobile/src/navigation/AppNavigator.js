import React from "react";
import { Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeScreen from "../screens/HomeScreen";
import FridgeScreen from "../screens/FridgeScreen";
import PreferenceScreen from "../screens/PreferenceScreen";
import ShareScreen from "../screens/ShareScreen";
import ProfileScreen from "../screens/ProfileScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import CustomMenuScreen from "../screens/CustomMenuScreen";
import { useAuth } from "../contexts/AuthContext";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 底部 Tab 图标组件
const TabIcon = ({ icon, focused }) => (
  <Text className={`text-xl ${focused ? "opacity-100" : "opacity-50"}`}>{icon}</Text>
);

// 已登录用户的 Tab 导航
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FF6B35",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          borderTopColor: "#F3F4F6",
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "推荐",
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Fridge"
        component={FridgeScreen}
        options={{
          tabBarLabel: "冰箱",
          tabBarIcon: ({ focused }) => <TabIcon icon="❄️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: "我的",
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// “我的”页面堆栈
function ProfileStack() {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator>
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Share" component={ShareScreen} options={{ title: "冰箱共享" }} />
      <Stack.Screen name="Preferences" component={PreferenceScreen} options={{ title: "口味偏好" }} />
      <Stack.Screen name="CustomMenu" component={CustomMenuScreen} options={{ title: "我的菜单" }} />
    </Stack.Navigator>
  );
}

// 未登录用户的 Auth 导航
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// 主导航：根据登录状态切换
export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // 或者显示一个启动画面
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
