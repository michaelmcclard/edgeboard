/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        edge: {
          bg: "#080810",
          card: "#0f0f1a",
          border: "#1a1a2e",
          green: "#00ff88",
          amber: "#ffb300",
          red: "#ff3d57",
          blue: "#00e5ff",
          cyan: "#00e5ff",
          muted: "#6b6b8a",
          label: "#3a3a5c",
          gold: "#f5a623",
          purple: "#7b5ea7",
          text: "#f0f0ff",
          textsec: "#6b6b8a",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        display: ["Inter", "system-ui", "sans-serif"],
        condensed: ["Barlow Condensed", "sans-serif"],
      },
      animation: {
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { opacity: '0.5' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
