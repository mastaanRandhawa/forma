/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* --- new semantic system (proxies src/styles/tokens.css) --- */
        background: {
          DEFAULT: "var(--background)",
          deep: "var(--background-deep)",
          soft: "var(--background-soft)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          glass: "var(--surface-glass)",
          raised: "var(--surface-raised)",
          recessed: "var(--surface-recessed)",
          opaque: "var(--surface-opaque)",
          float: "var(--surface-float)",
        },
        content: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
        },
        accent: {
          pink: "var(--accent-pink)",
          purple: "var(--accent-purple)",
          mauve: "var(--accent-mauve)",
          blue: "var(--accent-blue)",
          cyan: "var(--accent-cyan)",
          orange: "var(--accent-orange)",
          lime: "var(--accent-lime)",
        },
        line: {
          DEFAULT: "var(--line-soft)",
          soft: "var(--line-soft)",
          highlight: "var(--line-highlight)",
        },
      },
      borderRadius: {
        card: "var(--radius-medium)",
        hero: "var(--radius-large)",
        shell: "var(--radius-shell)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        deep: "var(--shadow-deep)",
        raised: "var(--shadow-raised)",
        recessed: "var(--shadow-recessed)",
        float: "var(--shadow-float)",
      },
      transitionTimingFunction: {
        luxury: "var(--ease-luxury)",
        "spring-soft": "var(--ease-spring-soft)",
      },
      fontFamily: {
        sans: ["Urbanist", "ui-sans-serif", "system-ui", "sans-serif"],
        num: ["'Space Grotesk'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
