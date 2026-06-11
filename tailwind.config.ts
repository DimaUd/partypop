import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0B1A",
        surface: "#161632",
        surface2: "#1F1F45",
        "neon-pink": "#FF007A",
        "neon-cyan": "#00F0FF",
        "neon-purple": "#9D4EDD",
        "neon-lime": "#3DF58B",
        "neon-amber": "#FFB800",
        "candy-pink": "#FF007A",
        "candy-purple": "#9D4EDD",
        "candy-mint": "#3DF58B"
      },
      fontFamily: {
        sans: ["Space Grotesk", "Heebo", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Heebo", "sans-serif"]
      },
      borderRadius: { xl2: "1.25rem" },
      boxShadow: {
        "glow-pink": "0 0 24px rgba(255,0,122,0.45)",
        "glow-cyan": "0 0 24px rgba(0,240,255,0.40)",
        "glow-purple": "0 0 24px rgba(157,78,221,0.45)",
        "glow-lime": "0 0 24px rgba(61,245,139,0.40)"
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" }
        },
        pulseRing: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(157,78,221,0.5)" },
          "50%": { boxShadow: "0 0 0 10px rgba(157,78,221,0)" }
        }
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        pulseRing: "pulseRing 2.4s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
export default config;
