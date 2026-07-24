/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F5F6F4",
        ink: "#1C2321",
        "ink-soft": "#4A5250",
        crimson: {
          DEFAULT: "#C4293D",
          dark: "#8F1A2B",
          light: "#F6DADE",
        },
        amber: {
          DEFAULT: "#E2A33D",
          light: "#FBEDD6",
        },
        teal: {
          DEFAULT: "#2E7D6B",
          light: "#DCEEE9",
        },
        line: "#E3E1DC",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
