"use client";

export const dynamic = "force-dynamic";

/**
 * 1-8. 統計・分析
 * 参照：詳細設計書 1-8画面仕様
 */

import { useMemo, useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminNav } from "@/components/AdminNav";
import { Heatmap, TrendBarChart } from "@/components/Charts";
import { Skeleton } from "@/components/Skeleton";
import { useCurrentYear } from "@/lib/useCurrentYear";
import { useReportsAggregation } from "@/lib/useReportsAggregation";

type PeriodType = "daily" | "weekly" | "monthly" | "yearly";

const PERIOD_LABELS: Record<PeriodType, string> = {
  daily: "日別",
  weekly: "週別",
  monthly: "月別",
  yearly: "年度別",
};

function periodStartFor(periodType: PeriodType): Date {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (periodType === "daily") return start;
  if (periodType === "weekly") {
    start.setDate(start.getDate() - 6);
    return start;
  }
  if (periodType === "monthly") {
    start.setDate(start.getDate() - 29);
    return start;
  }
  start.setFullYear(start.getFullYear() - 1);
  return start;
}

function StatsContent() {
  const { year } = useCurrentYear();
  const { reports, tasks, riskItems, isLoading } = useReportsAggregation(year?.id);
  const [periodType, setPeriodType] = useState<PeriodType>("weekly");

  const data = useMemo(() => {
    const periodStart = periodStartFor(periodType);
    const filtered = reports.filter((r) => r.createdAt.toDate() >= periodStart);

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

    return {
      filteredCount: filtered.length,
      matrix,
      riskItemLabels: nonSystemRiskItems.map((r) => r.name),
      taskLabels: activeTasks.map((t) => t.name),
      trend,
    };
  }, [reports, tasks, riskItems, periodType]);

  if (!year) {
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

      <div className="mb-4 flex gap-2">
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
