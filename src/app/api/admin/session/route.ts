/**
 * GET /api/admin/session
 * 参照：詳細設計書 4章 API設計
 */

import { NextRequest } from "next/server";
import { verifySessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/adminSession";
import { apiError } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const adminId = verifySessionCookieValue(cookieValue);

  if (!adminId) {
    return apiError("UNAUTHORIZED", "セッションが無効です", 401);
  }

  return Response.json({ adminId });
}
