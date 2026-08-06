/**
 * RankingCard / StatCard
 * 参照：詳細設計書 2章 コンポーネント設計
 */

interface RankingItem {
  name: string;
  count: number;
}

interface RankingCardProps {
  title: string;
  items: RankingItem[];
}

const RANK_COLORS = ["bg-risk-medium", "bg-label-secondary/40", "bg-label-secondary/25"];

export function RankingCard({ title, items }: RankingCardProps) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="rounded-[18px] bg-surface p-5 shadow-card">
      <h3 className="mb-4 text-ios-footnote font-semibold uppercase tracking-wide text-label-secondary">
        {title}
      </h3>
      <div className="space-y-3.5">
        {items.map((item, i) => (
          <div key={item.name} className="flex items-center gap-3">
            <span
              className={[
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
                RANK_COLORS[i] ?? "bg-black/10 text-label-secondary",
              ].join(" ")}
            >
              {i + 1}
            </span>
            <span className="w-20 shrink-0 truncate text-ios-subhead text-label sm:w-28">
              {item.name}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/[0.05]">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-ios-footnote font-semibold text-label-secondary">
              {item.count}
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-2 text-ios-subhead text-label-secondary">データがありません</p>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  value: string | number;
  label: string;
  accent?: "primary" | "success" | "neutral";
}

const accentClasses = {
  primary: "text-primary",
  success: "text-success",
  neutral: "text-label",
};

export function StatCard({ value, label, accent = "neutral" }: StatCardProps) {
  return (
    <div className="rounded-[18px] bg-surface p-4 shadow-card">
      <p className={["text-ios-title1 tabular-nums", accentClasses[accent]].join(" ")}>
        {value}
      </p>
      <p className="mt-0.5 text-ios-footnote text-label-secondary">{label}</p>
    </div>
  );
}
