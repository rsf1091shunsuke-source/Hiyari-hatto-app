/**
 * POST /api/pdf/generate
 * 参照：詳細設計書 4章 API設計、7章 PDF設計
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/adminSession";
import { apiError } from "@/lib/apiAuth";
import { generateReportPdf } from "@/lib/pdf/generateReportPdf";

export async function POST(req: NextRequest) {
  const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const adminId = verifySessionCookieValue(cookieValue);
  if (!adminId) {
    return apiError("UNAUTHORIZED", "管理者セッションが必要です", 401);
  }

  const { analysisId } = await req.json();
  if (!analysisId) {
    return apiError("VALIDATION_ERROR", "analysisIdは必須です", 400);
  }

  const analysisSnap = await adminDb.collection("aiAnalyses").doc(analysisId).get();
  if (!analysisSnap.exists) {
    return apiError("NOT_FOUND", "分析が見つかりません", 404);
  }
  const analysis = analysisSnap.data()!;
  // 1-13画面仕様: AI分析が未確定の場合は出力不可
  if (analysis.status !== "confirmed") {
    return apiError(
      "VALIDATION_ERROR",
      "AI分析が確定されていないためPDFを出力できません",
      400
    );
  }

  const periodStart = analysis.periodStart.toDate();
  const periodEnd = analysis.periodEnd.toDate();

  const [reportsSnap, tasksSnap, riskItemsSnap] = await Promise.all([
    adminDb
      .collection("reports")
      .where("yearId", "==", analysis.yearId)
      .where("isDeleted", "==", false)
      .where("createdAt", ">=", periodStart)
      .where("createdAt", "<=", periodEnd)
      .get(),
    adminDb.collection("tasks").where("yearId", "==", analysis.yearId).get(),
    adminDb.collection("riskItems").where("yearId", "==", analysis.yearId).get(),
  ]);

  const taskNameMap = new Map(tasksSnap.docs.map((d) => [d.id, d.data().name]));
  const riskItemMap = new Map(
    riskItemsSnap.docs.map((d) => [d.id, { name: d.data().name, isSystemItem: d.data().isSystemItem }])
  );

  const riskItemCounts = new Map<string, number>();
  const taskCounts = new Map<string, number>();
  reportsSnap.docs.forEach((d) => {
    const r = d.data();
    const taskName =
      r.taskId === "other" ? r.taskOtherText ?? "その他" : taskNameMap.get(r.taskId) ?? "不明";
    taskCounts.set(taskName, (taskCounts.get(taskName) ?? 0) + 1);
    (r.riskItemIds as string[]).forEach((id) => {
      const item = riskItemMap.get(id);
      if (!item || item.isSystemItem) return;
      riskItemCounts.set(item.name, (riskItemCounts.get(item.name) ?? 0) + 1);
    });
  });

  const toRanking = (m: Map<string, number>) =>
    [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

  const pdfBytes = await generateReportPdf({
    dateLabel: new Date().toLocaleDateString("ja-JP"),
    periodLabel: `${periodStart.toLocaleDateString("ja-JP")} 〜 ${periodEnd.toLocaleDateString("ja-JP")}`,
    totalReports: reportsSnap.size,
    riskItemRanking: toRanking(riskItemCounts),
    taskRanking: toRanking(taskCounts),
    aiContents: analysis.contents,
  });

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report-${analysisId}.pdf"`,
    },
  });
}
