/**
 * アプリ全体の固定設定値
 * 参照：詳細設計書 3章 years スキーマ（schoolId: 将来の複数校対応用、現状は固定値でよい）
 */

// 複数校対応（将来拡張）までは固定の学校IDを使用する
export const DEFAULT_SCHOOL_ID =
  process.env.NEXT_PUBLIC_DEFAULT_SCHOOL_ID ?? "default-school";
