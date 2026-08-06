import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

// 環境変数はVercelのプロジェクト設定 or .env.localに設定する
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Next.jsのホットリロードで多重初期化されないようガード
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// iOSのホーム画面追加アプリ（スタンドアロン表示）で、Firebase Authが
// authDomain（別オリジン）との同期にIndexedDB経由のiframeハンドシェイクを使うことがあり、
// これがSafariへの意図しない離脱を引き起こす場合がある。
// localStorageベースの永続化に固定することでこれを避ける（実際に発生した不具合対応）。
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // 永続化設定に失敗しても致命的ではないため、握りつぶして通常のログイン処理を継続する
  });
}

export default app;
