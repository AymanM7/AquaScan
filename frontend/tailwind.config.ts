import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--color-bg-primary)",
          surface: "var(--color-bg-surface)",
          "surface-2": "var(--color-bg-surface-2)",
        },
        accent: {
          teal: "var(--color-accent-teal)",
          amber: "var(--color-accent-amber)",
          blue: "var(--color-accent-blue)",
          green: "var(--color-accent-green)",
          purple: "var(--color-accent-purple)",
          coral: "var(--color-accent-coral)",
        },
        content: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          mono: "var(--color-text-mono)",
        },
        edge: {
          DEFAULT: "var(--color-border)",
          active: "var(--color-border-active)",
        },
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex)", "system-ui", "sans-serif"],
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
        mono: ["var(--font-space-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "teal-glow": "0 0 20px rgba(0, 229, 204, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
