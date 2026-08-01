"use client";

import { useEffect } from "react";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function GlobalError({
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
    <html lang="ja">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-label">
        <p className="text-lg font-semibold">問題が発生しました</p>
        <p className="text-sm text-label-secondary">
          しばらくしてから再度お試しください
        </p>
        <PrimaryButton label="再試行" onPress={reset} />
      </body>
    </html>
  );
}
