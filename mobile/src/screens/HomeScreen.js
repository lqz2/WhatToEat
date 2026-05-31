import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { recommendAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function HomeScreen() {
    const { user } = useAuth();
  const [recommendData, setRecommendData] = useState({ type: "text", data: "" });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // 将用户 ID 绑定到缓存的 Key 上，多账号不串号
  const CACHE_KEY = "CACHED_RECOMMENDATIONS_" + user?.id;
  const CACHE_TIME_KEY = "CACHED_RECOMMENDATIONS_TIME_" + user?.id;
  const SIX_HOURS = 6 * 60 * 60 * 1000; // 6 小时

  const fetchRecommendations = async (forceRefresh = false) => {
    setLoading(true);
    try {
      // 濡傛灉涓嶆槸寮哄埗鍒锋柊锛屽厛妫€鏌ョ紦瀛?
      if (!forceRefresh) {
        const cachedTimeStr = await AsyncStorage.getItem(CACHE_TIME_KEY);
        if (cachedTimeStr) {
          const cachedTime = parseInt(cachedTimeStr, 10);
          const now = Date.now();

          // 濡傛灉鏇存柊鏃堕棿璺濅粖鏈秴杩?6 灏忔椂锛岀洿鎺ヤ娇鐢ㄧ紦瀛?
          if (now - cachedTime < SIX_HOURS) {
            const cachedDataStr = await AsyncStorage.getItem(CACHE_KEY);
            if (cachedDataStr) {
              setRecommendData(JSON.parse(cachedDataStr));
              setLoading(false);
              setRefreshing(false);
              return; // 缁撴潫鍑芥暟锛屼笉鍐嶈皟鐢ㄥ悗绔?API
            }
          }
        }
      }

      const response = await recommendAPI.getRecommendations();
      // 鑾峰彇鍒版柊鐨勭粨鏋?{ type: "list", data: [...] } 鎴?{ type: "text", data: "..." }
      if (response.data) {
        setRecommendData(response.data);
        // 淇濆瓨鍒扮紦瀛樺拰璁板綍褰撳墠鏃堕棿
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(response.data));
        await AsyncStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      }
    } catch (error) {
      console.log("鑾峰彇鎺ㄨ崘澶辫触:", error.message);
      setRecommendData({ type: "text", data: "鑾峰彇鎺ㄨ崘澶辫触锛岃妫€鏌ョ綉缁滄垨閰嶇疆銆? });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRecommendations(false); // 鍒囨崲椤甸潰鏃讹紝涓嶅己鍒跺埛鏂帮紝浼樺厛璧扮紦瀛?
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecommendations(true); // 鐢ㄦ埛鎵嬪姩鐐瑰嚮"鎹竴鎵?鎴栦笅鎷夊埛鏂版椂锛屽己鍒惰姹?LLM
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-gray-500 mt-2">鏅鸿兘澶фā鍨嬫鍦ㄥ垎鏋愪綘鐨勫啺绠?..</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white pt-12 pb-4 px-5 border-b border-gray-100 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-dark">浠婃棩 AI 鎺ㄨ崘</Text>
          <Text className="text-gray-500 mt-1">鍩轰簬浣犲啺绠遍噷鐨勯鏉?/Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
      >
        {recommendData.type === "list" ? (
          recommendData.data.map((item, index) => (
            <View key={index} className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center mb-3">
                <View className="bg-primary/10 w-8 h-8 rounded-full items-center justify-center mr-3">
                  <Text className="text-primary font-bold">{index + 1}</Text>
                </View>
                <Text className="text-xl font-bold text-gray-800 flex-1">{item.name}</Text>
              </View>

              <View className="bg-orange-50/50 p-3 rounded-xl mb-3">
                <Text className="text-gray-600 text-sm leading-5">
                  <Text className="font-semibold text-orange-700">鎺ㄨ崘鐞嗙敱锛?/Text>
                  {item.reason}
                </Text>
              </View>

              <Text className="text-gray-700 leading-6">
                <Text className="font-semibold text-gray-900">馃懇鈥嶐煃?鍋氭硶鎻愮ず锛?/Text>
                {item.steps}
              </Text>
            </View>
          ))
        ) : (
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <Text className="text-4xl mb-4">馃懆鈥嶐煃?/Text>
            <Text className="text-lg leading-7 text-gray-800">
              {recommendData.data || "浣犵殑鍐扮閲屽ソ鍍忚繕娌℃湁涓滆タ锛屽揩鍘绘坊鍔犲惂锛?}
            </Text>
          </View>
        )}

        <TouchableOpacity onPress={onRefresh} className="bg-primary mt-2 mb-10 py-4 rounded-2xl items-center shadow-md">
          <Text className="text-white text-lg font-bold">鎹竴鎵规帹鑽?/Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}


