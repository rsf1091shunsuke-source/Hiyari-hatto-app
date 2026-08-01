/**
 * IndexedDBオフラインキュー
 * 参照：詳細設計書 5章 状態管理設計（B-2反映：Firestoreへは一切書き込まず、
 *       未送信reportsはIndexedDBにのみ保持し、オンライン復帰時にPOST /api/reportsへ送信）
 */

const DB_NAME = "hiyari-hatto-offline";
const STORE_NAME = "pendingReports";
const DB_VERSION = 1;

export interface PendingReport {
  localId: string;
  yearId: string;
  token: string;
  studentId: string;
  taskId: string;
  riskItemIds: string[];
  freeText: string | null;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "localId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueuePendingReport(report: PendingReport): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(report);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingReports(): Promise<PendingReport[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as PendingReport[]);
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingReport(localId: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(localId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * オンライン復帰時にIndexedDBの未送信reportsを順次POST /api/reportsへ送信。
 * 送信成功が確認できたレコードのみIndexedDBから削除する（5章準拠）。
 */
export async function flushPendingReports(): Promise<void> {
  const pending = await getPendingReports();
  for (const report of pending) {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearId: report.yearId,
          token: report.token,
          studentId: report.studentId,
          taskId: report.taskId,
          riskItemIds: report.riskItemIds,
          freeText: report.freeText,
        }),
      });
      if (res.ok) {
        await removePendingReport(report.localId);
      }
    } catch {
      // オフライン継続中。次回のオンライン復帰時に再試行する
    }
  }
}
