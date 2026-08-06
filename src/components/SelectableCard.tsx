"use client";

/**
 * SelectableCard / Chip
 * 参照：詳細設計書 2章 コンポーネント設計（SelectableCard, Chip）
 *       「Chip はSelectableCardの軽量版として統一basestyleを共有」との記載に基づき、
 *       共通のbaseクラスを両コンポーネントで再利用する。
 *       1章 共通ルール（選択系UIは0.15秒のスケール＋色変化、aria-pressedで選択状態を明示）
 */

import { ReactNode } from "react";
import { hapticTap } from "@/lib/haptics";

// SelectableCard / Chip 共通の基礎スタイル
const selectableBaseClass = [
  "min-h-[44px] min-w-[44px] rounded-[14px] font-sans text-ios-body",
  "transition-all duration-150 ease-out active:scale-[0.96]",
  "border",
].join(" ");

interface SelectableCardProps {
  label: string;
  isSelected: boolean;
  onToggle: () => void;
  badge?: ReactNode;
}

export function SelectableCard({
  label,
  isSelected,
  onToggle,
  badge,
}: SelectableCardProps) {
  return (
    <button
      type="button"
      onClick={() => {
        hapticTap();
        onToggle();
      }}
      aria-pressed={isSelected}
      aria-label={label}
      className={[
        selectableBaseClass,
        "flex flex-col items-center justify-center gap-1 px-4 py-4",
        isSelected
          ? "border-primary bg-primary text-white shadow-button"
          : "border-black/[0.06] bg-surface text-label shadow-card",
      ].join(" ")}
    >
      <span>{label}</span>
      {badge}
    </button>
  );
}

interface ChipProps {
  label: string;
  isSelected: boolean;
  onToggle: () => void;
}

export function Chip({ label, isSelected, onToggle }: ChipProps) {
  return (
    <button
      type="button"
      onClick={() => {
        hapticTap();
        onToggle();
      }}
      aria-pressed={isSelected}
      aria-label={label}
      className={[
        selectableBaseClass,
        "flex items-center gap-1.5 px-4 py-2.5 text-ios-subhead",
        isSelected
          ? "border-primary bg-primary text-white shadow-button"
          : "border-black/[0.06] bg-surface text-label",
      ].join(" ")}
    >
      {isSelected && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {label}
    </button>
  );
}
