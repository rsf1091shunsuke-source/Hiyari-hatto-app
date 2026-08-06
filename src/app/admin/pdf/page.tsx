"use client";

export const dynamic = "force-dynamic";

/**
 * 1-13. PDF出力
 * ヒヤリハット記録（日時・作業内容・危険項目）を一覧PDFとして出力する。
 * AI分析機能には依存しない。
 */

import { useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminNav } from "@/components/AdminNav";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useToast } from "@/components/Toast";
import { useCurrentYear } from "@/lib/useCurrentYear";

function PdfPageContent() {
  const { year } = useCurrentYear();
  const { showToast } = useToast();

  const todayStr = new Date().toISOString().slice(0, 10);
  const [periodStart, setPeriodStart] = useState(todayStr);
  const [periodEnd, setPeriodEnd] = useState(todayStr);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!year) return;
    if (!periodStart || !periodEnd) {
      showToast("開始日と終了日を入力してください", "error");
      return;
    }
    setIsGenerating(true);
    try {
      const start = new Date(`${periodStart}T00:00:00`);
      const end = new Date(`${periodEnd}T23:59:59`);
      const res = await fetch("/api/pdf/generate-raw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearId: year.id,
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
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
      <h1 className="mb-4 text-lg font-semibold">PDF出力</h1>

      <div className="rounded-card border border-black/10 bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold">記録一覧（日時・作業内容・危険項目）</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="min-h-[44px] rounded-card border border-black/10 bg-surface px-3"
          />
          <span className="text-label-secondary">〜</span>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="min-h-[44px] rounded-card border border-black/10 bg-surface px-3"
          />
          <PrimaryButton
            label="記録一覧PDFを出力"
            onPress={handleGenerate}
            isLoading={isGenerating}
          />
        </div>
        {pdfUrl && (
          <div className="mt-4">
            <iframe
              src={pdfUrl}
              className="h-[70vh] w-full rounded-card border border-black/10 bg-white"
              title="記録一覧PDFプレビュー"
            />
            <a
              href={pdfUrl}
              download="hiyari-hatto-list.pdf"
              className="mt-2 inline-block min-h-[44px] rounded-card bg-primary px-4 py-2 text-white"
            >
              ダウンロード
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PdfPage() {
  return (
    <AdminGuard>
      <AdminNav />
      <PdfPageContent />
    </AdminGuard>
  );
}
