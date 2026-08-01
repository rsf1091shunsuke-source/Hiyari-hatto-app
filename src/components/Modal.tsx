"use client";

/**
 * Modal / BottomSheet
 * 参照：詳細設計書 2章 コンポーネント設計（Modal / BottomSheet）
 *       「PC＝Modal中央表示、モバイル＝BottomSheetへ自動切替（同一Propsで内部分岐）」
 *
 * 実装方針：JSでのビューポート判定はSSR/ハイドレーション不整合を招きやすいため、
 * Tailwindのレスポンシブブレークポイント（md:）のみで表示位置を切り替える。
 */

import { ReactNode, useEffect, useRef } from "react";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  isOpen: boolean;
}

export function Modal({ title, children, onClose, isOpen }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // アクセシビリティ: 開いたら先頭のフォーカス可能要素へ移動し、閉じたら元の要素に戻す
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        "input, textarea, select, button, [tabindex]"
      );
      firstFocusable?.focus();
    } else {
      previouslyFocusedRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className={[
          "w-full bg-surface text-label shadow-card-elevated",
          // モバイル：下からスライドインするボトムシート（上のみ角丸）
          "rounded-t-card-lg p-6",
          // PC：中央表示のモーダル（全角丸、最大幅を制限）
          "md:max-w-md md:rounded-card-lg",
          "animate-[fadeIn_0.2s_ease-out]",
        ].join(" ")}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="min-h-[44px] min-w-[44px] text-label-secondary"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
