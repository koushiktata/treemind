/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canopy: {
          950: "#08110d",
          900: "#0d1b15",
          800: "#122619",
          700: "#1a3524",
          600: "#234a30",
          500: "#2f6540",
          400: "#4a8f5c",
          300: "#7dbb8b",
        },
        bark: {
          900: "#1c1712",
          800: "#2a2119",
        },
        signal: {
          amber: "#e0a94a",
          rust: "#c2603b",
          moss: "#8fae4e",
        },
        parchment: "#f2ede0",
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
