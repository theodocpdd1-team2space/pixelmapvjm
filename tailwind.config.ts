import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pf: {
          bg: "#070707",
          sidebar: "#0D0D0D",
          panel: "#141414",
          border: "#292929",
          red: "#FF3030",
          darkRed: "#8F1010",
          text: "#F4F4F4",
          muted: "#858585",
          success: "#32D583",
          warning: "#F5A524"
        }
      },
      fontFamily: {
        brand: ["var(--font-orbitron)", "sans-serif"],
        ui: ["var(--font-chakra)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"]
      }
    }
  }
};

export default config;
