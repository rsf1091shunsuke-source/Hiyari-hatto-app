import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "ヒヤリハット記録アプリ",
  description: "作業訓練現場向け ヒヤリハット記録・自動集計・AI分析アプリ",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ヒヤリハット記録",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // 入力操作中の意図しない拡大を防ぐ（訓練生の高速入力を優先、23章レスポンシブ設計）
  themeColor: "#F2F2F7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-background text-label font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
