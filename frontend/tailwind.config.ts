import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Brandable palette — tweak to your SoniQute colors
        sq: {
          bg: "#08090B",
          surface: "#0F1116",
          primary: "#9D5CFF",   // accent 1
          secondary: "#00E6A8", // accent 2
          glow: "#7C4DFF",
          text: "#E6E8EC",
          muted: "#9BA3AF"
        }
      },
      boxShadow: {
        glow: "0 0 24px rgba(124,77,255,0.45)",
        glowSoft: "0 0 40px rgba(0,230,168,0.25)"
      },
      fontFamily: {
        // Swap in Darumadrop / Inter vars if you want
        sans: ["Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
export default config;
