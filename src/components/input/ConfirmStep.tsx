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

function ConfirmRow({
  label,
  value,
  onEdit,
  isLast = false,
}: {
  label: string;
  value: string;
  onEdit: () => void;
  isLast?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className={[
        "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left",
        !isLast ? "border-b border-black/[0.06]" : "",
      ].join(" ")}
    >
      <span className="shrink-0 text-ios-body text-label-secondary">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-ios-body text-label">{value}</span>
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true" className="shrink-0 text-label-secondary/60">
          <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
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
    <div className="px-5 py-6">
      <h1 className="mb-1 text-ios-title1">確認してください</h1>
      <p className="mb-6 text-ios-subhead text-label-secondary">
        内容をタップすると修正できます
      </p>

      <div className="mb-6 overflow-hidden rounded-[16px] bg-surface shadow-card">
        <ConfirmRow label="出席番号" value={`${student.attendanceNumber}番`} onEdit={onEditAttendance} />
        <ConfirmRow label="作業内容" value={task.name} onEdit={onEditTask} />
        <ConfirmRow
          label="危険項目"
          value={selectedRiskItems.map((r) => r.name).join("、")}
          onEdit={onEditRiskItems}
          isLast
        />
      </div>

      <label className="mb-2 block text-ios-footnote font-semibold uppercase tracking-wide text-label-secondary">
        自由記述（任意）
      </label>
      <div className="rounded-[16px] bg-surface p-1 shadow-card">
        <textarea
          value={freeText}
          maxLength={FREE_TEXT_MAX_LENGTH}
          onChange={(e) => setFreeText(e.target.value)}
          aria-label="自由記述"
          rows={4}
          placeholder="気づいたことがあれば書いてください"
          className="w-full resize-none rounded-[12px] bg-transparent px-3 py-2.5 text-ios-body text-label placeholder:text-label-secondary/50 outline-none"
        />
      </div>
      <p className="mb-6 mt-1.5 text-right text-ios-caption text-label-secondary" aria-live="polite">
        {freeText.length}/{FREE_TEXT_MAX_LENGTH}
      </p>

      <PrimaryButton
        label="送信する"
        onPress={() => onSubmit(freeText)}
        isLoading={isSubmitting}
      />
    </div>
  );
}
