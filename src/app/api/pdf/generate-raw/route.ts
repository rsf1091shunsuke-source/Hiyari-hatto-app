/**
 * POST /api/pdf/generate-raw
 * ヒヤリハット記録の一覧（日時・作業内容・危険項目）をPDF化する。
 * AI分析機能とは独立して動作する。
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/adminSession";
import { apiError } from "@/lib/apiAuth";
import { generateRawReportsPdf, RawReportRow } from "@/lib/pdf/generateRawReportsPdf";

export async function POST(req: NextRequest) {
  const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const adminId = verifySessionCookieValue(cookieValue);
  if (!adminId) {
    return apiError("UNAUTHORIZED", "管理者セッションが必要です", 401);
  }

  const { yearId, periodStart, periodEnd } = await req.json();
  if (!yearId || !periodStart || !periodEnd) {
    return apiError("VALIDATION_ERROR", "yearId・periodStart・periodEndは必須です", 400);
  }

  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  try {
    const [reportsSnap, tasksSnap, riskItemsSnap] = await Promise.all([
      adminDb
        .collection("reports")
        .where("yearId", "==", yearId)
        .where("isDeleted", "==", false)
        .where("createdAt", ">=", start)
        .where("createdAt", "<=", end)
        .orderBy("createdAt", "asc")
        .get(),
      adminDb.collection("tasks").where("yearId", "==", yearId).get(),
      adminDb.collection("riskItems").where("yearId", "==", yearId).get(),
    ]);

    const taskNameMap = new Map(tasksSnap.docs.map((d) => [d.id, d.data().name as string]));
    const riskItemNameMap = new Map(
      riskItemsSnap.docs.map((d) => [d.id, d.data().name as string])
    );

    const rows: RawReportRow[] = reportsSnap.docs.map((d) => {
      const r = d.data();
      const taskName =
        r.taskId === "other" ? r.taskOtherText ?? "その他" : taskNameMap.get(r.taskId) ?? "不明";
      const riskItemNames = (r.riskItemIds as string[])
        .map((id) => riskItemNameMap.get(id))
        .filter((n): n is string => Boolean(n));
      return {
        dateTimeLabel: r.createdAt.toDate().toLocaleString("ja-JP"),
        taskName,
        riskItemNames,
        freeText: r.freeText ?? null,
      };
    });

    const pdfBytes = await generateRawReportsPdf({
      periodLabel: `${start.toLocaleDateString("ja-JP")} 〜 ${end.toLocaleDateString("ja-JP")}`,
      totalCount: rows.length,
      rows,
    });

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="hiyari-hatto-list.pdf"`,
      },
    });
  } catch (err) {
    console.error("[/api/pdf/generate-raw] failed:", err);
    return apiError("VALIDATION_ERROR", "PDF生成に失敗しました", 500);
  }
}
