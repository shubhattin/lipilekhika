import React from "react";
import {
  View,
  Text,
  Switch,
  Modal,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { X } from "lucide-react-native";
import type { SettingsPopoverProps } from "./types";
import { useUniwind } from "uniwind";

export function SettingsPopover({
  visible,
  onClose,
  useNativeNumerals,
  onUseNativeNumeralsChange,
  includeInherentVowel,
  onIncludeInherentVowelChange,
}: SettingsPopoverProps) {
  const { theme } = useUniwind();
  const isDark = theme === "dark";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/60" onPress={onClose}>
        <View className="mx-4 mt-32 rounded-xl bg-white p-5 dark:bg-zinc-900">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-base font-medium text-zinc-900 dark:text-white">
              Typing Options
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            {/* Use Native Numerals */}
            <View className="flex-row items-center justify-between gap-4">
              <View className="flex-1">
                <Text className="text-sm font-medium text-zinc-900 dark:text-white">
                  Use Native Numerals
                </Text>
                <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                  Convert numbers to script numerals
                </Text>
              </View>
              <Switch
                value={useNativeNumerals}
                onValueChange={onUseNativeNumeralsChange}
                trackColor={{
                  false: isDark ? "#3f3f46" : "#d4d4d8",
                  true: "#3b82f6",
                }}
                thumbColor="#fff"
              />
            </View>

            <View className="h-px bg-zinc-200 dark:bg-zinc-700" />

            {/* Include Inherent Vowel */}
            <View className="flex-row items-center justify-between gap-4">
              <View className="flex-1">
                <Text className="text-sm font-medium text-zinc-900 dark:text-white">
                  Include Inherent Vowel
                </Text>
                <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                  Add inherent vowel (schwa) to consonants
                </Text>
              </View>
              <Switch
                value={includeInherentVowel}
                onValueChange={onIncludeInherentVowelChange}
                trackColor={{
                  false: isDark ? "#3f3f46" : "#d4d4d8",
                  true: "#3b82f6",
                }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
