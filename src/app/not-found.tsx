export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      <p className="text-lg font-semibold">ページが見つかりません</p>
      <p className="text-sm text-label-secondary">
        URLをご確認いただくか、管理者にお問い合わせください
      </p>
    </div>
  );
}
