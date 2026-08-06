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
  primary: "bg-primary text-white shadow-button",
  destructive: "bg-risk-high text-white shadow-button",
  secondary: "bg-surface text-primary border border-black/[0.08]",
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
        "min-h-[50px] min-w-[44px] rounded-[14px] px-5 font-sans text-ios-headline",
        "transition-all duration-150 ease-out active:scale-[0.97] active:brightness-95",
        variantClasses[variant],
        disabled ? "pointer-events-none opacity-40 shadow-none" : "",
      ].join(" ")}
      {...rest}
    >
      {isLoading ? (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent align-[-3px]"
          aria-hidden="true"
        />
      ) : (
        label
      )}
    </button>
  );
}
