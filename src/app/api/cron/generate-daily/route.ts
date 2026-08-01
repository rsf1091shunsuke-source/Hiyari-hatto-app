/**
 * GET /api/cron/generate-daily
 * 参照：詳細設計書 6章 AI設計（生成タイミング：Vercel Cron Jobsによる自動生成）
 *       8章 技術設計（AI自動生成トリガー：Vercel Cron Jobs）
 *
 * Vercelのcron設定（vercel.json）から呼び出される。
 * CRON_SECRETによる簡易認証で、外部からの不正呼び出しを防ぐ。
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { generateAndSaveAnalysis } from "@/lib/ai/generateAndSave";
import { apiError } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return apiError("UNAUTHORIZED", "認証に失敗しました", 401);
  }

  const yearsSnap = await adminDb
    .collection("years")
    .where("isActive", "==", true)
    .get();

  const results = [];
  for (const yearDoc of yearsSnap.docs) {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setHours(0, 0, 0, 0);

    try {
      const { analysisId } = await generateAndSaveAnalysis(
        yearDoc.id,
        "daily",
        periodStart,
        periodEnd
      );
      results.push({ yearId: yearDoc.id, analysisId, status: "success" });
    } catch {
      results.push({ yearId: yearDoc.id, status: "failed" });
    }
  }

  return Response.json({ results });
}
