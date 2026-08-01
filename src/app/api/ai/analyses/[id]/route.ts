/**
 * PATCH /api/ai/analyses/:id
 * 参照：詳細設計書 4章 API設計、6章 AI設計（draft編集可・confirmed後はロック）
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/adminSession";
import { apiError } from "@/lib/apiAuth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const adminId = verifySessionCookieValue(cookieValue);
  if (!adminId) {
    return apiError("UNAUTHORIZED", "管理者セッションが必要です", 401);
  }

  let body: { contents?: Record<string, string>; confirm?: boolean };
  try {
    body = await req.json();
  } catch {
    return apiError("VALIDATION_ERROR", "リクエスト形式が不正です", 400);
  }
  const { contents, confirm } = body;

  try {
    const ref = adminDb.collection("aiAnalyses").doc(params.id);
    const snap = await ref.get();
    if (!snap.exists) {
      return apiError("NOT_FOUND", "分析が見つかりません", 404);
    }

    const current = snap.data()!;
    // 6章: confirmed後はロックし、新しいdraftとして再編集を開始する複製フローのみ許可
    if (current.status === "confirmed") {
      return apiError(
        "VALIDATION_ERROR",
        "確定済みの分析は編集できません。再生成して新しい下書きを作成してください",
        400
      );
    }

    const update: Record<string, unknown> = { editedBy: adminId };
    if (contents) {
      // 空欄保存は不可（1-12画面仕様）
      const hasEmpty = Object.values(contents).some(
        (v) => typeof v === "string" && v.trim().length === 0
      );
      if (hasEmpty) {
        return apiError("VALIDATION_ERROR", "空欄のまま保存することはできません", 400);
      }
      update.contents = contents;
    }
    if (confirm === true) {
      update.status = "confirmed";
    }

    await ref.update(update);
    const updatedSnap = await ref.get();
    return Response.json({ id: ref.id, ...updatedSnap.data() });
  } catch {
    return apiError("VALIDATION_ERROR", "保存に失敗しました", 500);
  }
}
