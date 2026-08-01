"use client";

/**
 * PrimaryButton
 * 参照：詳細設計書 2章 コンポーネント設計（PrimaryButton）
 *       1章 共通ルール（ローディング：ボタン内スピナー＋非活性化、44×44pt以上のタップ領域）
 */

import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "destructive" | "secondary";

interface PrimaryButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-white",
  destructive: "bg-risk-high text-white",
  secondary: "bg-surface text-label border border-black/10",
};

export function PrimaryButton({
  label,
  onPress,
  isLoading = false,
  isDisabled = false,
  variant = "primary",
  ...rest
}: PrimaryButtonProps) {
  const disabled = isDisabled || isLoading;

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      aria-busy={isLoading}
      className={[
        "min-h-[44px] min-w-[44px] rounded-card px-5 font-sans font-semibold",
        "transition-colors duration-150 active:scale-95",
        variantClasses[variant],
        disabled ? "opacity-50" : "",
      ].join(" ")}
      {...rest}
    >
      {isLoading ? (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        label
      )}
    </button>
  );
}
