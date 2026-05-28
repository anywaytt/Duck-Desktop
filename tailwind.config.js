/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        hermes: {
          bg: "#1a1408",
          surface: "#271d0c",
          card: "#342810",
          border: "#4d3c18",
          accent: "#f5a623",
          warm: "#e8920d",
          light: "#ffd98e",
          mid: "#fff3dc",
          text: "#f5efe0",
          muted: "#9a8d6e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
