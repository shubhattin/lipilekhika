import React from "react";
import {
  View,
  Text,
  ScrollView,
  Linking,
  TouchableOpacity,
} from "react-native";
import { ExternalLink, Github, Globe, Heart } from "lucide-react-native";
import { useTheme } from "./ThemeContext";

export function AboutPage() {
  const { isDark } = useTheme();

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
      className={`flex-1 ${isDark ? "bg-zinc-900" : "bg-zinc-50"}`}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="p-4">
        {/* Header */}
        <View className="mb-6 items-center">
          <Text
            className={`text-3xl font-bold ${isDark ? "text-white" : "text-zinc-900"}`}
          >
            Lipi Lekhika
          </Text>
          <Text
            className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
          >
            लिपि लेखिका
          </Text>
          <Text
            className={`mt-2 text-center text-base ${isDark ? "text-zinc-300" : "text-zinc-600"}`}
          >
            Script Transliteration Tool
          </Text>
        </View>

        {/* Description */}
        <View
          className={`mb-6 rounded-xl border p-4 ${
            isDark
              ? "border-zinc-700 bg-zinc-800/50"
              : "border-zinc-200 bg-white"
          }`}
        >
          <Text
            className={`text-base leading-6 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
          >
            Lipi Lekhika is a powerful Indian script transliteration library and
            tool. It enables seamless conversion of text between various Brahmic
            scripts used across South Asia.
          </Text>
        </View>

        {/* Features */}
        <View
          className={`mb-6 rounded-xl border p-4 ${
            isDark
              ? "border-zinc-700 bg-zinc-800/50"
              : "border-zinc-200 bg-white"
          }`}
        >
          <Text
            className={`mb-3 text-lg font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}
          >
            ✨ Features
          </Text>
          {features.map((feature, index) => (
            <View key={index} className="mb-2 flex-row items-start">
              <Text
                className={`mr-2 ${isDark ? "text-blue-400" : "text-blue-500"}`}
              >
                •
              </Text>
              <Text
                className={`flex-1 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
              >
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {/* Supported Scripts */}
        <View
          className={`mb-6 rounded-xl border p-4 ${
            isDark
              ? "border-zinc-700 bg-zinc-800/50"
              : "border-zinc-200 bg-white"
          }`}
        >
          <Text
            className={`mb-3 text-lg font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}
          >
            📜 Supported Scripts
          </Text>

          <Text
            className={`mb-2 text-sm font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
          >
            Modern Indian Scripts
          </Text>
          <Text
            className={`mb-3 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
          >
            {scripts.modern.join(" • ")}
          </Text>

          <Text
            className={`mb-2 text-sm font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
          >
            Romanization
          </Text>
          <Text
            className={`mb-3 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
          >
            {scripts.romanized.join(" • ")}
          </Text>

          <Text
            className={`mb-2 text-sm font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
          >
            Ancient Scripts
          </Text>
          <Text className={isDark ? "text-zinc-300" : "text-zinc-700"}>
            {scripts.ancient.join(" • ")}
          </Text>
        </View>

        {/* Links */}
        <View
          className={`mb-6 rounded-xl border p-4 ${
            isDark
              ? "border-zinc-700 bg-zinc-800/50"
              : "border-zinc-200 bg-white"
          }`}
        >
          <Text
            className={`mb-3 text-lg font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}
          >
            🔗 Links
          </Text>

          <TouchableOpacity
            onPress={() =>
              Linking.openURL("https://github.com/AoH-lipi/lipilekhika")
            }
            className={`mb-2 flex-row items-center gap-3 rounded-lg p-3 ${
              isDark ? "bg-zinc-700/50" : "bg-zinc-100"
            }`}
          >
            <Github size={20} color={isDark ? "#fff" : "#18181b"} />
            <Text
              className={`flex-1 ${isDark ? "text-white" : "text-zinc-900"}`}
            >
              GitHub Repository
            </Text>
            <ExternalLink size={16} color={isDark ? "#71717a" : "#a1a1aa"} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL("https://lipilekhika.vercel.app")}
            className={`flex-row items-center gap-3 rounded-lg p-3 ${
              isDark ? "bg-zinc-700/50" : "bg-zinc-100"
            }`}
          >
            <Globe size={20} color={isDark ? "#fff" : "#18181b"} />
            <Text
              className={`flex-1 ${isDark ? "text-white" : "text-zinc-900"}`}
            >
              Web Application
            </Text>
            <ExternalLink size={16} color={isDark ? "#71717a" : "#a1a1aa"} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="items-center py-4">
          <View className="flex-row items-center gap-1">
            <Text className={isDark ? "text-zinc-500" : "text-zinc-400"}>
              Made with
            </Text>
            <Heart size={14} color="#ef4444" fill="#ef4444" />
            <Text className={isDark ? "text-zinc-500" : "text-zinc-400"}>
              for Indian Languages
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
