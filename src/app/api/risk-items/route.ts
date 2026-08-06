/**
 * GET /api/risk-items
 * 参照：詳細設計書 4章 API設計（relatedTaskIds・isSystemItemを含め動的優先表示を可能にする）
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { validateYearAccessToken, apiError } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const yearId = searchParams.get("yearId");
  const token = searchParams.get("token");

  const check = await validateYearAccessToken(yearId, token);
  if (!check.isValid) {
    return apiError("UNAUTHORIZED", check.errorMessage!, 401);
  }

  try {
    const snapshot = await adminDb
      .collection("riskItems")
      .where("yearId", "==", yearId)
      .where("isActive", "==", true)
      .orderBy("order", "asc")
      .get();

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      relatedTaskIds: doc.data().relatedTaskIds ?? [],
      order: doc.data().order,
      isSystemItem: doc.data().isSystemItem ?? false,
    }));

    return Response.json({ items });
  } catch (err) {
    console.error("[/api/risk-items] failed:", err);
    return apiError("VALIDATION_ERROR", "データの取得に失敗しました", 500);
  }
}
