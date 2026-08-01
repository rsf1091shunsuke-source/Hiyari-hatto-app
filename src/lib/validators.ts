/**
 * バリデーションロジック
 * 参照：詳細設計書 1-9（危険項目管理）/ 1-10（作業内容管理）/
 *       1-11（訓練生管理）/ 1-14（設定・年度管理）/ 1-6（QRログイン）
 */

import { query, where, getDocs } from "firebase/firestore";
import { riskItemsCol, tasksCol, studentsCol, yearsCol } from "./collections";

import { RiskItem } from "@/types/firestore";

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

const RISK_ITEM_NAME_MAX_LENGTH = 20; // 1-9画面仕様: 名称（必須・最大20文字）

/**
 * 危険項目の名称バリデーション（形式チェックのみ、重複チェックは別関数）
 * 1-9画面仕様: 名称必須
 */
export function validateRiskItemNameFormat(name: string): ValidationResult {
  if (name.trim().length === 0) {
    return { isValid: false, errorMessage: "名称を入力してください" };
  }
  if (name.length > RISK_ITEM_NAME_MAX_LENGTH) {
    return {
      isValid: false,
      errorMessage: `名称は${RISK_ITEM_NAME_MAX_LENGTH}文字以内で入力してください`,
    };
  }
  return { isValid: true };
}

/**
 * 危険項目の名称重複チェック
 * 1-9画面仕様 エラー表示: 「同じ名称の項目が既に存在します」
 */
export async function checkRiskItemNameDuplicate(
  yearId: string,
  name: string,
  excludeId?: string
): Promise<ValidationResult> {
  const q = query(
    riskItemsCol,
    where("yearId", "==", yearId),
    where("name", "==", name)
  );
  const snapshot = await getDocs(q);
  const duplicated = snapshot.docs.some((doc) => doc.id !== excludeId);
  if (duplicated) {
    return {
      isValid: false,
      errorMessage: "同じ名称の項目が既に存在します",
    };
  }
  return { isValid: true };
}

/**
 * 作業内容の名称バリデーション
 * 1-10画面仕様: 「危険項目管理と同一構造（名称・有効フラグ・論理削除・重複チェック）」
 * のため、危険項目と同じ制約（必須・最大20文字）を適用する
 */
export function validateTaskNameFormat(name: string): ValidationResult {
  if (name.trim().length === 0) {
    return { isValid: false, errorMessage: "名称を入力してください" };
  }
  if (name.length > RISK_ITEM_NAME_MAX_LENGTH) {
    return {
      isValid: false,
      errorMessage: `名称は${RISK_ITEM_NAME_MAX_LENGTH}文字以内で入力してください`,
    };
  }
  return { isValid: true };
}

/** 作業内容の名称重複チェック（1-10画面仕様: 重複チェック） */
export async function checkTaskNameDuplicate(
  yearId: string,
  name: string,
  excludeId?: string
): Promise<ValidationResult> {
  const q = query(
    tasksCol,
    where("yearId", "==", yearId),
    where("name", "==", name)
  );
  const snapshot = await getDocs(q);
  const duplicated = snapshot.docs.some((doc) => doc.id !== excludeId);
  if (duplicated) {
    return {
      isValid: false,
      errorMessage: "同じ名称の項目が既に存在します",
    };
  }
  return { isValid: true };
}

/**
 * 出席番号の重複チェック
 * 3章 students インデックス欄: 「yearId+attendanceNumberで複合ユニーク」
 */
export async function checkAttendanceNumberDuplicate(
  yearId: string,
  attendanceNumber: number,
  excludeId?: string
): Promise<ValidationResult> {
  const q = query(
    studentsCol,
    where("yearId", "==", yearId),
    where("attendanceNumber", "==", attendanceNumber)
  );
  const snapshot = await getDocs(q);
  const duplicated = snapshot.docs.some((doc) => doc.id !== excludeId);
  if (duplicated) {
    return {
      isValid: false,
      errorMessage: "この出席番号は既に登録されています",
    };
  }
  return { isValid: true };
}

/**
 * 年度名の重複チェック
 * 1-14画面仕様 バリデーション: 「年度名の重複禁止」
 */
export async function checkYearNameDuplicate(
  name: string,
  excludeId?: string
): Promise<ValidationResult> {
  const q = query(yearsCol, where("name", "==", name));
  const snapshot = await getDocs(q);
  const duplicated = snapshot.docs.some((doc) => doc.id !== excludeId);
  if (duplicated) {
    return {
      isValid: false,
      errorMessage: "同じ名称の年度が既に存在します",
    };
  }
  return { isValid: true };
}

/**
 * PIN形式バリデーション
 * 1-6画面仕様 入力項目: 「QR読み取り後：4〜6桁PIN」
 */
export function validatePinFormat(pin: string): ValidationResult {
  if (!/^\d{4,6}$/.test(pin)) {
    return { isValid: false, errorMessage: "PINは4〜6桁の数字で入力してください" };
  }
  return { isValid: true };
}

/**
 * システム項目（isSystemItem: true）の名称編集・無効化を防ぐガード
 * 3章 riskItemsスキーマ: 「管理者は名称編集・無効化不可」
 */
export function assertRiskItemEditable(riskItem: RiskItem): ValidationResult {
  if (riskItem.isSystemItem) {
    return {
      isValid: false,
      errorMessage: "「特になし」はシステム項目のため編集・無効化できません",
    };
  }
  return { isValid: true };
}
