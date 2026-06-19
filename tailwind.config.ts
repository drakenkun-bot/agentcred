import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Near-black terminal backdrop
        ink: {
          950: "#05070d",
          900: "#080b14",
          850: "#0b0f1a",
          800: "#0f1422",
          700: "#161c2e",
          600: "#1f2740",
        },
        // Glowing teal/cyan accent from the sketch
        glow: {
          DEFAULT: "#22e3c4",
          soft: "#5af2dc",
          deep: "#0fb9a0",
        },
        // Secondary violet accents (constellation nodes)
        violet: {
          glow: "#9b6bff",
        },
        rate: {
          a: "#22e3c4",
          b: "#5ad1ff",
          c: "#f4c95d",
          d: "#f08a5d",
          f: "#f0596d",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px -2px rgba(34, 227, 196, 0.35)",
        "glow-lg": "0 0 60px -8px rgba(34, 227, 196, 0.45)",
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(255,255,255,0.04)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
