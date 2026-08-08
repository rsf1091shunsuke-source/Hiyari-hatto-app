import StudyTracker from "@/components/StudyTracker";

// このページは常にクライアント側で完結するダッシュボードなので、
// ビルド時にFirebaseへ接続しようとして失敗しないよう静的プリレンダリングを無効化する。
export const dynamic = "force-dynamic";

export default function Page() {
  return <StudyTracker />;
}
