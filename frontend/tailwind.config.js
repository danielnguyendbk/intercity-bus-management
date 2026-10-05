export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4f9",
          100: "#d9e2ee",
          200: "#b3c5dd",
          300: "#809fbf",
          400: "#4d79a1",
          500: "#2a5985",
          600: "#1e446c",
          700: "#153556",
          800: "#0f2849", // Primary Navy
          900: "#0a1d35",
          950: "#051020",
        },
        accent: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b", // Accent Amber
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
        input: "8px",
      },
    },
  },
  plugins: [],
};

