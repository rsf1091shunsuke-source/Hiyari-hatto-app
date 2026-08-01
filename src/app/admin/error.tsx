"use client";

import { useEffect } from "react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AdminNav } from "@/components/AdminNav";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div>
      <AdminNav />
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="font-semibold">この画面の読み込みに失敗しました</p>
        <PrimaryButton label="再試行" onPress={reset} />
      </div>
    </div>
  );
}
