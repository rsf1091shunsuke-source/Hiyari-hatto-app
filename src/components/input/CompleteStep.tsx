"use client";

/**
 * 1-5. 完了画面
 * 参照：詳細設計書 1-5画面仕様（3秒後自動遷移、スキップ可）
 */

import { useEffect, useState } from "react";

const AUTO_RETURN_MS = 3000;

interface CompleteStepProps {
  onDone: () => void;
}

export function CompleteStep({ onDone }: CompleteStepProps) {
  const [secondsLeft, setSecondsLeft] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    const timeout = setTimeout(onDone, AUTO_RETURN_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onDone]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-4"
      aria-live="polite"
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full bg-success text-3xl text-white"
        aria-hidden="true"
      >
        ✓
      </div>
      <p className="text-lg font-semibold">お疲れ様でした</p>
      <button
        type="button"
        onClick={onDone}
        className="min-h-[44px] text-sm text-primary"
      >
        今すぐ次へ（{secondsLeft}）
      </button>
    </div>
  );
}
