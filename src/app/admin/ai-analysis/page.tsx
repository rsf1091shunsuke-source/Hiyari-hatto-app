"use client";

export const dynamic = "force-dynamic";

/**
 * 1-12. AI分析ビュー
 * 参照：詳細設計書 1-12画面仕様、6章 AI設計
 */

import { useEffect, useState } from "react";
import { onSnapshot, orderBy, query, where, limit } from "firebase/firestore";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminNav } from "@/components/AdminNav";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useCurrentYear } from "@/lib/useCurrentYear";
import { aiAnalysesCol } from "@/lib/collections";
import { AIAnalysis, AIAnalysisContents } from "@/types/firestore";

const CATEGORY_LABELS: Record<keyof AIAnalysisContents, string> = {
  riskTrend: "危険傾向分析",
  prediction: "危険予測",
  improvement: "改善案",
  countermeasure: "対策案",
  morningComment: "朝礼コメント",
  boardComment: "掲示用コメント",
  pdfComment: "PDF用コメント",
};

function AIAnalysisContent() {
  const { year } = useCurrentYear();
  const { showToast } = useToast();
  const [latest, setLatest] = useState<AIAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [draftContents, setDraftContents] = useState<AIAnalysisContents | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!year) return;
    const q = query(
      aiAnalysesCol,
      where("yearId", "==", year.id),
      where("periodType", "==", "daily"),
      orderBy("generatedAt", "desc"),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setLatest(null);
      } else {
        const data = snap.docs[0].data();
        setLatest(data);
        setDraftContents(data.contents);
      }
      setIsLoading(false);
    });
    return unsub;
  }, [year]);

  const handleGenerate = async () => {
    if (!year) return;
    setIsGenerating(true);
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setHours(0, 0, 0, 0);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearId: year.id,
          periodType: "daily",
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
        }),
      });
      if (!res.ok) throw new Error();
      showToast("AI分析を生成しました", "success");
    } catch {
      showToast("生成に失敗しました", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (confirm: boolean) => {
    if (!latest || !draftContents) return;
    if (Object.values(draftContents).some((v) => v.trim().length === 0)) {
      showToast("空欄のまま保存することはできません", "error");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/ai/analyses/${latest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: draftContents, confirm }),
      });
      if (!res.ok) throw new Error();
      showToast(confirm ? "確定しました" : "保存しました", "success");
    } catch {
      showToast("保存に失敗しました", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!year) {
    return <p className="p-4 text-label-secondary">年度が設定されていません</p>;
  }
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton shape="card" />
        <Skeleton shape="card" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">AI分析</h1>
        <PrimaryButton
          label="AI分析を生成"
          onPress={handleGenerate}
          isLoading={isGenerating}
        />
      </div>

      {!latest ? (
        <p className="text-label-secondary">まだAI分析が生成されていません</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-label-secondary">
            状態：{latest.status === "confirmed" ? "確定済み" : "下書き"}
          </p>
          <div className="space-y-4">
            {draftContents &&
              (Object.keys(CATEGORY_LABELS) as (keyof AIAnalysisContents)[]).map(
                (key) => (
                  <div
                    key={key}
                    className="rounded-card border border-black/10 bg-surface p-4 shadow-card"
                  >
                    <h3 className="mb-2 text-sm font-semibold text-label-secondary">
                      {CATEGORY_LABELS[key]}
                    </h3>
                    <textarea
                      value={draftContents[key]}
                      disabled={latest.status === "confirmed"}
                      onChange={(e) =>
                        setDraftContents((prev) =>
                          prev ? { ...prev, [key]: e.target.value } : prev
                        )
                      }
                      rows={3}
                      className="w-full rounded-card border border-black/10 bg-background px-3 py-2 text-sm disabled:opacity-60"
                    />
                  </div>
                )
              )}
          </div>

          {latest.status !== "confirmed" && (
            <div className="mt-4 flex gap-2">
              <PrimaryButton
                label="下書き保存"
                onPress={() => handleSave(false)}
                isLoading={isSaving}
                variant="secondary"
              />
              <PrimaryButton
                label="確定して保存"
                onPress={() => handleSave(true)}
                isLoading={isSaving}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AIAnalysisPage() {
  return (
    <AdminGuard>
      <AdminNav />
      <AIAnalysisContent />
    </AdminGuard>
  );
}
