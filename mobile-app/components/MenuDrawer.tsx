import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Linking,
} from "react-native";
import {
  X,
  Sun,
  Moon,
  Monitor,
  Github,
  ExternalLink,
} from "lucide-react-native";
import { useTheme, type ThemeMode } from "./ThemeContext";
import { useUniwind } from "uniwind";

interface MenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  currentPage: "home" | "about";
  onNavigate: (page: "home" | "about") => void;
}

export function MenuDrawer({
  visible,
  onClose,
  currentPage,
  onNavigate,
}: MenuDrawerProps) {
  const { themeMode, setThemeMode } = useTheme();
  const { theme } = useUniwind();
  const isDark = theme === "dark";

  const handleNavigate = (page: "home" | "about") => {
    onNavigate(page);
    onClose();
  };

  const themeModes: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
    { mode: "system", label: "System", icon: Monitor },
    { mode: "light", label: "Light", icon: Sun },
    { mode: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 flex-row" onPress={onClose}>
        {/* Drawer */}
        <Pressable
          className="h-full w-72 bg-white shadow-2xl dark:bg-zinc-900"
          onPress={() => {}} // Prevent closing when tapping drawer
        >
          <View className="flex-1 pt-12">
            {/* Header */}
            <View className="mb-4 flex-row items-center justify-between border-b border-zinc-200 px-4 pb-4 dark:border-zinc-700">
              <Text className="text-xl font-bold text-zinc-900 dark:text-white">
                Lipi Lekhika
              </Text>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color={isDark ? "#9ca3af" : "#6b7280"} />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-2">
              {/* Navigation */}
              <View className="mb-6">
                <Text className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Navigation
                </Text>
                <TouchableOpacity
                  onPress={() => handleNavigate("home")}
                  className={`flex-row items-center gap-3 rounded-lg px-3 py-3 ${
                    currentPage === "home"
                      ? "bg-blue-50 dark:bg-blue-600/20"
                      : ""
                  }`}
                >
                  <Text
                    className={`text-base ${
                      currentPage === "home"
                        ? "font-medium text-blue-500"
                        : "text-zinc-900 dark:text-white"
                    }`}
                  >
                    🏠 Home
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleNavigate("about")}
                  className={`flex-row items-center gap-3 rounded-lg px-3 py-3 ${
                    currentPage === "about"
                      ? "bg-blue-50 dark:bg-blue-600/20"
                      : ""
                  }`}
                >
                  <Text
                    className={`text-base ${
                      currentPage === "about"
                        ? "font-medium text-blue-500"
                        : "text-zinc-900 dark:text-white"
                    }`}
                  >
                    ℹ️ About
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Theme Selection */}
              <View className="mb-6">
                <Text className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Theme
                </Text>
                <View className="flex-row gap-2 px-2">
                  {themeModes.map(({ mode, label, icon: Icon }) => (
                    <TouchableOpacity
                      key={mode}
                      onPress={() => setThemeMode(mode)}
                      className={`flex-1 items-center rounded-lg py-3 ${
                        themeMode === mode
                          ? "bg-blue-500"
                          : "bg-zinc-100 dark:bg-zinc-800"
                      }`}
                    >
                      <Icon
                        size={20}
                        color={
                          themeMode === mode
                            ? "#fff"
                            : isDark
                              ? "#9ca3af"
                              : "#6b7280"
                        }
                      />
                      <Text
                        className={`mt-1 text-xs ${
                          themeMode === mode
                            ? "font-medium text-white"
                            : "text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Links */}
              <View>
                <Text className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Links
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL("https://github.com/AoH-lipi/lipilekhika")
                  }
                  className="flex-row items-center gap-3 rounded-lg px-3 py-3"
                >
                  <Github size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
                  <Text className="text-zinc-900 dark:text-white">GitHub</Text>
                  <ExternalLink
                    size={14}
                    color={isDark ? "#71717a" : "#a1a1aa"}
                  />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Pressable>

        {/* Overlay */}
        <View className="flex-1 bg-black/40" />
      </Pressable>
    </Modal>
  );
}
