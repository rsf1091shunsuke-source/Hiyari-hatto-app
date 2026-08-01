"use client";

/**
 * SelectableCard / Chip
 * 参照：詳細設計書 2章 コンポーネント設計（SelectableCard, Chip）
 *       「Chip はSelectableCardの軽量版として統一basestyleを共有」との記載に基づき、
 *       共通のbaseクラスを両コンポーネントで再利用する。
 *       1章 共通ルール（選択系UIは0.15秒のスケール＋色変化、aria-pressedで選択状態を明示）
 */

import { ReactNode } from "react";

// SelectableCard / Chip 共通の基礎スタイル
const selectableBaseClass = [
  "min-h-[44px] min-w-[44px] rounded-card font-sans",
  "transition-all duration-150 active:scale-95",
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
      onClick={onToggle}
      aria-pressed={isSelected}
      aria-label={label}
      className={[
        selectableBaseClass,
        "flex flex-col items-center justify-center gap-1 px-4 py-4",
        isSelected
          ? "border-primary bg-primary/10 text-primary"
          : "border-black/10 bg-surface text-label",
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
      onClick={onToggle}
      aria-pressed={isSelected}
      aria-label={label}
      className={[
        selectableBaseClass,
        "px-4 py-2 text-sm",
        isSelected
          ? "border-primary bg-primary text-white"
          : "border-black/10 bg-surface text-label",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
