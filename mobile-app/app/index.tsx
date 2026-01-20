import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import {
  Copy,
  HelpCircle,
  Keyboard as KeyboardIcon,
  Settings,
  RefreshCw,
  Menu,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";

import {
  transliterate,
  preloadScriptData,
  getAllOptions,
  type ScriptListType,
  type TransliterationOptions,
} from "lipilekhika";
import {
  DEFAULT_USE_NATIVE_NUMERALS,
  DEFAULT_INCLUDE_INHERENT_VOWEL,
} from "lipilekhika/typing";

import { ScriptSelector } from "../components/ScriptSelector";
import { CustomOptions } from "../components/CustomOptions";
import { SettingsPopover } from "../components/SettingsPopover";
import { TypingHelper } from "../components/TypingHelper";
import { MenuDrawer } from "../components/MenuDrawer";
import { AboutPage } from "../components/AboutPage";
import { useTheme } from "../components/ThemeContext";

const DEFAULT_FROM: ScriptListType = "Devanagari";
const DEFAULT_TO: ScriptListType = "Romanized";

export default function TransliterationScreen() {
  const { isDark } = useTheme();

  // Navigation state
  const [currentPage, setCurrentPage] = useState<"home" | "about">("home");
  const [menuVisible, setMenuVisible] = useState(false);

  // Script states
  const [fromScript, setFromScript] = useState<ScriptListType>(DEFAULT_FROM);
  const [toScript, setToScript] = useState<ScriptListType>(DEFAULT_TO);

  // Text states
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");

  // Options states
  const [options, setOptions] = useState<TransliterationOptions>({});
  const [availableOptions, setAvailableOptions] = useState<string[]>([]);

  // Typing states (UI only, binding deferred)
  const [typingEnabled, setTypingEnabled] = useState(true);
  const [useNativeNumerals, setUseNativeNumerals] = useState(
    DEFAULT_USE_NATIVE_NUMERALS,
  );
  const [includeInherentVowel, setIncludeInherentVowel] = useState(
    DEFAULT_INCLUDE_INHERENT_VOWEL,
  );

  // UI states
  const [autoConvert, setAutoConvert] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [typingHelperVisible, setTypingHelperVisible] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Ref to track if initial preload is done
  const initialLoadDone = useRef(false);

  // Preload script data on mount
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    Promise.allSettled([
      preloadScriptData(fromScript),
      preloadScriptData(toScript),
    ]).then(() => {
      if (inputText) {
        performTransliteration(inputText);
      }
    });
  }, []);

  // Update available options when scripts change
  useEffect(() => {
    getAllOptions(fromScript, toScript).then((allOptions) => {
      setOptions(Object.fromEntries(allOptions.map((v) => [v, false])));
      setAvailableOptions(allOptions);
    });
  }, [fromScript, toScript]);

  // Auto-convert effect
  useEffect(() => {
    if (autoConvert && inputText) {
      performTransliteration(inputText);
    }
  }, [inputText, fromScript, toScript, options, autoConvert]);

  const performTransliteration = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        setOutputText("");
        return;
      }

      try {
        setIsConverting(true);
        const result = await transliterate(text, fromScript, toScript, options);
        setOutputText(result);
      } catch (error) {
        console.error("Transliteration error:", error);
        setOutputText("");
      } finally {
        setIsConverting(false);
      }
    },
    [fromScript, toScript, options],
  );

  const handleSwap = useCallback(() => {
    const newFrom = toScript;
    const newTo = fromScript;
    const newInput = outputText;
    const newOutput = inputText;

    setFromScript(newFrom);
    setToScript(newTo);
    setInputText(newInput);
    setOutputText(newOutput);
  }, [fromScript, toScript, inputText, outputText]);

  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
    } catch (err) {
      Alert.alert("Error", "Failed to copy text");
    }
  };

  const handleManualConvert = () => {
    performTransliteration(inputText);
  };

  // Render About page
  if (currentPage === "about") {
    return (
      <SafeAreaView
        className={`flex-1 ${isDark ? "bg-zinc-900" : "bg-zinc-50"}`}
      >
        {/* Header */}
        <View
          className={`flex-row items-center border-b px-4 py-3 ${
            isDark ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"
          }`}
        >
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            className="mr-3"
          >
            <Menu size={24} color={isDark ? "#fff" : "#18181b"} />
          </TouchableOpacity>
          <Text
            className={`text-lg font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}
          >
            About
          </Text>
        </View>
        <AboutPage />
        <MenuDrawer
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          currentPage={currentPage}
          onNavigate={setCurrentPage}
        />
      </SafeAreaView>
    );
  }

  // Render Home page
  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-zinc-900" : "bg-zinc-50"}`}>
      {/* Header */}
      <View
        className={`flex-row items-center border-b px-4 py-3 ${
          isDark ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"
        }`}
      >
        <TouchableOpacity onPress={() => setMenuVisible(true)} className="mr-3">
          <Menu size={24} color={isDark ? "#fff" : "#18181b"} />
        </TouchableOpacity>
        <View>
          <Text
            className={`text-lg font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}
          >
            Lipi Lekhika
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="p-4">
            {/* Main Card */}
            <View
              className={`rounded-2xl border p-4 ${
                isDark
                  ? "border-zinc-700 bg-zinc-800/50"
                  : "border-zinc-200 bg-white shadow-sm"
              }`}
            >
              {/* FROM Section */}
              <View className="mb-4">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      isDark ? "text-zinc-400" : "text-zinc-500"
                    }`}
                  >
                    From
                  </Text>
                  <ScriptSelector
                    script={fromScript}
                    onScriptChange={setFromScript}
                  />
                </View>

                {/* Source text label row */}
                <View className="mb-2 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Text
                      className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                    >
                      Source text
                    </Text>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(inputText)}
                      className="p-1"
                    >
                      <Copy size={14} color={isDark ? "#9ca3af" : "#6b7280"} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setTypingHelperVisible(true)}
                      className="p-1"
                    >
                      <HelpCircle size={16} color="#38bdf8" />
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row items-center gap-3">
                    <View className="flex-row items-center gap-1.5">
                      <KeyboardIcon
                        size={18}
                        color={isDark ? "#9ca3af" : "#6b7280"}
                      />
                      <Switch
                        value={typingEnabled}
                        onValueChange={setTypingEnabled}
                        trackColor={{
                          false: isDark ? "#3f3f46" : "#d4d4d8",
                          true: "#3b82f6",
                        }}
                        thumbColor="#fff"
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => setSettingsVisible(true)}
                      className="p-1"
                    >
                      <Settings
                        size={16}
                        color={isDark ? "#9ca3af" : "#6b7280"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Input TextArea */}
                <TextInput
                  className={`min-h-[140px] rounded-lg border p-3 text-base ${
                    isDark
                      ? "border-zinc-700 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-zinc-50 text-zinc-900"
                  }`}
                  placeholder="Enter text to transliterate..."
                  placeholderTextColor={isDark ? "#71717a" : "#a1a1aa"}
                  multiline
                  textAlignVertical="top"
                  value={inputText}
                  onChangeText={setInputText}
                />
              </View>

              {/* Swap Button */}
              <View className="mb-4 items-center">
                <TouchableOpacity
                  onPress={handleSwap}
                  className={`h-10 w-10 items-center justify-center rounded-full border ${
                    isDark
                      ? "border-zinc-600 bg-zinc-700"
                      : "border-zinc-300 bg-zinc-100"
                  }`}
                >
                  <Text
                    className={`text-lg ${isDark ? "text-white" : "text-zinc-900"}`}
                  >
                    ⇅
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TO Section */}
              <View className="mb-4">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      isDark ? "text-zinc-400" : "text-zinc-500"
                    }`}
                  >
                    To
                  </Text>
                  <ScriptSelector
                    script={toScript}
                    onScriptChange={setToScript}
                  />
                </View>

                {/* Output label row */}
                <View className="mb-2 flex-row items-center gap-3">
                  <Text
                    className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                  >
                    Output
                  </Text>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(outputText)}
                    className="p-1"
                  >
                    <Copy size={14} color={isDark ? "#9ca3af" : "#6b7280"} />
                  </TouchableOpacity>
                  <View className="flex-row items-center gap-1.5">
                    <Text
                      className={`text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
                    >
                      Auto
                    </Text>
                    <Switch
                      value={autoConvert}
                      onValueChange={setAutoConvert}
                      trackColor={{
                        false: isDark ? "#3f3f46" : "#d4d4d8",
                        true: "#3b82f6",
                      }}
                      thumbColor="#fff"
                    />
                  </View>
                  {!autoConvert && (
                    <TouchableOpacity
                      onPress={handleManualConvert}
                      className="flex-row items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1"
                    >
                      <RefreshCw
                        size={12}
                        color="#fff"
                        style={isConverting ? { opacity: 0.5 } : {}}
                      />
                      <Text className="text-xs font-medium text-white">
                        Convert
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Output TextArea */}
                <View
                  className={`min-h-[140px] rounded-lg border p-3 ${
                    isDark
                      ? "border-zinc-700 bg-zinc-900/50"
                      : "border-zinc-300 bg-zinc-100"
                  }`}
                >
                  <Text
                    className={`text-base ${isDark ? "text-white" : "text-zinc-900"}`}
                  >
                    {outputText || (
                      <Text
                        className={isDark ? "text-zinc-500" : "text-zinc-400"}
                      >
                        Transliterated text will appear here...
                      </Text>
                    )}
                  </Text>
                </View>
              </View>

              {/* Custom Options */}
              <CustomOptions
                availableOptions={availableOptions}
                options={options}
                onOptionsChange={setOptions}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Menu Drawer */}
      <MenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />

      {/* Settings Popover */}
      <SettingsPopover
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        useNativeNumerals={useNativeNumerals}
        onUseNativeNumeralsChange={setUseNativeNumerals}
        includeInherentVowel={includeInherentVowel}
        onIncludeInherentVowelChange={setIncludeInherentVowel}
      />

      {/* Typing Helper Modal */}
      <TypingHelper
        visible={typingHelperVisible}
        onClose={() => setTypingHelperVisible(false)}
        script={fromScript}
      />
    </SafeAreaView>
  );
}
