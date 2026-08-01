/**
 * POST /api/students/import
 * 参照：詳細設計書 4章 API設計、1-11画面仕様（CSV一括登録：行単位エラーハンドリング）
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/adminSession";
import { apiError } from "@/lib/apiAuth";

interface ImportRow {
  attendanceNumber: number;
  groupName: string;
}

interface ImportRequestBody {
  yearId: string;
  rows: ImportRow[];
}

export async function POST(req: NextRequest) {
  const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const adminId = verifySessionCookieValue(cookieValue);
  if (!adminId) {
    return apiError("UNAUTHORIZED", "管理者セッションが必要です", 401);
  }

  const { yearId, rows }: ImportRequestBody = await req.json();
  if (!yearId || !Array.isArray(rows)) {
    return apiError("VALIDATION_ERROR", "yearIdとrowsは必須です", 400);
  }

  // 既存の出席番号を取得し重複チェック（1-11画面仕様: 出席番号重複チェック）
  const existingSnapshot = await adminDb
    .collection("students")
    .where("yearId", "==", yearId)
    .get();
  const existingNumbers = new Set(
    existingSnapshot.docs.map((d) => d.data().attendanceNumber)
  );

  const errors: { row: number; message: string }[] = [];
  const seenInBatch = new Set<number>();
  let insertedCount = 0;

  const batch = adminDb.batch();

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    if (
      typeof row.attendanceNumber !== "number" ||
      Number.isNaN(row.attendanceNumber) ||
      !row.groupName
    ) {
      errors.push({ row: rowNumber, message: "出席番号または班名が不正です" });
      return;
    }
    if (existingNumbers.has(row.attendanceNumber) || seenInBatch.has(row.attendanceNumber)) {
      errors.push({ row: rowNumber, message: "出席番号が重複しています" });
      return;
    }
    seenInBatch.add(row.attendanceNumber);

    const ref = adminDb.collection("students").doc();
    batch.set(ref, {
      yearId,
      attendanceNumber: row.attendanceNumber,
      groupName: row.groupName,
      isActive: true,
    });
    insertedCount += 1;
  });

  if (insertedCount > 0) {
    await batch.commit();
  }

  return Response.json({ insertedCount, errors });
}
