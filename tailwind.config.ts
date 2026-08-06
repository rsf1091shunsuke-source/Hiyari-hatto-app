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
      fontSize: {
        // iOS標準タイプスケール準拠（Large Title 〜 Caption）
        "ios-large-title": ["34px", { lineHeight: "41px", fontWeight: "700", letterSpacing: "0.01em" }],
        "ios-title1": ["28px", { lineHeight: "34px", fontWeight: "700" }],
        "ios-title2": ["22px", { lineHeight: "28px", fontWeight: "700" }],
        "ios-title3": ["20px", { lineHeight: "25px", fontWeight: "600" }],
        "ios-headline": ["17px", { lineHeight: "22px", fontWeight: "600" }],
        "ios-body": ["17px", { lineHeight: "22px", fontWeight: "400" }],
        "ios-callout": ["16px", { lineHeight: "21px", fontWeight: "400" }],
        "ios-subhead": ["15px", { lineHeight: "20px", fontWeight: "400" }],
        "ios-footnote": ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "ios-caption": ["12px", { lineHeight: "16px", fontWeight: "400" }],
      },
      borderRadius: {
        // 前回設計書 ⑫デザインシステム: 角丸（16〜24px基調）
        card: "16px",
        "card-lg": "24px",
      },
      boxShadow: {
        // 前回設計書 ⑫デザインシステム: 多層シャドウによる奥行き表現
        card: "0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06)",
        "card-elevated":
          "0 2px 4px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.12)",
        "button": "0 1px 2px rgba(0,0,0,0.08)",
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
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "70%": { opacity: "1", transform: "scale(1.08)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,59,48,0.45)" },
          "50%": { boxShadow: "0 0 0 6px rgba(255,59,48,0)" },
        },
        drawCheck: {
          "0%": { strokeDashoffset: "40" },
          "100%": { strokeDashoffset: "0" },
        },
        ripple: {
          "0%": { transform: "scale(0.8)", opacity: "0.5" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-out",
        popIn: "popIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
        pulseGlow: "pulseGlow 1.4s ease-in-out infinite",
        drawCheck: "drawCheck 0.5s 0.25s cubic-bezier(0.65, 0, 0.35, 1) forwards",
        ripple: "ripple 1.2s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
