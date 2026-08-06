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
      className="flex min-h-screen flex-col items-center justify-center gap-5 px-5"
      aria-live="polite"
    >
      <div
        className="flex h-20 w-20 animate-popIn items-center justify-center rounded-full bg-success shadow-button"
        aria-hidden="true"
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4L19 7"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-ios-title2">お疲れ様でした</p>
        <p className="mt-1 text-ios-subhead text-label-secondary">
          記録を送信しました
        </p>
      </div>
      <button
        type="button"
        onClick={onDone}
        className="min-h-[44px] rounded-full bg-black/[0.04] px-5 text-ios-subhead text-primary"
      >
        今すぐ次へ（{secondsLeft}）
      </button>
    </div>
  );
}
