"use client";

/**
 * RiskGauge
 * 危険項目選択画面の「サイン要素」。選んだ危険項目の数に応じて
 * 緑→黄→赤へリアルタイムに変化する、この画面ならではのフィードバック。
 * データは選択件数から算出するのみで、新しい状態やロジックは持たない。
 */

interface RiskGaugeProps {
  /** 「特になし」を除いた、選択中の危険項目数 */
  count: number;
}

const LEVELS = [
  { max: 0, label: "安全", width: "8%", color: "#34C759", glow: false },
  { max: 1, label: "注意", width: "42%", color: "#FFCC00", glow: false },
  { max: 2, label: "注意", width: "68%", color: "#FF9500", glow: false },
  { max: Infinity, label: "警戒", width: "100%", color: "#FF3B30", glow: true },
];

export function RiskGauge({ count }: RiskGaugeProps) {
  const level = LEVELS.find((l) => count <= l.max) ?? LEVELS[LEVELS.length - 1];

  return (
    <div className="mb-6 rounded-[18px] bg-surface p-5 shadow-card" aria-live="polite">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-ios-footnote font-semibold uppercase tracking-wide text-label-secondary">
          危険度
        </span>
        <span
          className="text-ios-headline font-semibold transition-colors duration-300"
          style={{ color: level.color }}
        >
          {level.label}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-black/[0.05]">
        <div
          className={[
            "h-3 rounded-full transition-[width,background-color] duration-500 ease-out",
            level.glow ? "animate-pulseGlow" : "",
          ].join(" ")}
          style={{ width: level.width, backgroundColor: level.color }}
        />
      </div>
    </div>
  );
}
