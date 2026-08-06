"use client";

/**
 * 1-2. 作業内容選択
 * 参照：詳細設計書 1-2画面仕様
 */

import { useState } from "react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TaskMaster } from "./types";

const OTHER_TASK_MAX_LENGTH = 30;

interface TaskStepProps {
  tasks: TaskMaster[];
  onSelect: (taskId: string, otherText?: string) => void;
  onBack: () => void;
}

export function TaskStep({ tasks, onSelect, onBack }: TaskStepProps) {
  const [otherText, setOtherText] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherError, setOtherError] = useState<string | null>(null);

  const sorted = [...tasks].sort((a, b) => a.order - b.order);

  const handleOtherSubmit = () => {
    if (otherText.trim().length === 0) {
      setOtherError("作業内容を入力してください");
      return;
    }
    onSelect("other", otherText);
  };

  return (
    <div className="px-5 py-6">
      <button
        type="button"
        onClick={onBack}
        aria-label="戻る"
        className="mb-3 -ml-1 flex min-h-[44px] items-center gap-1 text-ios-body text-primary"
      >
        <svg width="10" height="17" viewBox="0 0 10 17" fill="none" aria-hidden="true">
          <path d="M9 1L1.5 8.5L9 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        戻る
      </button>
      <h1 className="mb-6 text-ios-title1">作業内容を選んでください</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sorted.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className="min-h-[64px] rounded-[16px] bg-surface px-4 py-4 text-ios-body text-label shadow-card transition-all duration-150 ease-out active:scale-95 active:bg-primary active:text-white active:shadow-button"
          >
            {t.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowOtherInput(true)}
          className={[
            "min-h-[64px] rounded-[16px] px-4 py-4 text-ios-body transition-all duration-150 ease-out active:scale-95",
            showOtherInput
              ? "bg-primary text-white shadow-button"
              : "bg-surface text-label shadow-card active:bg-primary active:text-white active:shadow-button",
          ].join(" ")}
        >
          その他
        </button>
      </div>

      {showOtherInput && (
        <div className="mt-5 animate-fadeIn rounded-[16px] bg-surface p-4 shadow-card">
          <input
            type="text"
            value={otherText}
            maxLength={OTHER_TASK_MAX_LENGTH}
            onChange={(e) => {
              setOtherText(e.target.value);
              setOtherError(null);
            }}
            aria-label="作業内容（その他）"
            autoFocus
            className={[
              "min-h-[46px] w-full rounded-[12px] border bg-background px-4 text-ios-body text-label outline-none focus:border-primary",
              otherError ? "border-risk-high" : "border-transparent",
            ].join(" ")}
            placeholder="作業内容を入力"
          />
          {otherError && (
            <p className="mt-1.5 text-ios-footnote text-risk-high">{otherError}</p>
          )}
          <div className="mt-3">
            <PrimaryButton label="次へ" onPress={handleOtherSubmit} />
          </div>
        </div>
      )}
    </div>
  );
}
