import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { ChevronDown, Info } from "lucide-react-native";
import type { TransliterationOptions } from "lipilekhika";
import { CUSTOM_OPTION_DESCRIPTIONS } from "./optionDescriptions";
import type { CustomOptionsProps } from "./types";
import { useTheme } from "./ThemeContext";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function CustomOptions({
  availableOptions,
  options,
  onOptionsChange,
}: CustomOptionsProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [infoVisible, setInfoVisible] = useState<string | null>(null);
  const { isDark } = useTheme();

  const toggleOptions = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowOptions(!showOptions);
  };

  const handleOptionChange = (optionKey: string, value: boolean) => {
    onOptionsChange({
      ...options,
      [optionKey]: value,
    });
  };

  return (
    <View
      className={`overflow-hidden rounded-lg border ${
        isDark ? "border-zinc-700 bg-zinc-800/50" : "border-zinc-200 bg-zinc-50"
      }`}
    >
      <TouchableOpacity
        onPress={toggleOptions}
        className="flex-row items-center justify-between px-4 py-3.5"
      >
        <Text
          className={`text-sm font-medium tracking-wide ${
            isDark ? "text-white" : "text-zinc-900"
          }`}
        >
          Transliteration Options
        </Text>
        <ChevronDown
          size={20}
          color={isDark ? "#9ca3af" : "#6b7280"}
          style={{
            transform: [{ rotate: showOptions ? "180deg" : "0deg" }],
          }}
        />
      </TouchableOpacity>

      {showOptions && (
        <View
          className={`border-t px-4 py-4 ${
            isDark ? "border-zinc-700" : "border-zinc-200"
          }`}
        >
          {availableOptions.length === 0 ? (
            <Text
              className={
                isDark ? "text-sm text-zinc-400" : "text-sm text-zinc-500"
              }
            >
              No options available for this combination.
            </Text>
          ) : (
            <View className="gap-4">
              {availableOptions.map((option) => {
                const optionKey = option as keyof TransliterationOptions;
                const description = CUSTOM_OPTION_DESCRIPTIONS[optionKey];
                const displayName = description?.[0] ?? option;
                const descriptionText =
                  description?.[1] ?? "No description available.";

                return (
                  <View
                    key={option}
                    className="flex-row items-center justify-between gap-3"
                  >
                    <View className="flex-1 flex-row items-center gap-2">
                      <Switch
                        value={!!options[optionKey]}
                        onValueChange={(value) =>
                          handleOptionChange(option, value)
                        }
                        trackColor={{
                          false: isDark ? "#3f3f46" : "#d4d4d8",
                          true: "#3b82f6",
                        }}
                        thumbColor="#fff"
                      />
                      <Text
                        className={`flex-1 text-sm ${
                          isDark ? "text-white" : "text-zinc-900"
                        }`}
                        numberOfLines={1}
                      >
                        {displayName}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setInfoVisible(infoVisible === option ? null : option)
                        }
                      >
                        <Info
                          size={16}
                          color={isDark ? "#9ca3af" : "#6b7280"}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {/* Info tooltip */}
              {infoVisible && (
                <View
                  className={`mt-2 rounded-lg p-3 ${
                    isDark ? "bg-zinc-700" : "bg-zinc-200"
                  }`}
                >
                  <Text
                    className={`text-sm ${isDark ? "text-zinc-200" : "text-zinc-700"}`}
                  >
                    {CUSTOM_OPTION_DESCRIPTIONS[
                      infoVisible as keyof TransliterationOptions
                    ]?.[1] ?? "No description available."}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
