import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { dishAPI } from "../services/api";

const CUISINE_OPTIONS = [
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
  "其他",
];

export default function AddDishScreen({ route, navigation }) {
  const editDish = route?.params?.dish;
  const isEditing = !!editDish;

  const [name, setName] = useState(editDish?.name || "");
  const [cuisine, setCuisine] = useState(editDish?.cuisine || "");
  const [description, setDescription] = useState(editDish?.description || "");
  const [tagsInput, setTagsInput] = useState(editDish?.tags?.join(", ") || "");
  const [showCuisinePicker, setShowCuisinePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("错误", "请输入菜品名称");
      return;
    }
    if (!cuisine) {
      Alert.alert("错误", "请选择菜系");
      return;
    }

    setLoading(true);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);

    const data = {
      name: name.trim(),
      cuisine,
      description: description.trim(),
      tags,
    };

    try {
      if (isEditing) {
        await dishAPI.updateDish(editDish.id, data);
        Alert.alert("成功", "菜品已更新");
      } else {
        await dishAPI.createDish(data);
        Alert.alert("成功", "菜品已添加");
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert("错误", error.response?.data?.error || "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView className="flex-1 p-5">
        <Text className="text-xl font-bold text-dark mb-5">{isEditing ? "编辑菜品" : "添加菜品"}</Text>

        {/* 菜品名称 */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">菜品名称 *</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-white"
            placeholder="例如：麻婆豆腐"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* 菜系选择 */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">菜系 *</Text>
          <TouchableOpacity
            className="border border-gray-300 rounded-xl px-4 py-3 bg-white"
            onPress={() => setShowCuisinePicker(!showCuisinePicker)}
          >
            <Text className={cuisine ? "text-base text-gray-800" : "text-base text-gray-400"}>
              {cuisine || "选择菜系"}
            </Text>
          </TouchableOpacity>

          {showCuisinePicker && (
            <View className="flex-row flex-wrap mt-2">
              {CUISINE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  className={`px-3 py-2 rounded-full mr-2 mb-2 ${
                    cuisine === option ? "bg-primary" : "bg-white border border-gray-300"
                  }`}
                  onPress={() => {
                    setCuisine(option);
                    setShowCuisinePicker(false);
                  }}
                >
                  <Text className={cuisine === option ? "text-white font-medium" : "text-gray-700"}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 描述 */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">描述</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-white"
            placeholder="简单描述一下这道菜"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* 标签 */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">标签</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-white"
            placeholder="用逗号分隔，例如：辣, 下饭, 热菜"
            value={tagsInput}
            onChangeText={setTagsInput}
          />
        </View>

        {/* 保存按钮 */}
        <TouchableOpacity
          className={`rounded-xl py-4 items-center ${loading ? "bg-gray-400" : "bg-primary"}`}
          onPress={handleSave}
          disabled={loading}
        >
          <Text className="text-white text-lg font-semibold">
            {loading ? "保存中..." : isEditing ? "更新菜品" : "添加菜品"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
