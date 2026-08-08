import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// getFirestore(app) だとFirestoreはまずWebSocket相当のストリーミング接続を試み、
// 学校や携帯回線などストリーミングがブロックされやすいネットワークでは
// タイムアウト後にlong pollingへ自動フォールバックするまで最大30秒ほど
// かかることがある（初回読み込みが極端に遅くなる典型的な原因）。
// experimentalAutoDetectLongPolling を有効にすると、接続方式の判定を
// 高速化しこの遅延を避けられる。
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
export const auth = getAuth(app);

// Firestoreのセキュリティルールで `request.auth != null` を必須にするための
// 最小限の匿名認証。ログイン画面は出さず、アプリを開いたら自動でサインインする。
// 家族内利用の簡易的な保護であり、ユーザーごとのアクセス制御にはならない点に注意。
let authReadyPromise: Promise<void> | null = null;

export function ensureAuth(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (authReadyPromise) return authReadyPromise;

  authReadyPromise = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve();
      } else {
        signInAnonymously(auth).catch((err) => {
          console.error("[firebase] anonymous sign-in failed", err);
          // 認証に失敗してもUIが固まらないよう解決はしておく。
          // その場合Firestoreへの読み書きはルールにより拒否される。
          resolve();
        });
      }
    });
  });

  return authReadyPromise;
}
