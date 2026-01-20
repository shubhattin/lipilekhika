import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";
import { ThemeProvider } from "../components/ThemeContext";
import { useUniwind } from "uniwind";

function RootLayoutContent() {
  const { theme } = useUniwind();
  const isDark = theme === "dark";

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: isDark ? "#18181b" : "#fafafa" },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}
