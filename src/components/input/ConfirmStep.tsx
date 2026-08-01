"use client";

/**
 * 1-4. 確認・自由記述
 * 参照：詳細設計書 1-4画面仕様
 */

import { useState } from "react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StudentMaster, TaskMaster, RiskItemMaster } from "./types";

const FREE_TEXT_MAX_LENGTH = 200;

interface ConfirmStepProps {
  student: StudentMaster;
  task: TaskMaster | { id: "other"; name: string };
  selectedRiskItems: RiskItemMaster[];
  isSubmitting: boolean;
  onSubmit: (freeText: string) => void;
  onEditAttendance: () => void;
  onEditTask: () => void;
  onEditRiskItems: () => void;
}

export function ConfirmStep({
  student,
  task,
  selectedRiskItems,
  isSubmitting,
  onSubmit,
  onEditAttendance,
  onEditTask,
  onEditRiskItems,
}: ConfirmStepProps) {
  const [freeText, setFreeText] = useState("");

  return (
    <div className="px-4 py-4">
      <h1 className="mb-4 text-lg font-semibold">確認してください</h1>

      <button
        type="button"
        onClick={onEditAttendance}
        className="mb-2 w-full rounded-card border border-black/10 bg-surface px-4 py-3 text-left"
      >
        <span className="text-xs text-label-secondary">出席番号</span>
        <p>{student.attendanceNumber}番</p>
      </button>

      <button
        type="button"
        onClick={onEditTask}
        className="mb-2 w-full rounded-card border border-black/10 bg-surface px-4 py-3 text-left"
      >
        <span className="text-xs text-label-secondary">作業内容</span>
        <p>{task.name}</p>
      </button>

      <button
        type="button"
        onClick={onEditRiskItems}
        className="mb-4 w-full rounded-card border border-black/10 bg-surface px-4 py-3 text-left"
      >
        <span className="text-xs text-label-secondary">危険項目</span>
        <p>{selectedRiskItems.map((r) => r.name).join("、")}</p>
      </button>

      <label className="mb-1 block text-sm text-label-secondary">
        自由記述（任意）
      </label>
      <textarea
        value={freeText}
        maxLength={FREE_TEXT_MAX_LENGTH}
        onChange={(e) => setFreeText(e.target.value)}
        aria-label="自由記述"
        rows={4}
        className="w-full rounded-card border border-black/10 bg-surface px-4 py-3 text-label"
      />
      <p className="mb-4 text-right text-xs text-label-secondary" aria-live="polite">
        {freeText.length}/{FREE_TEXT_MAX_LENGTH}
      </p>

      <PrimaryButton
        label="送信"
        onPress={() => onSubmit(freeText)}
        isLoading={isSubmitting}
      />
    </div>
  );
}
