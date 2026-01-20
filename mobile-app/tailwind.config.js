/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./App.tsx",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Custom semantic colors
        background: {
          DEFAULT: "#ffffff",
          dark: "#18181b",
        },
        card: {
          DEFAULT: "#f4f4f5",
          dark: "#27272a",
        },
        border: {
          DEFAULT: "#e4e4e7",
          dark: "#3f3f46",
        },
      },
    },
  },
  plugins: [],
};
