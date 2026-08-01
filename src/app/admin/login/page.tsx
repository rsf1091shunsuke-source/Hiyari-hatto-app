"use client";

export const dynamic = "force-dynamic";

/**
 * 1-6. QRログイン（管理者）
 * 参照：詳細設計書 1-6画面仕様（問題④・案B反映：QRはschoolId/yearIdの識別情報のみ、認証はPINのみ）
 */

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PrimaryButton } from "@/components/PrimaryButton";
import { validatePinFormat } from "@/lib/validators";
import { signInAdminWithCustomToken } from "@/lib/useAdminAuth";

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const yearId = searchParams.get("yearId");

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const formatCheck = validatePinFormat(pin);
    if (!formatCheck.isValid) {
      setError(formatCheck.errorMessage!);
      return;
    }
    if (!yearId) {
      setError("QRコードを読み取るか、正しいログインURLでアクセスしてください");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearId, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "ログインに失敗しました");
        return;
      }
      await signInAdminWithCustomToken(data.customToken);
      router.push("/admin/dashboard");
    } catch {
      setError("ログインに失敗しました。通信環境をご確認ください");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-lg font-semibold">管理者ログイン</h1>

      {!yearId && (
        <p className="max-w-xs text-center text-sm text-label-secondary">
          管理者用QRコードを読み取るか、管理者用ログインURLからアクセスしてください
        </p>
      )}

      <input
        type="password"
        inputMode="numeric"
        maxLength={6}
        value={pin}
        onChange={(e) => {
          setPin(e.target.value.replace(/\D/g, ""));
          setError(null);
        }}
        aria-label="PIN"
        placeholder="PIN（4〜6桁）"
        className={[
          "min-h-[44px] w-48 rounded-card border bg-surface px-4 text-center text-lg tracking-widest",
          error ? "border-risk-high" : "border-black/10",
        ].join(" ")}
      />
      {error && <p className="text-sm text-risk-high">{error}</p>}

      <PrimaryButton label="ログイン" onPress={handleLogin} isLoading={isLoading} />
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginContent />
    </Suspense>
  );
}
