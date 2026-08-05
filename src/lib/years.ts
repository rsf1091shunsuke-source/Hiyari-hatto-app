/**
 * 年度作成ロジック
 * 参照：詳細設計書 3章 riskItemsスキーマ（isSystemItem）/ yearsスキーマ（accessToken）
 *       1-14画面仕様（年度作成フォーム）
 *
 * 年度作成時、riskItemsに isSystemItem: true の「特になし」を1件自動生成する（3章の記載）。
 * 年度ドキュメントとシステム項目ドキュメントを writeBatch で同時にコミットし、
 * 片方だけが作成された中途半端な状態が残らないようにする。
 * accessTokenは訓練生入力画面用マスタデータ取得API（GET /api/students等）の検証に使用する。
 */

import { doc, writeBatch, Timestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase-client";
import { yearsCol, riskItemsCol } from "./collections";
import { checkYearNameDuplicate } from "./validators";
import { DEFAULT_SCHOOL_ID } from "./config";
import { Year, RiskItem, NONE_RISK_ITEM_NAME } from "@/types/firestore";

export interface CreateYearResult {
  year: Year;
  systemRiskItem: RiskItem;
}

export interface CreateYearError {
  errorMessage: string;
}

export async function createYear(
  name: string,
  startDate: Date
): Promise<CreateYearResult | CreateYearError> {
  // 1-14画面仕様 バリデーション: 年度名の重複禁止
  const nameCheck = await checkYearNameDuplicate(name);
  if (!nameCheck.isValid) {
    return { errorMessage: nameCheck.errorMessage! };
  }
  if (name.trim().length === 0) {
    return { errorMessage: "年度名を入力してください" };
  }

  const yearRef = doc(yearsCol);
  const riskItemRef = doc(riskItemsCol);

  const yearData: Omit<Year, "id"> = {
    schoolId: DEFAULT_SCHOOL_ID,
    name,
    startDate: Timestamp.fromDate(startDate),
    isActive: true,
    accessToken: crypto.randomUUID(), // 3章: 訓練生入力用の年度単位アクセストークン
  };

  const systemRiskItemData: Omit<RiskItem, "id"> = {
    yearId: yearRef.id,
    name: NONE_RISK_ITEM_NAME,
    relatedTaskIds: [], // 3章: システム項目は空配列で全作業内容共通表示
    order: 0,
    isActive: true,
    isSystemItem: true,
  };

  // isActive:trueの年度が複数併存すると、現行年度の自動解決（/api/active-year等）が
  // 不安定になり管理者ログイン等に支障が出るため、既存の有効年度は同一batchで無効化する
  const activeYearsSnapshot = await getDocs(query(yearsCol, where("isActive", "==", true)));

  const batch = writeBatch(db);
  activeYearsSnapshot.docs.forEach((d) => {
    batch.update(d.ref, { isActive: false });
  });
  batch.set(yearRef, yearData);
  batch.set(riskItemRef, systemRiskItemData);
  await batch.commit();

  return {
    year: { id: yearRef.id, ...yearData },
    systemRiskItem: { id: riskItemRef.id, ...systemRiskItemData },
  };
}

/** 作成結果がエラーかどうかを判定するタイプガード */
export function isCreateYearError(
  result: CreateYearResult | CreateYearError
): result is CreateYearError {
  return "errorMessage" in result;
}
