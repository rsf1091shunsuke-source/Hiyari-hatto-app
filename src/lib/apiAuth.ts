/**
 * 訓練生入力用APIの共通認可ロジック
 * 参照：詳細設計書 4章（GET /api/students, /api/tasks, /api/risk-items, POST /api/reports）
 */

import { adminDb } from "./firebase-admin";
import { Year } from "@/types/firestore";

export interface TokenValidationResult {
  isValid: boolean;
  year?: Year;
  errorMessage?: string;
}

export async function validateYearAccessToken(
  yearId: string | null,
  token: string | null
): Promise<TokenValidationResult> {
  if (!yearId || !token) {
    return { isValid: false, errorMessage: "yearIdとtokenは必須です" };
  }

  const snapshot = await adminDb.collection("years").doc(yearId).get();
  if (!snapshot.exists) {
    return { isValid: false, errorMessage: "年度が見つかりません" };
  }

  const year = { id: snapshot.id, ...snapshot.data() } as Year;

  if (!year.isActive) {
    return { isValid: false, errorMessage: "この年度は現在利用できません" };
  }
  if (year.accessToken !== token) {
    return { isValid: false, errorMessage: "アクセストークンが正しくありません" };
  }

  return { isValid: true, year };
}

export function apiError(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}
