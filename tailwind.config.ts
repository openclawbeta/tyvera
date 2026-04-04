import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        navy: {
          950: "#04060d",
          900: "#070a12",
          850: "#090c17",
          800: "#0c1020",
          750: "#0f1428",
          700: "#111827",
          650: "#141d2e",
          600: "#1a2438",
        },
        cyan: {
          50:  "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px", letterSpacing: "0.02em" }],
      },
      letterSpacing: {
        tighter2: "-0.03em",
        wider2: "0.08em",
        widest2: "0.12em",
      },
      borderRadius: {
        lg:  "var(--radius)",
        md:  "calc(var(--radius) - 2px)",
        sm:  "calc(var(--radius) - 4px)",
        "2xl": "16px",
        "3xl": "20px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-glow": "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(34,211,238,0.13), transparent 70%)",
        "hero-glow-violet": "radial-gradient(ellipse 60% 40% at 80% 20%, rgba(139,92,246,0.08), transparent 60%)",
        "card-glow": "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(34,211,238,0.07), transparent)",
        "card-glow-violet": "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(139,92,246,0.07), transparent)",
        "surface-gradient": "linear-gradient(145deg, rgba(255,255,255,0.032) 0%, rgba(255,255,255,0.018) 100%)",
        "sidebar-gradient": "linear-gradient(180deg, #070a12 0%, #06091100 100%)",
        "mesh-cyan": "radial-gradient(at 40% 20%, rgba(34,211,238,0.05) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(14,165,233,0.04) 0px, transparent 50%)",
      },
      boxShadow: {
        glass:           "0 4px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.045)",
        "glass-md":      "0 6px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
        "glass-lg":      "0 12px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
        "glass-xl":      "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)",
        "cyan-glow":     "0 0 0 1px rgba(34,211,238,0.35), 0 4px 20px rgba(34,211,238,0.2)",
        "cyan-glow-sm":  "0 0 0 1px rgba(34,211,238,0.25), 0 2px 12px rgba(34,211,238,0.14)",
        "cyan-glow-lg":  "0 0 0 1px rgba(34,211,238,0.4), 0 8px 32px rgba(34,211,238,0.25)",
        "violet-glow":   "0 0 0 1px rgba(139,92,246,0.3), 0 4px 20px rgba(139,92,246,0.15)",
        "emerald-glow":  "0 0 0 1px rgba(52,211,153,0.3), 0 4px 16px rgba(52,211,153,0.12)",
        "amber-glow":    "0 0 0 1px rgba(251,191,36,0.3), 0 4px 16px rgba(251,191,36,0.12)",
        "card":          "0 2px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)",
        "card-hover":    "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
        "inner-top":     "inset 0 1px 0 rgba(255,255,255,0.05)",
        "btn-primary":   "0 0 0 1px rgba(34,211,238,0.4), 0 4px 16px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
      },
      keyframes: {
        "ticker-move": {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.3" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-6px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%":      { opacity: "1" },
        },
        "slide-in-right": {
          "0%":   { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "ticker-move":     "ticker-move 50s linear infinite",
        "pulse-dot":       "pulse-dot 1.8s ease-in-out infinite",
        shimmer:           "shimmer 2.2s linear infinite",
        "fade-in":         "fade-in 0.4s ease forwards",
        float:             "float 4s ease-in-out infinite",
        "glow-pulse":      "glow-pulse 3s ease-in-out infinite",
        "slide-in-right":  "slide-in-right 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
