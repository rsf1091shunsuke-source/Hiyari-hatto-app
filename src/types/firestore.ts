/**
 * Firestoreスキーマ型定義
 * 参照：詳細設計書 3章 データベース設計（詳細版）
 *
 * 本ファイルはyears / students / tasks / riskItems / adminsのみを対象とする（Task 0-2の範囲）。
 * reports / aiAnalysesはPhase 1・Phase 4の該当Taskで追加する。
 */

import { Timestamp } from "firebase/firestore";

/** 3章: years */
export interface Year {
  id: string;
  schoolId: string; // 将来の複数校対応用（現状は固定値でよい）
  name: string; // 例: "2026年度"
  startDate: Timestamp;
  isActive: boolean; // 現行年度フラグ
  accessToken: string; // 訓練生入力用の年度単位アクセストークン（年度作成時にランダム生成）
}

/** 3章: students */
export interface Student {
  id: string;
  yearId: string;
  attendanceNumber: number;
  groupName: string;
  isActive: boolean; // 論理削除フラグ
}

/** 3章: tasks（作業内容） */
export interface Task {
  id: string;
  yearId: string;
  name: string;
  order: number;
  isActive: boolean; // 論理削除
}

/**
 * 3章: riskItems（危険項目）
 * isSystemItem: true の場合「特になし」を表す予約項目。
 * 年度作成時に自動で1件生成し、管理者は名称編集・無効化不可（問題②反映）。
 */
export interface RiskItem {
  id: string;
  yearId: string;
  name: string; // システム項目の場合は固定名「特になし」
  relatedTaskIds: string[]; // システム項目は空配列（全作業内容共通表示）
  order: number;
  isActive: boolean;
  isSystemItem: boolean; // 初期値 false、システム項目のみ true
}

/** 3章: admins */
export interface Admin {
  id: string;
  pinHash: string; // ハッシュ化されたPIN
  role: string; // 将来の権限拡張用（現状は "admin" 固定）
  assignedYearIds: string[]; // 担当年度（将来の権限管理用）
}

/** 3章: reports（ヒヤリハット記録） */
export interface Report {
  id: string;
  yearId: string;
  studentId: string;
  taskId: string; // 「その他」選択時は予約値 "other" を格納
  taskOtherText: string | null; // taskId==="other" の場合の自由入力（1-2画面仕様、最大30文字）
  riskItemIds: string[]; // 必ず1件以上。特になしの場合はシステム項目IDを含む
  freeText: string | null;
  createdAt: Timestamp;
  isDeleted: boolean;
}

/** 6章: aiAnalyses.contents の構造 */
export interface AIAnalysisContents {
  riskTrend: string;
  prediction: string;
  improvement: string;
  countermeasure: string;
  morningComment: string;
  boardComment: string;
  pdfComment: string;
}

export type AIAnalysisPeriodType = "daily" | "weekly" | "monthly" | "yearly";
export type AIAnalysisStatus = "draft" | "confirmed";

/** 3章: aiAnalyses */
export interface AIAnalysis {
  id: string;
  yearId: string;
  periodType: AIAnalysisPeriodType;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  status: AIAnalysisStatus;
  generatedAt: Timestamp;
  contents: AIAnalysisContents;
  editedBy: string | null;
}

/** システム項目「特になし」の固定名（0-3で自動生成する際に使用） */
export const NONE_RISK_ITEM_NAME = "特になし" as const;

/** admins.role の現状の許容値（将来の権限拡張までは "admin" のみ） */
export const ADMIN_ROLE_DEFAULT = "admin" as const;
