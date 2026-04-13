/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        edge: {
          bg: "#0a0e17",
          card: "#111827",
          border: "#1f2937",
          green: "#00ff88",
          amber: "#f59e0b",
          red: "#ef4444",
          blue: "#3b82f6",
          muted: "#6b7280",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
