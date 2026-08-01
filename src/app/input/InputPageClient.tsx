"use client";

import { useSearchParams } from "next/navigation";
import { InputFlow } from "@/components/input/InputFlow";

export function InputPageClient() {
  const searchParams = useSearchParams();
  const yearId = searchParams.get("yearId");
  const token = searchParams.get("token");

  if (!yearId || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <p className="text-label-secondary">
          URLが正しくありません。管理者に入力用URLを確認してください。
        </p>
      </div>
    );
  }

  return <InputFlow yearId={yearId} token={token} />;
}
