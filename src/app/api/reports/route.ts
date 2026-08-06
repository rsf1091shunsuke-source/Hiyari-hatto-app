/**
 * POST /api/reports
 * 参照：詳細設計書 4章 API設計、3章 reportsスキーマ、1-3/1-4画面仕様
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { validateYearAccessToken, apiError } from "@/lib/apiAuth";
import { Timestamp } from "firebase-admin/firestore";

const FREE_TEXT_MAX_LENGTH = 200; // 1-4画面仕様
const DUPLICATE_WINDOW_MS = 5000; // 1-1画面仕様: 同一出席番号での5秒以内の連続送信をブロック

interface ReportsRequestBody {
  yearId: string;
  token: string;
  studentId: string;
  taskId: string;
  taskOtherText?: string | null;
  riskItemIds: string[];
  freeText: string | null;
}

export async function POST(req: NextRequest) {
  let body: ReportsRequestBody;
  try {
    body = await req.json();
  } catch (err) {
    console.error("[/api/reports] failed:", err);
    return apiError("VALIDATION_ERROR", "リクエスト形式が不正です", 400);
  }

  const { yearId, token, studentId, taskId, taskOtherText, riskItemIds, freeText } = body;

  const check = await validateYearAccessToken(yearId, token);
  if (!check.isValid) {
    return apiError("UNAUTHORIZED", check.errorMessage!, 401);
  }

  if (!studentId || !taskId) {
    return apiError("VALIDATION_ERROR", "出席番号と作業内容は必須です", 400);
  }
  // 1-3画面仕様: riskItemIdsは必ず1件以上（空配列不可、特になしはシステム項目IDを格納）
  if (!Array.isArray(riskItemIds) || riskItemIds.length === 0) {
    return apiError("VALIDATION_ERROR", "危険項目を選択してください", 400);
  }
  if (freeText && freeText.length > FREE_TEXT_MAX_LENGTH) {
    return apiError(
      "VALIDATION_ERROR",
      `自由記述は${FREE_TEXT_MAX_LENGTH}文字以内で入力してください`,
      400
    );
  }

  // サーバー側でも二重送信防止（1-1画面仕様のクライアント側制御に加えた防御）
  try {
    const recentCutoff = Timestamp.fromMillis(Date.now() - DUPLICATE_WINDOW_MS);
    const recentSnapshot = await adminDb
      .collection("reports")
      .where("yearId", "==", yearId)
      .where("studentId", "==", studentId)
      .where("createdAt", ">=", recentCutoff)
      .limit(1)
      .get();
    if (!recentSnapshot.empty) {
      return apiError(
        "RATE_LIMITED",
        "直前に送信済みです。しばらくしてから再度お試しください",
        429
      );
    }

    const reportRef = adminDb.collection("reports").doc();
    await reportRef.set({
      yearId,
      studentId,
      taskId,
      taskOtherText: taskOtherText ?? null,
      riskItemIds,
      freeText: freeText ?? null,
      createdAt: Timestamp.now(),
      isDeleted: false,
    });

    return Response.json({ id: reportRef.id }, { status: 201 });
  } catch (err) {
    console.error("[/api/reports] failed:", err);
    return apiError("VALIDATION_ERROR", "送信に失敗しました", 500);
  }
}
