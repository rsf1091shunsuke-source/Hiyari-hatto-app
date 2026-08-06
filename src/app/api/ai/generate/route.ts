/**
 * POST /api/ai/generate
 * 参照：詳細設計書 4章 API設計、6章 AI設計
 */

import { NextRequest } from "next/server";
import { verifySessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/adminSession";
import { apiError } from "@/lib/apiAuth";
import { generateAndSaveAnalysis } from "@/lib/ai/generateAndSave";

export async function POST(req: NextRequest) {
  const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const adminId = verifySessionCookieValue(cookieValue);
  if (!adminId) {
    return apiError("UNAUTHORIZED", "管理者セッションが必要です", 401);
  }

  const { yearId, periodType, periodStart, periodEnd } = await req.json();
  if (!yearId || !periodType || !periodStart || !periodEnd) {
    return apiError("VALIDATION_ERROR", "必須項目が不足しています", 400);
  }

  try {
    const { analysisId, contents } = await generateAndSaveAnalysis(
      yearId,
      periodType,
      new Date(periodStart),
      new Date(periodEnd)
    );

    return Response.json({
      analysisId,
      status: "draft",
      contents,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[/api/ai/generate] failed:", err);
    return apiError(
      "AI_GENERATION_FAILED",
      "分析の生成に失敗しました。時間をおいて再試行してください。",
      500
    );
  }
}
