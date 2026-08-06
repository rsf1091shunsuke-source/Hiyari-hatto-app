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
    return <div className="mx-auto max-w-2xl px-5 py-10 text-center"><p className="text-ios-body text-label-secondary">年度が設定されていません</p></div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="mb-5 text-ios-title1">PDF出力</h1>

      <div className="rounded-[18px] bg-surface p-5 shadow-card">
        <h2 className="mb-1 text-ios-headline text-label">記録一覧</h2>
        <p className="mb-4 text-ios-footnote text-label-secondary">
          日時・作業内容・危険項目をそのまま一覧化します
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="min-h-[46px] rounded-[12px] border border-transparent bg-background px-3.5 text-ios-subhead text-label outline-none focus:border-primary"
          />
          <span className="text-label-secondary">〜</span>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="min-h-[46px] rounded-[12px] border border-transparent bg-background px-3.5 text-ios-subhead text-label outline-none focus:border-primary"
          />
        </div>
        <div className="mt-3">
          <PrimaryButton
            label="記録一覧PDFを出力"
            onPress={handleGenerate}
            isLoading={isGenerating}
          />
        </div>
        {pdfUrl && (
          <div className="mt-4 animate-fadeIn">
            <iframe
              src={pdfUrl}
              className="h-[70vh] w-full rounded-[14px] bg-white shadow-card"
              title="記録一覧PDFプレビュー"
            />
            <a
              href={pdfUrl}
              download="hiyari-hatto-list.pdf"
              className="mt-3 inline-flex min-h-[44px] items-center rounded-[14px] bg-primary px-5 text-ios-headline text-white shadow-button"
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
