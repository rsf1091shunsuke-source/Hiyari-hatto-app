/**
 * PINハッシュ化ユーティリティ
 * 参照：詳細設計書 3章 admins.pinHash
 *
 * 追加の依存パッケージ（bcrypt等）を導入せず、Node標準のcrypto.scryptを使用する。
 */

import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(pin, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPin(pin: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derivedKey = scryptSync(pin, salt, KEY_LENGTH);
  const keyBuffer = Buffer.from(key, "hex");
  if (derivedKey.length !== keyBuffer.length) return false;
  return timingSafeEqual(derivedKey, keyBuffer);
}
