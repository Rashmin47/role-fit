/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nirman: {
          bg: "#F7F7F4",
          surface: "#FFFFFF",
          sidebar: "#15171A",
          dark: "#17191C",
          accent: {
            DEFAULT: "#315EF6",
            hover: "#2548C7",
            light: "#EEF3FF",
            subtle: "#E0EAFF",
          },
          border: "#E5E7EB",
          borderSubtle: "#F0F1F3",
          text: {
            primary: "#17191C",
            secondary: "#667085",
            muted: "#98A2B3",
          },
          success: {
            DEFAULT: "#16835B",
            bg: "#ECFDF3",
            border: "#A6F4C5",
            text: "#027A48",
          },
          warning: {
            DEFAULT: "#B7791F",
            bg: "#FFFAEB",
            border: "#FEDF89",
            text: "#B54708",
          },
          danger: {
            DEFAULT: "#C24141",
            bg: "#FEF3F2",
            border: "#FECDCA",
            text: "#B42318",
          },
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "8px",
        lg: "10px",
        xl: "12px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        popover: "0 4px 12px 0 rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};
