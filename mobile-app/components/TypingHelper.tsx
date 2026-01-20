import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { X, Keyboard, ArrowLeftRight } from "lucide-react-native";
import type { ScriptListType } from "lipilekhika";
import { SCRIPT_LIST } from "lipilekhika";
import { getScriptTypingDataMap, getScriptKramaData } from "lipilekhika/typing";
import { ScriptSelector } from "./ScriptSelector";
import type { TypingHelperProps } from "./types";
import { useUniwind } from "uniwind";

type ListType = "svara" | "vyanjana" | "anya" | "mAtrA";
type Item = [text: string, type: ListType, mappings: string[]];
type KramaRow = [text: string, type: ListType];

const isSvara = (t: ListType) => t === "svara" || t === "mAtrA";

const filterCategory = (
  items: Item[],
  category: "svara" | "vyanjana" | "anya",
): Item[] => {
  if (category === "svara") return items.filter(([, t]) => isSvara(t));
  if (category === "vyanjana") return items.filter(([, t]) => t === "vyanjana");
  return items.filter(([, t]) => t === "anya");
};

interface CharacterCardProps {
  char: string;
  mappings: string[];
  isDark: boolean;
}

function CharacterCard({ char, mappings, isDark }: CharacterCardProps) {
  return (
    <View className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-800">
      <Text className="text-xl font-semibold text-zinc-900 dark:text-white">
        {char === "\u200d" ? "ZWJ" : char}
      </Text>
      <View className="mt-1.5 flex-row flex-wrap gap-1">
        {mappings.length === 0 ? (
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            No mappings
          </Text>
        ) : (
          mappings.map((m, i) => (
            <View
              key={`${m}-${i}`}
              className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 dark:border-zinc-600 dark:bg-zinc-700/50"
            >
              <Text className="font-mono text-[10px] text-zinc-600 dark:text-zinc-300">
                {m}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

interface CompareCardProps {
  baseText: string;
  compareText: string;
  isDark: boolean;
}

function CompareCard({ baseText, compareText, isDark }: CompareCardProps) {
  return (
    <View className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-700 dark:bg-zinc-800">
      <Text className="text-xl font-semibold text-zinc-900 dark:text-white">
        {baseText}
      </Text>
      <Text className="mt-1 text-xl font-semibold text-zinc-500 dark:text-zinc-400">
        {compareText || "—"}
      </Text>
    </View>
  );
}

export function TypingHelper({
  visible,
  onClose,
  script: initialScript,
}: TypingHelperProps) {
  const { theme } = useUniwind();
  const isDark = theme === "dark";
  const [script, setScript] = useState<ScriptListType>(initialScript);
  const [activeTab, setActiveTab] = useState<"typing-map" | "compare-scripts">(
    "typing-map",
  );
  const [scriptToCompare, setScriptToCompare] =
    useState<ScriptListType>("Romanized");
  const [showCompareSelector, setShowCompareSelector] = useState(false);

  // Typing map data
  const [typingMapData, setTypingMapData] = useState<{
    common: Item[];
    specific: Item[];
  } | null>(null);
  const [typingMapLoading, setTypingMapLoading] = useState(true);
  const [typingMapError, setTypingMapError] = useState<string | null>(null);

  // Compare data
  const [compareData, setCompareData] = useState<{
    base: KramaRow[];
    compare: KramaRow[];
  } | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Load typing map data
  useEffect(() => {
    if (!visible) return;

    setTypingMapLoading(true);
    setTypingMapError(null);
    getScriptTypingDataMap(script)
      .then((data) => {
        setTypingMapData({
          common: data.common_krama_map as Item[],
          specific: data.script_specific_krama_map as Item[],
        });
        setTypingMapLoading(false);
      })
      .catch((err) => {
        setTypingMapError(String(err));
        setTypingMapLoading(false);
      });
  }, [script, visible]);

  // Load compare data
  useEffect(() => {
    if (!visible || activeTab !== "compare-scripts" || !scriptToCompare) return;
    if (scriptToCompare === script) return;

    setCompareLoading(true);
    setCompareError(null);
    Promise.all([
      getScriptKramaData(script),
      getScriptKramaData(scriptToCompare),
    ])
      .then(([base, compare]) => {
        setCompareData({
          base: base as KramaRow[],
          compare: compare as KramaRow[],
        });
        setCompareLoading(false);
      })
      .catch((err) => {
        setCompareError(String(err));
        setCompareLoading(false);
      });
  }, [script, scriptToCompare, activeTab, visible]);

  useEffect(() => {
    setScript(initialScript);
  }, [initialScript]);

  const renderTypingMapTab = () => {
    if (typingMapLoading) {
      return (
        <View className="items-center justify-center py-12">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-3 text-zinc-500 dark:text-zinc-400">
            Loading typing map...
          </Text>
        </View>
      );
    }

    if (typingMapError) {
      return (
        <View className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800/30 dark:bg-red-900/10">
          <Text className="font-medium text-red-500">
            Could not load typing map
          </Text>
          <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {typingMapError}
          </Text>
        </View>
      );
    }

    if (!typingMapData) return null;

    const svaraItems = filterCategory(typingMapData.common, "svara");
    const vyanjanaItems = filterCategory(typingMapData.common, "vyanjana");
    const otherItems = filterCategory(typingMapData.common, "anya");
    const specificItems = typingMapData.specific;

    return (
      <View className="gap-6">
        {/* Svara */}
        <View>
          <Text className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
            Svara
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {svaraItems.map(([char, type, mappings], i) => (
              <View key={`${char}-${type}-${i}`} className="w-[48%]">
                <CharacterCard
                  char={char}
                  mappings={mappings}
                  isDark={isDark}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Vyanjana */}
        <View>
          <Text className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
            Vyanjana
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {vyanjanaItems.map(([char, type, mappings], i) => (
              <View key={`${char}-${type}-${i}`} className="w-[48%]">
                <CharacterCard
                  char={char}
                  mappings={mappings}
                  isDark={isDark}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Other */}
        <View>
          <Text className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
            Other
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {otherItems.map(([char, type, mappings], i) => (
              <View key={`${char}-${type}-${i}`} className="w-[48%]">
                <CharacterCard
                  char={char}
                  mappings={mappings}
                  isDark={isDark}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Script-specific */}
        {specificItems.length > 0 && (
          <View>
            <Text className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              Script-specific Characters
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {specificItems.map(([char, type, mappings], i) => (
                <View key={`${char}-${type}-${i}`} className="w-[48%]">
                  <CharacterCard
                    char={char}
                    mappings={mappings}
                    isDark={isDark}
                  />
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderCompareTab = () => {
    const availableScripts = (SCRIPT_LIST as ScriptListType[]).filter(
      (s) => s !== script && s !== "Normal",
    );

    return (
      <View className="gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            Current:{" "}
            <Text className="font-medium text-zinc-900 dark:text-white">
              {script}
            </Text>
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              Compare with
            </Text>
            <TouchableOpacity
              onPress={() => setShowCompareSelector(true)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <Text className="text-sm text-zinc-900 dark:text-white">
                {scriptToCompare}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {compareLoading ? (
          <View className="items-center justify-center py-12">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : compareError ? (
          <View className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800/30 dark:bg-red-900/10">
            <Text className="font-medium text-red-500">
              Could not load comparison
            </Text>
            <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {compareError}
            </Text>
          </View>
        ) : compareData ? (
          <View className="flex-row flex-wrap gap-2">
            {compareData.base.map(([baseText], i) =>
              baseText.length > 0 ? (
                <View key={`${baseText}-${i}`} className="w-[48%]">
                  <CompareCard
                    baseText={baseText}
                    compareText={compareData.compare[i]?.[0] ?? ""}
                    isDark={isDark}
                  />
                </View>
              ) : null,
            )}
          </View>
        ) : null}

        {/* Compare script selector modal */}
        <Modal
          visible={showCompareSelector}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCompareSelector(false)}
        >
          <TouchableOpacity
            className="flex-1 bg-black/60"
            activeOpacity={1}
            onPress={() => setShowCompareSelector(false)}
          >
            <View className="mx-4 mt-32 max-h-[60%] rounded-xl bg-white p-4 dark:bg-zinc-900">
              <Text className="mb-3 text-base font-medium text-zinc-900 dark:text-white">
                Select script to compare
              </Text>
              <ScrollView>
                {availableScripts.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => {
                      setScriptToCompare(s);
                      setShowCompareSelector(false);
                    }}
                    className={`rounded-lg px-3 py-2.5 ${
                      s === scriptToCompare
                        ? "bg-blue-50 dark:bg-blue-600/20"
                        : ""
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        s === scriptToCompare
                          ? "font-medium text-blue-500"
                          : "text-zinc-900 dark:text-white"
                      }`}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-zinc-50 dark:bg-zinc-900">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <View className="flex-row items-center gap-2">
            <Keyboard size={20} color="#3b82f6" />
            <Text className="text-lg font-semibold text-zinc-900 dark:text-white">
              Typing help
            </Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={isDark ? "#9ca3af" : "#6b7280"} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 py-4">
          {/* Script Selector */}
          <View className="mb-4 flex-row items-center justify-center gap-2">
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              Select Script
            </Text>
            <ScriptSelector script={script} onScriptChange={setScript} />
          </View>

          {/* Tabs */}
          <View className="mb-4 flex-row rounded-lg bg-zinc-200 p-1 dark:bg-zinc-800">
            <TouchableOpacity
              onPress={() => setActiveTab("typing-map")}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-md py-2.5 ${
                activeTab === "typing-map"
                  ? "bg-white shadow-sm dark:bg-zinc-700"
                  : ""
              }`}
            >
              <Keyboard
                size={16}
                color={
                  activeTab === "typing-map"
                    ? isDark
                      ? "#fff"
                      : "#18181b"
                    : isDark
                      ? "#9ca3af"
                      : "#6b7280"
                }
              />
              <Text
                className={`text-sm font-medium ${
                  activeTab === "typing-map"
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                Typing Map
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("compare-scripts")}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-md py-2.5 ${
                activeTab === "compare-scripts"
                  ? "bg-white shadow-sm dark:bg-zinc-700"
                  : ""
              }`}
            >
              <ArrowLeftRight
                size={16}
                color={
                  activeTab === "compare-scripts"
                    ? isDark
                      ? "#fff"
                      : "#18181b"
                    : isDark
                      ? "#9ca3af"
                      : "#6b7280"
                }
              />
              <Text
                className={`text-sm font-medium ${
                  activeTab === "compare-scripts"
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                Compare Scripts
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === "typing-map"
            ? renderTypingMapTab()
            : renderCompareTab()}
        </ScrollView>
      </View>
    </Modal>
  );
}
