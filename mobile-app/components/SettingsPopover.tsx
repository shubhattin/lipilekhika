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
import { useTheme } from "./ThemeContext";

export function SettingsPopover({
  visible,
  onClose,
  useNativeNumerals,
  onUseNativeNumeralsChange,
  includeInherentVowel,
  onIncludeInherentVowelChange,
}: SettingsPopoverProps) {
  const { isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/60" onPress={onClose}>
        <View
          className={`mx-4 mt-32 rounded-xl p-5 ${
            isDark ? "bg-zinc-900" : "bg-white"
          }`}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text
              className={`text-base font-medium ${
                isDark ? "text-white" : "text-zinc-900"
              }`}
            >
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
                <Text
                  className={`text-sm font-medium ${
                    isDark ? "text-white" : "text-zinc-900"
                  }`}
                >
                  Use Native Numerals
                </Text>
                <Text
                  className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                >
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

            <View
              className={`h-px ${isDark ? "bg-zinc-700" : "bg-zinc-200"}`}
            />

            {/* Include Inherent Vowel */}
            <View className="flex-row items-center justify-between gap-4">
              <View className="flex-1">
                <Text
                  className={`text-sm font-medium ${
                    isDark ? "text-white" : "text-zinc-900"
                  }`}
                >
                  Include Inherent Vowel
                </Text>
                <Text
                  className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                >
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
