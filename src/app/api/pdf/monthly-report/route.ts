/**
 * POST /api/pdf/monthly-report
 * 月次のリスクアセスメント・ヒヤリハット記録集計をPDF化する（紙の様式を再現）
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/adminSession";
import { apiError } from "@/lib/apiAuth";
import {
  generateMonthlyReportPdf,
  MonthlyTableRow,
} from "@/lib/pdf/generateMonthlyReportPdf";

export async function POST(req: NextRequest) {
  const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const adminId = verifySessionCookieValue(cookieValue);
  if (!adminId) {
    return apiError("UNAUTHORIZED", "管理者セッションが必要です", 401);
  }

  const { yearId, monthStart, monthEnd, monthLabel, selectedReportIds, countermeasures } =
    await req.json();

  if (!yearId || !monthStart || !monthEnd) {
    return apiError("VALIDATION_ERROR", "yearId・monthStart・monthEndは必須です", 400);
  }

  const start = new Date(monthStart);
  const end = new Date(monthEnd);

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

  const riskItems = riskItemsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as { id: string; name: string; order: number; isSystemItem: boolean })
    .filter((r) => !r.isSystemItem)
    .sort((a, b) => a.order - b.order);
  const riskItemNames = riskItems.map((r) => r.name);
  const riskItemIndex = new Map(riskItems.map((r, i) => [r.id, i]));

  // 日付×作業内容の単位でグルーピング（同じ日に同じ作業内容の記録が複数あれば合算）
  const groups = new Map<string, { label: string; date: Date; counts: number[] }>();
  const monthlyTotals = new Array(riskItemNames.length).fill(0);

  reportsSnap.docs.forEach((d) => {
    const r = d.data();
    const date = r.createdAt.toDate();
    const taskName =
      r.taskId === "other" ? r.taskOtherText ?? "その他" : taskNameMap.get(r.taskId) ?? "不明";
    const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const groupKey = `${dateKey}__${r.taskId}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        label: `${date.getMonth() + 1}/${date.getDate()} ${taskName}`,
        date,
        counts: new Array(riskItemNames.length).fill(0),
      });
    }
    const group = groups.get(groupKey)!;
    (r.riskItemIds as string[]).forEach((riskItemId) => {
      const idx = riskItemIndex.get(riskItemId);
      if (idx !== undefined) {
        group.counts[idx] += 1;
        monthlyTotals[idx] += 1;
      }
    });
  });

  const sortedGroups = [...groups.values()].sort((a, b) => a.date.getTime() - b.date.getTime());

  const rows: MonthlyTableRow[] = [
    {
      label: "月合計",
      counts: monthlyTotals,
      total: monthlyTotals.reduce((a, b) => a + b, 0),
      isSummaryRow: true,
    },
    ...sortedGroups.map((g) => ({
      label: g.label,
      counts: g.counts,
      total: g.counts.reduce((a, b) => a + b, 0),
    })),
  ];

  // 「今月のヒヤリハット」欄：教官が選んだレポートの自由記述を、選んだ順のまま掲載
  const reportsById = new Map(reportsSnap.docs.map((d) => [d.id, d.data()]));
  const idsToFeature: string[] = Array.isArray(selectedReportIds) ? selectedReportIds : [];
  const hiyariHattoItems = idsToFeature.map((id) => {
    const r = reportsById.get(id);
    return r?.freeText?.trim() || "（自由記述なし）";
  });
  const countermeasureTexts: string[] = Array.isArray(countermeasures)
    ? countermeasures
    : idsToFeature.map(() => "");

  const now = new Date();
  const pdfBytes = await generateMonthlyReportPdf({
    title: "器工具・リスクアセスメント記録集計",
    monthLabel: monthLabel ?? `${start.getMonth() + 1}月`,
    generatedDateLabel: now.toLocaleDateString("ja-JP"),
    personInChargeLabel: "安全管理担当",
    riskItemNames,
    rows,
    hiyariHattoItems,
    countermeasures: countermeasureTexts,
  });

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="monthly-report.pdf"`,
    },
  });
}
