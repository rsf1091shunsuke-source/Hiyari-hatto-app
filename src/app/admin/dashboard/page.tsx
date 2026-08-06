"use client";

export const dynamic = "force-dynamic";

/**
 * 1-7. ダッシュボード
 * 参照：詳細設計書 1-7画面仕様
 */

import { useMemo } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminNav } from "@/components/AdminNav";
import { StatCard, RankingCard } from "@/components/RankingCard";
import { TrendLineChart } from "@/components/Charts";
import { Skeleton } from "@/components/Skeleton";
import { useCurrentYear } from "@/lib/useCurrentYear";
import { useReportsAggregation } from "@/lib/useReportsAggregation";

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function DashboardContent() {
  const { year } = useCurrentYear();
  const { reports, students, tasks, riskItems, isLoading } = useReportsAggregation(
    year?.id
  );

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    const toDate = (r: (typeof reports)[number]) => r.createdAt.toDate();

    const todayReports = reports.filter((r) => toDate(r) >= todayStart);
    const weekReports = reports.filter((r) => toDate(r) >= weekStart);

    const submittedStudentIdsToday = new Set(todayReports.map((r) => r.studentId));
    const inputRate =
      students.length > 0 ? submittedStudentIdsToday.size / students.length : 0;
    const unsubmittedStudents = students.filter(
      (s) => !submittedStudentIdsToday.has(s.id)
    );

    const riskItemNameMap = new Map(riskItems.map((r) => [r.id, r]));
    const taskNameMap = new Map(tasks.map((t) => [t.id, t.name]));

    const riskItemCounts = new Map<string, number>();
    weekReports.forEach((r) => {
      r.riskItemIds.forEach((id) => {
        const item = riskItemNameMap.get(id);
        if (!item || item.isSystemItem) return; // システム項目「特になし」はランキング対象外
        riskItemCounts.set(id, (riskItemCounts.get(id) ?? 0) + 1);
      });
    });
    const riskItemRanking = [...riskItemCounts.entries()]
      .map(([id, count]) => ({ name: riskItemNameMap.get(id)?.name ?? "?", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const taskCounts = new Map<string, number>();
    weekReports.forEach((r) => {
      const name =
        r.taskId === "other" ? r.taskOtherText ?? "その他" : taskNameMap.get(r.taskId) ?? "?";
      taskCounts.set(name, (taskCounts.get(name) ?? 0) + 1);
    });
    const taskRanking = [...taskCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const trend: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(todayStart);
      day.setDate(day.getDate() - i);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const count = reports.filter((r) => {
        const d = toDate(r);
        return d >= day && d < nextDay;
      }).length;
      trend.push({
        label: `${day.getMonth() + 1}/${day.getDate()}`,
        value: count,
      });
    }

    // 危険項目の初出検知（今日出現し、過去には出現していないもの）
    const pastReports = reports.filter((r) => toDate(r) < todayStart);
    const pastRiskItemIds = new Set(pastReports.flatMap((r) => r.riskItemIds));
    const todayRiskItemIds = new Set(todayReports.flatMap((r) => r.riskItemIds));
    const newlyAppeared = [...todayRiskItemIds]
      .filter((id) => !pastRiskItemIds.has(id))
      .map((id) => riskItemNameMap.get(id))
      .filter((item) => item && !item.isSystemItem);

    return {
      todayCount: todayReports.length,
      weekCount: weekReports.length,
      inputRate,
      unsubmittedStudents,
      riskItemRanking,
      taskRanking,
      trend,
      newlyAppeared,
    };
  }, [reports, students, tasks, riskItems]);

  if (!year) {
    return <div className="mx-auto max-w-2xl px-5 py-10 text-center"><p className="text-ios-body text-label-secondary">年度が設定されていません</p></div>;
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 p-4">
        <Skeleton shape="card" />
        <Skeleton shape="card" />
        <Skeleton shape="chart" className="col-span-2" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="mb-5 text-ios-title1">ダッシュボード</h1>

      <div className="mb-3 grid grid-cols-3 gap-3">
        <StatCard
          value={`${Math.round(stats.inputRate * 100)}%`}
          label="今日の入力率"
          accent={stats.inputRate >= 0.8 ? "success" : "primary"}
        />
        <StatCard value={stats.todayCount} label="今日の件数" />
        <StatCard value={stats.weekCount} label="今週の件数" />
      </div>

      {stats.newlyAppeared.length > 0 && (
        <div className="mb-3 rounded-[18px] bg-risk-high/10 p-4 shadow-card">
          <p className="mb-1 flex items-center gap-1.5 text-ios-footnote font-semibold uppercase tracking-wide text-risk-high">
            <span className="h-1.5 w-1.5 rounded-full bg-risk-high" aria-hidden="true" />
            新しく出現した危険項目
          </p>
          <p className="text-ios-body text-label">
            {stats.newlyAppeared.map((i) => i?.name).join("、")}
          </p>
        </div>
      )}

      <div className="mb-3">
        <RankingCard title="危険項目ランキング（直近7日）" items={stats.riskItemRanking} />
      </div>
      <div className="mb-3">
        <RankingCard title="作業ランキング（直近7日）" items={stats.taskRanking} />
      </div>

      <div className="mb-3 rounded-[18px] bg-surface p-5 shadow-card">
        <h3 className="mb-3 text-ios-footnote font-semibold uppercase tracking-wide text-label-secondary">
          直近7日推移
        </h3>
        <TrendLineChart data={stats.trend} />
      </div>

      <div className="mb-5 rounded-[18px] bg-surface p-5 shadow-card">
        <h3 className="mb-3 flex items-center justify-between text-ios-footnote font-semibold uppercase tracking-wide text-label-secondary">
          <span>未入力者</span>
          <span className="normal-case tracking-normal text-label-secondary">
            {stats.unsubmittedStudents.length}名
          </span>
        </h3>
        {stats.unsubmittedStudents.length === 0 ? (
          <p className="text-ios-subhead text-success">全員入力済みです</p>
        ) : (
          <p className="text-ios-body text-label">
            {stats.unsubmittedStudents.map((s) => s.attendanceNumber).join("、")}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/admin/ai-analysis"
          className="rounded-[14px] bg-primary px-4 py-3.5 text-center text-ios-headline text-white shadow-button transition-transform duration-150 active:scale-[0.97]"
        >
          AI分析を見る
        </Link>
        <Link
          href="/admin/pdf"
          className="rounded-[14px] bg-surface px-4 py-3.5 text-center text-ios-headline text-primary shadow-card transition-transform duration-150 active:scale-[0.97]"
        >
          PDF出力
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AdminGuard>
      <AdminNav />
      <DashboardContent />
    </AdminGuard>
  );
}
