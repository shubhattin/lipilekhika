import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from "react-native";
import type { ScriptListType } from "lipilekhika";
import { ChevronDown } from "lucide-react-native";
import { getScriptAvatar } from "./scriptAvatar";
import {
  CATEGORIES,
  getScriptsByCategory,
  type CategoryKey,
} from "./scriptCategories";
import type { ScriptSelectorProps } from "./types";
import { useTheme } from "./ThemeContext";

export function ScriptSelector({
  script,
  onScriptChange,
}: ScriptSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const { isDark } = useTheme();

  const handleSelect = (selectedScript: ScriptListType) => {
    onScriptChange(selectedScript);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className={`flex-row items-center gap-1.5 rounded-lg border px-3 py-2 ${
          isDark ? "border-zinc-700 bg-zinc-800/50" : "border-zinc-300 bg-white"
        }`}
      >
        <View
          className={`h-6 w-6 items-center justify-center rounded-full ${
            isDark ? "bg-zinc-700" : "bg-zinc-200"
          }`}
        >
          <Text
            className={`text-sm ${isDark ? "text-white" : "text-zinc-900"}`}
          >
            {getScriptAvatar(script)}
          </Text>
        </View>
        <Text className={`text-sm ${isDark ? "text-white" : "text-zinc-900"}`}>
          {script}
        </Text>
        <ChevronDown size={16} color={isDark ? "#9ca3af" : "#6b7280"} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/60"
          onPress={() => setModalVisible(false)}
        >
          <View
            className={`mx-4 mt-20 max-h-[70%] rounded-xl p-4 ${
              isDark ? "bg-zinc-900" : "bg-white"
            }`}
          >
            <Text
              className={`mb-4 text-lg font-semibold ${
                isDark ? "text-white" : "text-zinc-900"
              }`}
            >
              Select Script
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(Object.keys(CATEGORIES) as CategoryKey[]).map((category) => (
                <View key={category} className="mb-4">
                  <Text
                    className={`mb-2 text-xs font-semibold uppercase tracking-wide ${
                      isDark ? "text-zinc-400" : "text-zinc-500"
                    }`}
                  >
                    {CATEGORIES[category]}
                  </Text>
                  {getScriptsByCategory(category).map((scriptItem) => (
                    <TouchableOpacity
                      key={scriptItem}
                      onPress={() => handleSelect(scriptItem)}
                      className={`flex-row items-center gap-3 rounded-lg px-3 py-2.5 ${
                        scriptItem === script
                          ? isDark
                            ? "bg-blue-600/20"
                            : "bg-blue-50"
                          : ""
                      }`}
                    >
                      <View
                        className={`h-7 w-7 items-center justify-center rounded-full ${
                          isDark ? "bg-zinc-700" : "bg-zinc-200"
                        }`}
                      >
                        <Text
                          className={`text-base ${
                            isDark ? "text-white" : "text-zinc-900"
                          }`}
                        >
                          {getScriptAvatar(scriptItem)}
                        </Text>
                      </View>
                      <Text
                        className={`text-sm ${
                          scriptItem === script
                            ? "font-medium text-blue-500"
                            : isDark
                              ? "text-white"
                              : "text-zinc-900"
                        }`}
                      >
                        {scriptItem}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
