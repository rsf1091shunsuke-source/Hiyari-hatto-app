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
    return <p className="p-4 text-label-secondary">年度が設定されていません</p>;
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-semibold">月次報告書作成</h1>

      <div className="mb-4">
        <label className="mb-1 block text-xs text-label-secondary">対象月</label>
        <input
          type="month"
          value={monthValue}
          onChange={(e) => {
            setMonthValue(e.target.value);
            setSelectedIds([]);
          }}
          className="min-h-[44px] rounded-card border border-black/10 bg-surface px-3"
        />
      </div>

      <p className="mb-2 text-sm text-label-secondary">
        表（日付×作業内容×危険項目の件数集計）はこの期間の記録から自動作成されます。
      </p>

      <div className="mb-6 rounded-card border border-black/10 bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold">
          今月のヒヤリハットに載せる記録を選ぶ（{candidates.length}件中{selectedIds.length}件選択）
        </h2>
        {candidates.length === 0 ? (
          <p className="text-sm text-label-secondary">この月に自由記述のある記録はありません</p>
        ) : (
          <div className="space-y-3">
            {candidates.map((r) => {
              const taskName =
                r.taskId === "other" ? r.taskOtherText ?? "その他" : taskNameMap.get(r.taskId) ?? "不明";
              const isSelected = selectedIds.includes(r.id);
              return (
                <div key={r.id} className="rounded-card border border-black/10 p-3">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(r.id)}
                      className="mt-1 h-5 w-5"
                    />
                    <div className="flex-1">
                      <p className="text-xs text-label-secondary">
                        {r.createdAt.toDate().toLocaleDateString("ja-JP")}　{taskName}
                      </p>
                      <p className="text-sm">{r.freeText}</p>
                    </div>
                  </label>
                  {isSelected && (
                    <textarea
                      placeholder="対策を入力"
                      value={countermeasureMap[r.id] ?? ""}
                      onChange={(e) =>
                        setCountermeasureMap((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      className="mt-2 min-h-[60px] w-full rounded-card border border-black/10 bg-surface px-3 py-2 text-sm"
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
        <div className="mt-4">
          <iframe
            src={pdfUrl}
            className="h-[70vh] w-full rounded-card border border-black/10 bg-white"
            title="月次報告書PDFプレビュー"
          />
          <a
            href={pdfUrl}
            download="monthly-report.pdf"
            className="mt-2 inline-block min-h-[44px] rounded-card bg-primary px-4 py-2 text-white"
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
