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

export function RankingCard({ title, items }: RankingCardProps) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="rounded-card border border-black/10 bg-surface p-4 shadow-card">
      <h3 className="mb-3 text-sm font-semibold text-label-secondary">{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item.name} className="flex items-center gap-2">
            <span className="w-5 text-xs text-label-secondary">{i + 1}</span>
            <span className="w-24 truncate text-sm">{item.name}</span>
            <div className="h-2 flex-1 rounded-full bg-black/5">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right text-xs text-label-secondary">
              {item.count}
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-label-secondary">データがありません</p>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  value: string | number;
  label: string;
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="rounded-card border border-black/10 bg-surface p-4 shadow-card">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-label-secondary">{label}</p>
    </div>
  );
}
