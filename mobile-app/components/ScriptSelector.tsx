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
import { useUniwind } from "uniwind";

export function ScriptSelector({
  script,
  onScriptChange,
}: ScriptSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const { theme } = useUniwind();
  const isDark = theme === "dark";

  const handleSelect = (selectedScript: ScriptListType) => {
    onScriptChange(selectedScript);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="flex-row items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50"
      >
        <View className="h-6 w-6 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
          <Text className="text-sm text-zinc-900 dark:text-white">
            {getScriptAvatar(script)}
          </Text>
        </View>
        <Text className="text-sm text-zinc-900 dark:text-white">{script}</Text>
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
          <View className="mx-4 mt-20 max-h-[70%] rounded-xl bg-white p-4 dark:bg-zinc-900">
            <Text className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Select Script
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(Object.keys(CATEGORIES) as CategoryKey[]).map((category) => (
                <View key={category} className="mb-4">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {CATEGORIES[category]}
                  </Text>
                  {getScriptsByCategory(category).map((scriptItem) => (
                    <TouchableOpacity
                      key={scriptItem}
                      onPress={() => handleSelect(scriptItem)}
                      className={`flex-row items-center gap-3 rounded-lg px-3 py-2.5 ${
                        scriptItem === script
                          ? "bg-blue-50 dark:bg-blue-600/20"
                          : ""
                      }`}
                    >
                      <View className="h-7 w-7 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                        <Text className="text-base text-zinc-900 dark:text-white">
                          {getScriptAvatar(scriptItem)}
                        </Text>
                      </View>
                      <Text
                        className={`text-sm ${
                          scriptItem === script
                            ? "font-medium text-blue-500"
                            : "text-zinc-900 dark:text-white"
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
