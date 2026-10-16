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
          bg: "#F6F7F5",
          surface: "#FFFFFF",
          sidebar: "#14161A",
          dark: "#16181D",
          accent: {
            DEFAULT: "#315EF6",
            hover: "#2548C7",
            light: "#EEF3FF",
            subtle: "#DDE7FF",
          },
          border: "#E4E7EC",
          borderSubtle: "#EEF0F3",
          text: {
            primary: "#16181D",
            secondary: "#4A5568",
            muted: "#697586",
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
          info: {
            DEFAULT: "#2680C2",
            bg: "#EFF8FF",
            border: "#B2DDFF",
            text: "#175CD3",
          },
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }], // 11px
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "8px",
        lg: "10px",
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(16, 24, 40, 0.04)",
        card: "0 1px 3px 0 rgba(16, 24, 40, 0.06), 0 1px 2px -1px rgba(16, 24, 40, 0.06)",
        raised:
          "0 4px 8px -2px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.06)",
        popover: "0 12px 24px -6px rgba(16, 24, 40, 0.14), 0 4px 8px -4px rgba(16, 24, 40, 0.1)",
      },
      ringColor: {
        DEFAULT: "#315EF6",
      },
      ringOffsetColor: {
        DEFAULT: "#FFFFFF",
      },
      transitionTimingFunction: {
        "out-quint": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-up": "slide-up 240ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
