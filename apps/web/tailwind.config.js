/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/app/src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      colors: {
        app: "var(--bg-app)",
        surface: {
          DEFAULT: "var(--bg-surface)",
          elevated: "var(--bg-surface-elevated)",
          muted: "var(--bg-surface-muted)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          active: "var(--primary-active)",
          fg: "var(--primary-fg)",
          subtle: "var(--primary-subtle)",
          border: "var(--primary-border)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          active: "var(--accent-hover)",
          fg: "var(--accent-fg)",
          subtle: "var(--accent-subtle)",
          border: "var(--accent-border)",
        },
        focus: "var(--border-focus)",
        success: {
          DEFAULT: "var(--success)",
          subtle: "var(--success-subtle)",
          fg: "var(--success-fg)",
          border: "var(--success-border)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          subtle: "var(--warning-subtle)",
          fg: "var(--warning-fg)",
          border: "var(--warning-border)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          subtle: "var(--danger-subtle)",
          fg: "var(--danger-fg)",
          border: "var(--danger-border)",
        },
        info: {
          DEFAULT: "var(--info)",
          subtle: "var(--info-subtle)",
          fg: "var(--info-fg)",
          border: "var(--info-border)",
        },
      },
      ringColor: {
        DEFAULT: "var(--border-focus)",
        focus: "var(--border-focus)",
        primary: "var(--primary)",
        accent: "var(--accent)",
      },
      ringOffsetColor: {
        DEFAULT: "var(--bg-surface)",
        app: "var(--bg-app)",
        surface: "var(--bg-surface)",
        focus: "var(--border-focus)",
      },
      textColor: {
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
        inverse: "var(--text-inverse)",
      },
      borderColor: {
        subtle: "var(--border-subtle)",
        strong: "var(--border-strong)",
        focus: "var(--border-focus)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        card: "0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.08)",
        modal: "0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.1)",
      },
      borderRadius: {
        none: "0px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        full: "9999px",
      },
    },
  },
  plugins: [],
};
