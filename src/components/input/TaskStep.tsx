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
    <div className="px-4 py-4">
      <button
        type="button"
        onClick={onBack}
        aria-label="戻る"
        className="mb-4 min-h-[44px] text-primary"
      >
        ← 戻る
      </button>
      <h1 className="mb-4 text-lg font-semibold">作業内容を選んでください</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sorted.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className="min-h-[44px] rounded-card border border-black/10 bg-surface px-4 py-4 text-label transition-transform duration-150 active:scale-95"
          >
            {t.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowOtherInput(true)}
          className="min-h-[44px] rounded-card border border-black/10 bg-surface px-4 py-4 text-label transition-transform duration-150 active:scale-95"
        >
          その他
        </button>
      </div>

      {showOtherInput && (
        <div className="mt-4">
          <input
            type="text"
            value={otherText}
            maxLength={OTHER_TASK_MAX_LENGTH}
            onChange={(e) => {
              setOtherText(e.target.value);
              setOtherError(null);
            }}
            aria-label="作業内容（その他）"
            className={[
              "min-h-[44px] w-full rounded-card border bg-surface px-4 text-label",
              otherError ? "border-risk-high" : "border-black/10",
            ].join(" ")}
            placeholder="作業内容を入力"
          />
          {otherError && (
            <p className="mt-1 text-sm text-risk-high">{otherError}</p>
          )}
          <div className="mt-3">
            <PrimaryButton label="次へ" onPress={handleOtherSubmit} />
          </div>
        </div>
      )}
    </div>
  );
}
