import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class", // prefers-color-scheme準拠のデフォルト値はglobals.cssのCSS変数側で吸収し、
  // .dark / .light クラスによる手動上書き（Phase 2 設定画面）を両立させる
  theme: {
    extend: {
      colors: {
        // 前回設計書 ⑬カラーパレット準拠のセマンティックトークン
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        label: "rgb(var(--color-label) / <alpha-value>)",
        "label-secondary": "rgb(var(--color-label-secondary) / <alpha-value>)",
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        "risk-high": "rgb(var(--color-risk-high) / <alpha-value>)",
        "risk-medium": "rgb(var(--color-risk-medium) / <alpha-value>)",
        "risk-low": "rgb(var(--color-risk-low) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
      },
      fontFamily: {
        // 前回設計書 ⑭タイポグラフィ: San Francisco相当のシステムフォント
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        // 前回設計書 ⑫デザインシステム: 角丸（16〜24px基調）
        card: "16px",
        "card-lg": "24px",
      },
      boxShadow: {
        // 前回設計書 ⑫デザインシステム: 多層シャドウによる奥行き表現
        card: "0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)",
        "card-elevated":
          "0 2px 4px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)",
      },
      backdropBlur: {
        // 前回設計書 ⑫デザインシステム: ガラスモーフィズム（背景ぼかし＋半透明レイヤー）
        glass: "20px",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
