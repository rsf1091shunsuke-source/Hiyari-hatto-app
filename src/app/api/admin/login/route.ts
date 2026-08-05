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

  if (!yearId || !pin) {
    return apiError("VALIDATION_ERROR", "yearIdとPINは必須です", 400);
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const attemptKey = `${ip}:${yearId}`;
  const attempt = attemptStore.get(attemptKey);
  if (attempt && attempt.lockedUntil > Date.now()) {
    return apiError(
      "RATE_LIMITED",
      "試行回数が上限に達しました。しばらくしてから再度お試しください",
      429
    );
  }

  const adminsSnapshot = await adminDb
    .collection("admins")
    .where("assignedYearIds", "array-contains", yearId)
    .get();

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

  const adminId = matchedAdmin.id;
  const customToken = await adminAuth.createCustomToken(adminId, { role: "admin" });
  const sessionValue = createSessionCookieValue(adminId);

  const res = Response.json({ customToken, adminId });
  res.headers.set(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${sessionValue}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
  return res;
}
