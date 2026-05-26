import { cssInterop } from "react-native-css-interop";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";

// 为所有常用组件注册 className 支持
const components = [
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
];

components.forEach((component) => {
  cssInterop(component, { className: "style" });
});
