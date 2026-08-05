/**
 * GET /api/active-year
 * 参照：1-6画面仕様（管理者用URLアクセス時の代替導線）
 *
 * ログイン画面がyearId未指定でアクセスされた場合（ホーム画面追加アイコン経由等）に、
 * 現在isActive:trueの年度IDを自動解決するための公開API。
 * yearIdのみを返し、accessToken等の機密フィールドは含めない。
 *
 * 動的関数を使わないGETルートはNext.jsが静的最適化（ビルド時に1回だけ実行しキャッシュ）
 * してしまうため、force-dynamicで毎リクエスト実行を強制する（実際に発生した不具合対応）。
 */

export const dynamic = "force-dynamic";

import { adminDb } from "@/lib/firebase-admin";
import { apiError } from "@/lib/apiAuth";

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("years")
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return apiError("NOT_FOUND", "現行年度が設定されていません", 404);
    }

    return Response.json({ yearId: snapshot.docs[0].id });
  } catch {
    return apiError("VALIDATION_ERROR", "年度情報の取得に失敗しました", 500);
  }
}
