"use client";

export const dynamic = "force-dynamic";

/**
 * 1-8. 統計・分析
 * 参照：詳細設計書 1-8画面仕様
 *
 * 拡張：年度セレクター（過去年度も含めて選択可）／月別タブ選択時の対象月セレクター／
 * 危険行為ランキング（riskItem別の件数を降順で表示）を追加。
 */

import { useEffect, useMemo, useState } from "react";
import { onSnapshot, orderBy, query } from "firebase/firestore";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminNav } from "@/components/AdminNav";
import { Heatmap, TrendBarChart } from "@/components/Charts";
import { Skeleton } from "@/components/Skeleton";
import { yearsCol } from "@/lib/collections";
import { useCurrentYear } from "@/lib/useCurrentYear";
import { useReportsAggregation } from "@/lib/useReportsAggregation";
import { Year } from "@/types/firestore";

type PeriodType = "daily" | "weekly" | "monthly" | "yearly";

const PERIOD_LABELS: Record<PeriodType, string> = {
  daily: "日別",
  weekly: "週別",
  monthly: "月別",
  yearly: "年度別",
};

/** 年度の開始日から12か月分の月ラベル・範囲を生成（例：4月始まりなら4月〜翌3月） */
function monthOptionsFor(year: Year) {
  const base = year.startDate.toDate();
  return Array.from({ length: 12 }, (_, i) => {
    const start = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const end = new Date(base.getFullYear(), base.getMonth() + i + 1, 1);
    return { label: `${start.getMonth() + 1}月`, start, end };
  });
}

function StatsContent() {
  const { year: activeYear } = useCurrentYear();
  const [years, setYears] = useState<Year[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | undefined>(undefined);
  const [periodType, setPeriodType] = useState<PeriodType>("weekly");
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);

  useEffect(() => {
    const q = query(yearsCol, orderBy("startDate", "desc"));
    const unsub = onSnapshot(q, (snap) => setYears(snap.docs.map((d) => d.data())));
    return unsub;
  }, []);

  // 現行年度を初期選択（yearsの読み込みより先に判明することが多いため別途セット）
  useEffect(() => {
    if (!selectedYearId && activeYear) setSelectedYearId(activeYear.id);
  }, [activeYear, selectedYearId]);

  const selectedYear = years.find((y) => y.id === selectedYearId) ?? activeYear ?? null;
  const monthOptions = useMemo(
    () => (selectedYear ? monthOptionsFor(selectedYear) : []),
    [selectedYear]
  );

  // 選択中年度の「今」に相当する月をデフォルト選択（年度をまたいでいれば0番目＝年度開始月）
  useEffect(() => {
    if (monthOptions.length === 0) return;
    const now = new Date();
    const idx = monthOptions.findIndex((m) => now >= m.start && now < m.end);
    setSelectedMonthIndex(idx >= 0 ? idx : 0);
  }, [monthOptions]);

  const { reports, tasks, riskItems, isLoading } = useReportsAggregation(selectedYear?.id);

  const data = useMemo(() => {
    let periodStart: Date;
    let periodEnd: Date | null = null;

    const now = new Date();
    if (periodType === "daily") {
      periodStart = new Date(now);
      periodStart.setHours(0, 0, 0, 0);
    } else if (periodType === "weekly") {
      periodStart = new Date(now);
      periodStart.setHours(0, 0, 0, 0);
      periodStart.setDate(periodStart.getDate() - 6);
    } else if (periodType === "monthly" && selectedYear) {
      const m = monthOptionsFor(selectedYear)[selectedMonthIndex];
      periodStart = m ? m.start : now;
      periodEnd = m ? m.end : null;
    } else if (selectedYear) {
      periodStart = selectedYear.startDate.toDate();
      const next = new Date(periodStart);
      next.setFullYear(next.getFullYear() + 1);
      periodEnd = next;
    } else {
      periodStart = now;
    }

    const filtered = reports.filter((r) => {
      const t = r.createdAt.toDate();
      return t >= periodStart && (!periodEnd || t < periodEnd);
    });

    const nonSystemRiskItems = riskItems.filter((r) => !r.isSystemItem);
    const activeTasks = tasks.filter((t) => t.isActive);

    const matrix = nonSystemRiskItems.map((ri) =>
      activeTasks.map(
        (t) =>
          filtered.filter((r) => r.taskId === t.id && r.riskItemIds.includes(ri.id))
            .length
      )
    );

    const trendMap = new Map<string, number>();
    filtered.forEach((r) => {
      const d = r.createdAt.toDate();
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
    });
    const trend = [...trendMap.entries()].map(([label, value]) => ({ label, value }));

    // 危険行為ランキング：危険項目ごとの選択件数を降順で集計
    const ranking = nonSystemRiskItems
      .map((ri) => ({
        label: ri.name,
        value: filtered.filter((r) => r.riskItemIds.includes(ri.id)).length,
      }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);

    return {
      filteredCount: filtered.length,
      matrix,
      riskItemLabels: nonSystemRiskItems.map((r) => r.name),
      taskLabels: activeTasks.map((t) => t.name),
      trend,
      ranking,
    };
  }, [reports, tasks, riskItems, periodType, selectedMonthIndex, selectedYear]);

  if (!selectedYear) {
    return <p className="p-4 text-label-secondary">年度が設定されていません</p>;
  }
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton shape="chart" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-semibold">統計・分析</h1>

      {years.length > 1 && (
        <div className="mb-3">
          <label className="mb-1 block text-xs text-label-secondary">対象年度</label>
          <select
            value={selectedYear.id}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="min-h-[44px] rounded-card border border-black/10 bg-surface px-3 text-sm"
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(PERIOD_LABELS) as PeriodType[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriodType(p)}
            className={[
              "min-h-[44px] rounded-card border px-3 py-2 text-sm",
              periodType === p
                ? "border-primary bg-primary text-white"
                : "border-black/10 bg-surface text-label",
            ].join(" ")}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {periodType === "monthly" && (
        <div className="mb-4">
          <label className="mb-1 block text-xs text-label-secondary">対象月</label>
          <select
            value={selectedMonthIndex}
            onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
            className="min-h-[44px] rounded-card border border-black/10 bg-surface px-3 text-sm"
          >
            {monthOptions.map((m, i) => (
              <option key={i} value={i}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="mb-4 text-sm text-label-secondary">
        該当期間の件数：{data.filteredCount}件
      </p>

      {data.filteredCount === 0 ? (
        <p className="text-label-secondary">この期間の記録はありません</p>
      ) : (
        <>
          <div className="mb-6 rounded-card border border-black/10 bg-surface p-4 shadow-card">
            <h3 className="mb-2 text-sm font-semibold text-label-secondary">推移</h3>
            <TrendBarChart data={data.trend} />
          </div>

          {data.ranking.length > 0 && (
            <div className="mb-6 rounded-card border border-black/10 bg-surface p-4 shadow-card">
              <h3 className="mb-2 text-sm font-semibold text-label-secondary">
                危険行為ランキング
              </h3>
              <TrendBarChart data={data.ranking} />
            </div>
          )}

          <div className="rounded-card border border-black/10 bg-surface p-4 shadow-card">
            <h3 className="mb-2 text-sm font-semibold text-label-secondary">
              作業内容×危険項目 クロス集計
            </h3>
            <Heatmap
              matrixData={data.matrix}
              xLabels={data.taskLabels}
              yLabels={data.riskItemLabels}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function StatsPage() {
  return (
    <AdminGuard>
      <AdminNav />
      <StatsContent />
    </AdminGuard>
  );
}
