import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold">ヒヤリハット記録アプリ</h1>
      <p className="text-sm text-label-secondary">
        訓練生の方は、配布された入力用URL（QRコード）からアクセスしてください。
      </p>
      <Link href="/admin/login" className="min-h-[44px] text-sm text-primary">
        管理者の方はこちら
      </Link>
    </main>
  );
}
