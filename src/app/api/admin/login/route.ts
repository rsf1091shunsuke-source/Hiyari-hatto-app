/**
 * POST /api/admin/login
 * 参照：詳細設計書 4章 API設計、1-6画面仕様
 */

import { NextRequest } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { verifyPin } from "@/lib/pin";
import { createSessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/adminSession";
import { apiError } from "@/lib/apiAuth";

const MAX_ATTEMPTS = 10; // 学校Wi-Fi等の共有IP環境で他利用者の誤入力により巻き込まれにくいよう緩和
const LOCK_MS = 15000;

// 簡易レート制限（インメモリ、単一インスタンス運用が前提。将来的な多重デプロイ時はストア外出しを検討）
const attemptStore = new Map<string, { count: number; lockedUntil: number }>();

export async function POST(req: NextRequest) {
  const { yearId, pin } = await req.json();

  if (!pin) {
    return apiError("VALIDATION_ERROR", "PINは必須です", 400);
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const attemptKey = `${ip}:${yearId ?? "any"}`;
  const attempt = attemptStore.get(attemptKey);
  if (attempt && attempt.lockedUntil > Date.now()) {
    return apiError(
      "RATE_LIMITED",
      "試行回数が上限に達しました。しばらくしてから再度お試しください",
      429
    );
  }

  // yearIdが指定されていればその年度の担当管理者に絞る。未指定（現行年度の自動解決に失敗した場合等）
  // でもPIN自体で照合できるよう、admins全件からPIN一致を先に探す方式にする。
  // これにより「現行年度（isActive）の特定」がFirestore側のデータ不整合等で揺れても、
  // PINが正しい限りログインできる（年度データの状態に左右されない堅牢な認証）。
  const adminsSnapshot = yearId
    ? await adminDb.collection("admins").where("assignedYearIds", "array-contains", yearId).get()
    : await adminDb.collection("admins").get();

  const matchedAdmin = adminsSnapshot.docs.find((doc) =>
    verifyPin(pin, doc.data().pinHash)
  );

  if (!matchedAdmin) {
    const current = attemptStore.get(attemptKey) ?? { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= MAX_ATTEMPTS) {
      current.lockedUntil = Date.now() + LOCK_MS;
      current.count = 0;
    }
    attemptStore.set(attemptKey, current);
    return apiError("UNAUTHORIZED", "PINが正しくありません", 401);
  }

  attemptStore.delete(attemptKey);

  // ログインに使うyearIdを解決：指定されたyearIdがこの管理者の担当年度なら維持し、
  // なければ担当年度のうち現在isActive:trueのものを優先、それも無ければ担当年度の先頭を使う。
  const assignedYearIds: string[] = matchedAdmin.data().assignedYearIds ?? [];
  let resolvedYearId = yearId && assignedYearIds.includes(yearId) ? yearId : undefined;
  if (!resolvedYearId && assignedYearIds.length > 0) {
    const yearsSnapshot = await adminDb
      .collection("years")
      .where("__name__", "in", assignedYearIds.slice(0, 30))
      .get();
    const activeAmongAssigned = yearsSnapshot.docs.find((d) => d.data().isActive === true);
    resolvedYearId = activeAmongAssigned?.id ?? assignedYearIds[0];
  }

  const adminId = matchedAdmin.id;
  const customToken = await adminAuth.createCustomToken(adminId, { role: "admin" });
  const sessionValue = createSessionCookieValue(adminId);

  const res = Response.json({ customToken, adminId, yearId: resolvedYearId });
  res.headers.set(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${sessionValue}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
  return res;
}
