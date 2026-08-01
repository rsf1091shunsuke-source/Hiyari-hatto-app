"use client";

/**
 * Toast / ToastProvider
 * 参照：詳細設計書 2章 コンポーネント設計（Toast：グローバルなToastProviderで一元管理）
 *       1章 共通ルール（エラー表示：画面下部からスライドインするトースト、3秒で自動消滅、赤背景）
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 3000; // 1章共通ルール: 3秒で自動消滅

const typeClasses: Record<ToastType, string> = {
  error: "bg-risk-high text-white", // 共通ルール: 赤背景
  success: "bg-success text-white",
  info: "bg-label text-surface",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            className={[
              "min-h-[44px] max-w-[90%] rounded-card px-4 py-3 shadow-card",
              "animate-[fadeIn_0.2s_ease-out]",
              typeClasses[t.type],
            ].join(" ")}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast は ToastProvider の内側で使用してください");
  }
  return ctx;
}
