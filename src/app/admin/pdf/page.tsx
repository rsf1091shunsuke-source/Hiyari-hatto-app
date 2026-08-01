"use client";

export const dynamic = "force-dynamic";

/**
 * 1-13. PDFプレビュー・出力
 * 参照：詳細設計書 1-13画面仕様
 */

import { useEffect, useState } from "react";
import { onSnapshot, orderBy, query, where, limit } from "firebase/firestore";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminNav } from "@/components/AdminNav";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useToast } from "@/components/Toast";
import { useCurrentYear } from "@/lib/useCurrentYear";
import { aiAnalysesCol } from "@/lib/collections";
import { AIAnalysis } from "@/types/firestore";

function PdfPageContent() {
  const { year } = useCurrentYear();
  const { showToast } = useToast();
  const [latest, setLatest] = useState<AIAnalysis | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!year) return;
    const q = query(
      aiAnalysesCol,
      where("yearId", "==", year.id),
      where("status", "==", "confirmed"),
      orderBy("generatedAt", "desc"),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLatest(snap.empty ? null : snap.docs[0].data());
    });
    return unsub;
  }, [year]);

  const handleGenerate = async () => {
    if (!latest) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: latest.id }),
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

      {!latest ? (
        <p className="text-label-secondary">
          確定済みのAI分析がありません。AI分析画面で確定してください。
        </p>
      ) : (
        <>
          <PrimaryButton
            label="PDFを生成"
            onPress={handleGenerate}
            isLoading={isGenerating}
          />
          {pdfUrl && (
            <div className="mt-4">
              <iframe
                src={pdfUrl}
                className="h-[70vh] w-full rounded-card border border-black/10 bg-white"
                title="PDFプレビュー"
              />
              <a
                href={pdfUrl}
                download="report.pdf"
                className="mt-2 inline-block min-h-[44px] rounded-card bg-primary px-4 py-2 text-white"
              >
                ダウンロード
              </a>
            </div>
          )}
        </>
      )}
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
