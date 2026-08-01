/**
 * AI分析の生成＋保存（共通ロジック）
 * 参照：詳細設計書 6章 AI設計
 */

import { buildAIInputData } from "./buildInputData";
import { generateAIAnalysisContents } from "./claude";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function generateAndSaveAnalysis(
  yearId: string,
  periodType: string,
  periodStart: Date,
  periodEnd: Date
) {
  const inputData = await buildAIInputData(yearId, periodType, periodStart, periodEnd);
  const contents = await generateAIAnalysisContents(inputData);

  const analysisRef = adminDb.collection("aiAnalyses").doc();
  await analysisRef.set({
    yearId,
    periodType,
    periodStart: Timestamp.fromDate(periodStart),
    periodEnd: Timestamp.fromDate(periodEnd),
    status: "draft",
    generatedAt: Timestamp.now(),
    contents,
    editedBy: null,
  });

  return { analysisId: analysisRef.id, contents };
}
