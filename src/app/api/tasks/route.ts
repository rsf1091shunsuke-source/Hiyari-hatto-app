/**
 * GET /api/tasks
 * 参照：詳細設計書 4章 API設計
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
      .collection("tasks")
      .where("yearId", "==", yearId)
      .where("isActive", "==", true)
      .orderBy("order", "asc")
      .get();

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      order: doc.data().order,
    }));

    return Response.json({ items });
  } catch (err) {
    console.error("[/api/tasks] failed:", err);
    return apiError("VALIDATION_ERROR", "データの取得に失敗しました", 500);
  }
}
