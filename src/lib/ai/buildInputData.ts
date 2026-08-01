/**
 * AI分析用の入力データ構造化
 * 参照：詳細設計書 6章 AI設計
 */

import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export interface AIInputData {
  periodType: string;
  totalReports: number;
  inputRate: number;
  noneReportsCount: number;
  riskItemCounts: { name: string; count: number }[];
  taskCounts: { name: string; count: number }[];
  crossTab: { task: string; riskItem: string; count: number }[];
  newlyAppearedRiskItems: string[];
}

export async function buildAIInputData(
  yearId: string,
  periodType: string,
  periodStart: Date,
  periodEnd: Date
): Promise<AIInputData> {
  const [reportsSnap, studentsSnap, tasksSnap, riskItemsSnap, pastReportsSnap] =
    await Promise.all([
      adminDb
        .collection("reports")
        .where("yearId", "==", yearId)
        .where("isDeleted", "==", false)
        .where("createdAt", ">=", Timestamp.fromDate(periodStart))
        .where("createdAt", "<=", Timestamp.fromDate(periodEnd))
        .get(),
      adminDb
        .collection("students")
        .where("yearId", "==", yearId)
        .where("isActive", "==", true)
        .get(),
      adminDb.collection("tasks").where("yearId", "==", yearId).get(),
      adminDb.collection("riskItems").where("yearId", "==", yearId).get(),
      adminDb
        .collection("reports")
        .where("yearId", "==", yearId)
        .where("isDeleted", "==", false)
        .where("createdAt", "<", Timestamp.fromDate(periodStart))
        .get(),
    ]);

  const taskNameMap = new Map(tasksSnap.docs.map((d) => [d.id, d.data().name]));
  const riskItemMap = new Map(
    riskItemsSnap.docs.map((d) => [d.id, { name: d.data().name, isSystemItem: d.data().isSystemItem }])
  );

  const reports = reportsSnap.docs.map((d) => d.data());
  const totalReports = reports.length;

  const submittedStudentIds = new Set(reports.map((r) => r.studentId));
  const inputRate =
    studentsSnap.size > 0 ? submittedStudentIds.size / studentsSnap.size : 0;

  let noneReportsCount = 0;
  const riskItemCountMap = new Map<string, number>();
  const crossTabMap = new Map<string, number>();

  reports.forEach((r) => {
    const taskName =
      r.taskId === "other" ? r.taskOtherText ?? "その他" : taskNameMap.get(r.taskId) ?? "不明";

    (r.riskItemIds as string[]).forEach((id: string) => {
      const item = riskItemMap.get(id);
      if (!item) return;
      if (item.isSystemItem) {
        noneReportsCount += 1;
        return;
      }
      riskItemCountMap.set(item.name, (riskItemCountMap.get(item.name) ?? 0) + 1);
      const crossKey = `${taskName}::${item.name}`;
      crossTabMap.set(crossKey, (crossTabMap.get(crossKey) ?? 0) + 1);
    });
  });

  const taskCountMap = new Map<string, number>();
  reports.forEach((r) => {
    const taskName =
      r.taskId === "other" ? r.taskOtherText ?? "その他" : taskNameMap.get(r.taskId) ?? "不明";
    taskCountMap.set(taskName, (taskCountMap.get(taskName) ?? 0) + 1);
  });

  const pastRiskItemIds = new Set(
    pastReportsSnap.docs.flatMap((d) => d.data().riskItemIds as string[])
  );
  const currentRiskItemIds = new Set(reports.flatMap((r) => r.riskItemIds as string[]));
  const newlyAppearedRiskItems = [...currentRiskItemIds]
    .filter((id) => !pastRiskItemIds.has(id))
    .map((id) => riskItemMap.get(id))
    .filter((item) => item && !item.isSystemItem)
    .map((item) => item!.name);

  return {
    periodType,
    totalReports,
    inputRate,
    noneReportsCount,
    riskItemCounts: [...riskItemCountMap.entries()].map(([name, count]) => ({
      name,
      count,
    })),
    taskCounts: [...taskCountMap.entries()].map(([name, count]) => ({ name, count })),
    crossTab: [...crossTabMap.entries()].map(([key, count]) => {
      const [task, riskItem] = key.split("::");
      return { task, riskItem, count };
    }),
    newlyAppearedRiskItems,
  };
}
