/**
 * 管理者セッションCookie（Next.js API Routes向け、httpOnly）
 * 参照：詳細設計書 4章 認証・権限方針
 *       Firestoreへのアクセス制御にはこのCookieを使わず、Firebase Auth Custom Tokenを使用する
 */

import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? "dev-secret-change-me";

function sign(value: string): string {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}

export function createSessionCookieValue(adminId: string): string {
  const signature = sign(adminId);
  return `${adminId}.${signature}`;
}

export function verifySessionCookieValue(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const [adminId, signature] = cookieValue.split(".");
  if (!adminId || !signature) return null;

  const expected = sign(adminId);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, actualBuf)) return null;

  return adminId;
}

export { SESSION_COOKIE_NAME };
