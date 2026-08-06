"use client";

export const dynamic = "force-dynamic";

/**
 * 月次報告書作成
 * 参照：しゅんすけさん提供の紙の様式（器工具・リスクアセスメント記録集計）
 *
 * 表（日付×作業内容×危険項目の件数集計）はAPI側で自動集計する。
 * 「今月のヒヤリハット」に載せる記録と、それぞれの「対策」文は教官がここで選択・入力する。
 */

import { useEffect, useMemo, useState } from "react";
import { onSnapshot, orderBy, query, where } from "firebase/firestore";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminNav } from "@/components/AdminNav";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useToast } from "@/components/Toast";
import { useCurrentYear } from "@/lib/useCurrentYear";
import { reportsCol, tasksCol } from "@/lib/collections";
import { Report, Task } from "@/types/firestore";

function MonthlyReportContent() {
  const { year } = useCurrentYear();
  const { showToast } = useToast();

  const now = new Date();
  const [monthValue, setMonthValue] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [reports, setReports] = useState<Report[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [countermeasureMap, setCountermeasureMap] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const { start, end } = useMemo(() => {
    const [y, m] = monthValue.split("-").map(Number);
    return {
      start: new Date(y, m - 1, 1),
      end: new Date(y, m, 1),
    };
  }, [monthValue]);

  useEffect(() => {
    if (!year) return;
    const q = query(
      reportsCol,
      where("yearId", "==", year.id),
      where("isDeleted", "==", false),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setReports(
        snap.docs
          .map((d) => d.data())
          .filter((r) => {
            const t = r.createdAt.toDate();
            return t >= start && t < end;
          })
      );
    });
    return unsub;
  }, [year, start, end]);

  useEffect(() => {
    if (!year) return;
    const q = query(tasksCol, where("yearId", "==", year.id));
    const unsub = onSnapshot(q, (snap) => setTasks(snap.docs.map((d) => d.data())));
    return unsub;
  }, [year]);

  const taskNameMap = useMemo(() => new Map(tasks.map((t) => [t.id, t.name])), [tasks]);

  // 自由記述がある記録のみ「今月のヒヤリハット」候補として表示する
  const candidates = reports.filter((r) => r.freeText && r.freeText.trim().length > 0);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!year) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/pdf/monthly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearId: year.id,
          monthStart: start.toISOString(),
          monthEnd: end.toISOString(),
          monthLabel: `${start.getMonth() + 1}月`,
          selectedReportIds: selectedIds,
          countermeasures: selectedIds.map((id) => countermeasureMap[id] ?? ""),
        }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      setPdfUrl(URL.createObjectURL(blob));
    } catch {
      showToast("生成に失敗しました", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!year) {
    return <div className="mx-auto max-w-2xl px-5 py-10 text-center"><p className="text-ios-body text-label-secondary">年度が設定されていません</p></div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="mb-5 text-ios-title1">月次報告書作成</h1>

      <div className="mb-4 rounded-[18px] bg-surface p-5 shadow-card">
        <label className="mb-1.5 block text-ios-footnote font-semibold uppercase tracking-wide text-label-secondary">
          対象月
        </label>
        <input
          type="month"
          value={monthValue}
          onChange={(e) => {
            setMonthValue(e.target.value);
            setSelectedIds([]);
          }}
          className="min-h-[46px] rounded-[12px] border border-transparent bg-background px-4 text-ios-body text-label outline-none focus:border-primary"
        />
        <p className="mt-3 text-ios-footnote text-label-secondary">
          表（日付×作業内容×危険項目の件数集計）はこの期間の記録から自動作成されます
        </p>
      </div>

      <div className="mb-4 rounded-[18px] bg-surface p-5 shadow-card">
        <h2 className="mb-3 text-ios-footnote font-semibold uppercase tracking-wide text-label-secondary">
          今月のヒヤリハットに載せる記録を選ぶ
          <span className="ml-1.5 normal-case tracking-normal text-label-secondary/70">
            （{candidates.length}件中{selectedIds.length}件選択）
          </span>
        </h2>
        {candidates.length === 0 ? (
          <p className="text-ios-subhead text-label-secondary">この月に自由記述のある記録はありません</p>
        ) : (
          <div className="space-y-2.5">
            {candidates.map((r) => {
              const taskName =
                r.taskId === "other" ? r.taskOtherText ?? "その他" : taskNameMap.get(r.taskId) ?? "不明";
              const isSelected = selectedIds.includes(r.id);
              return (
                <div
                  key={r.id}
                  className={[
                    "rounded-[14px] p-3.5 transition-colors duration-150",
                    isSelected ? "bg-primary/[0.06]" : "bg-background",
                  ].join(" ")}
                >
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(r.id)}
                      className="mt-1 h-5 w-5 accent-primary"
                    />
                    <div className="flex-1">
                      <p className="text-ios-caption text-label-secondary">
                        {r.createdAt.toDate().toLocaleDateString("ja-JP")}　{taskName}
                      </p>
                      <p className="text-ios-subhead text-label">{r.freeText}</p>
                    </div>
                  </label>
                  {isSelected && (
                    <textarea
                      placeholder="対策を入力"
                      value={countermeasureMap[r.id] ?? ""}
                      onChange={(e) =>
                        setCountermeasureMap((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      className="mt-2.5 min-h-[60px] w-full resize-none rounded-[12px] border border-black/[0.06] bg-surface px-3.5 py-2.5 text-ios-subhead text-label outline-none focus:border-primary"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PrimaryButton
        label="月次報告書PDFを生成"
        onPress={handleGenerate}
        isLoading={isGenerating}
      />

      {pdfUrl && (
        <div className="mt-4 animate-fadeIn">
          <iframe
            src={pdfUrl}
            className="h-[70vh] w-full rounded-[14px] bg-white shadow-card"
            title="月次報告書PDFプレビュー"
          />
          <a
            href={pdfUrl}
            download="monthly-report.pdf"
            className="mt-3 inline-flex min-h-[44px] items-center rounded-[14px] bg-primary px-5 text-ios-headline text-white shadow-button"
          >
            ダウンロード
          </a>
        </div>
      )}
    </div>
  );
}

export default function MonthlyReportPage() {
  return (
    <AdminGuard>
      <AdminNav />
      <MonthlyReportContent />
    </AdminGuard>
  );
}
