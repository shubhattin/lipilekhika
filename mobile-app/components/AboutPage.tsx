import React from "react";
import {
  View,
  Text,
  ScrollView,
  Linking,
  TouchableOpacity,
} from "react-native";
import { ExternalLink, Github, Globe, Heart } from "lucide-react-native";
import { useUniwind } from "uniwind";

export function AboutPage() {
  const { theme } = useUniwind();
  const isDark = theme === "dark";

  const features = [
    "Transliterate text between 20+ Indian scripts",
    "Real-time typing support for Brahmic scripts",
    "Support for Modern, Romanization, and Ancient scripts",
    "Customizable transliteration options",
    "Typing help with character mappings",
    "Script comparison tool",
  ];

  const scripts = {
    modern: [
      "Devanagari",
      "Telugu",
      "Tamil",
      "Bengali",
      "Kannada",
      "Gujarati",
      "Malayalam",
      "Odia",
      "Gurumukhi",
      "Assamese",
      "Sinhala",
    ],
    romanized: ["Normal (IAST-like)", "Romanized (Diacritics)"],
    ancient: ["Brahmi", "Sharada", "Granth", "Modi", "Siddham"],
  };

  return (
    <ScrollView
      className="flex-1 bg-zinc-50 dark:bg-zinc-900"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="p-4">
        {/* Header */}
        <View className="mb-6 items-center">
          <Text className="text-3xl font-bold text-zinc-900 dark:text-white">
            Lipi Lekhika
          </Text>
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            लिपि लेखिका
          </Text>
          <Text className="mt-2 text-center text-base text-zinc-600 dark:text-zinc-300">
            Script Transliteration Tool
          </Text>
        </View>

        {/* Description */}
        <View className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <Text className="text-base leading-6 text-zinc-700 dark:text-zinc-300">
            Lipi Lekhika is a powerful Indian script transliteration library and
            tool. It enables seamless conversion of text between various Brahmic
            scripts used across South Asia.
          </Text>
        </View>

        {/* Features */}
        <View className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <Text className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">
            ✨ Features
          </Text>
          {features.map((feature, index) => (
            <View key={index} className="mb-2 flex-row items-start">
              <Text className="mr-2 text-blue-500 dark:text-blue-400">•</Text>
              <Text className="flex-1 text-zinc-700 dark:text-zinc-300">
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {/* Supported Scripts */}
        <View className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <Text className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">
            📜 Supported Scripts
          </Text>

          <Text className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Modern Indian Scripts
          </Text>
          <Text className="mb-3 text-zinc-700 dark:text-zinc-300">
            {scripts.modern.join(" • ")}
          </Text>

          <Text className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Romanization
          </Text>
          <Text className="mb-3 text-zinc-700 dark:text-zinc-300">
            {scripts.romanized.join(" • ")}
          </Text>

          <Text className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Ancient Scripts
          </Text>
          <Text className="text-zinc-700 dark:text-zinc-300">
            {scripts.ancient.join(" • ")}
          </Text>
        </View>

        {/* Links */}
        <View className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <Text className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">
            🔗 Links
          </Text>

          <TouchableOpacity
            onPress={() =>
              Linking.openURL("https://github.com/AoH-lipi/lipilekhika")
            }
            className="mb-2 flex-row items-center gap-3 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-700/50"
          >
            <Github size={20} color={isDark ? "#fff" : "#18181b"} />
            <Text className="flex-1 text-zinc-900 dark:text-white">
              GitHub Repository
            </Text>
            <ExternalLink size={16} color={isDark ? "#71717a" : "#a1a1aa"} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL("https://lipilekhika.vercel.app")}
            className="flex-row items-center gap-3 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-700/50"
          >
            <Globe size={20} color={isDark ? "#fff" : "#18181b"} />
            <Text className="flex-1 text-zinc-900 dark:text-white">
              Web Application
            </Text>
            <ExternalLink size={16} color={isDark ? "#71717a" : "#a1a1aa"} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="items-center py-4">
          <View className="flex-row items-center gap-1">
            <Text className="text-zinc-400 dark:text-zinc-500">Made with</Text>
            <Heart size={14} color="#ef4444" fill="#ef4444" />
            <Text className="text-zinc-400 dark:text-zinc-500">
              for Indian Languages
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
