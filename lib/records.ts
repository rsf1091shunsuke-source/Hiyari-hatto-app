import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type Understanding = "good" | "soso" | "review" | null;

export interface StudyRecord {
  id: string;
  subject: string;
  topic: string;
  minutes: number;
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:mm'
  understanding: Understanding;
}

const RECORDS_COL = "records";
const SETTINGS_DOC = "settings/main";

/**
 * 直近7日分（今日を含む）の記録を購読する。
 *
 * 【複合インデックスについて】
 * このクエリは date フィールドに対する範囲条件(>=, <=)のみで、
 * 別フィールドでの orderBy を行っていないため、Firestoreの自動インデックスの
 * 範囲内で動作し、複合インデックスは不要です。
 * 日付内の時刻順や「今日の一覧」への絞り込みはクライアント側(JS)で行っています。
 *
 * 将来、たとえば「特定の科目だけを絞り込みつつ日付順で並べる」といった
 * 条件を追加する場合は、絞り込み+並び替えの組み合わせになるため
 * 複合インデックスが必要になる可能性が高いです。その際はコードを書いた時点で
 * Firebase Consoleの「Firestore Database > インデックス」から作成するか、
 * 初回実行時にコンソールへ出るエラーメッセージ内のリンクから作成してください。
 */
export function subscribeRecentRecords(
  startDate: string,
  endDate: string,
  onData: (records: StudyRecord[]) => void,
  onError?: (err: unknown) => void
) {
  const q = query(
    collection(db, RECORDS_COL),
    where("date", ">=", startDate),
    where("date", "<=", endDate)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: StudyRecord[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          subject: data.subject,
          topic: data.topic ?? "",
          minutes: data.minutes,
          date: data.date,
          time: data.time,
          understanding: data.understanding ?? null,
        };
      });
      onData(list);
    },
    (err) => {
      console.error("[records] subscribeRecentRecords failed", err);
      onError?.(err);
    }
  );
}

/**
 * 「要復習」の全記録を購読する。
 *
 * where('understanding','==','review') のみで orderBy を付けていないため
 * こちらも複合インデックスは不要（並び替えはクライアント側で実施）。
 * もし将来 orderBy('date') 等を Firestore 側の並び替えに変えたい場合は、
 * 絞り込み+並び替えの組み合わせになるため複合インデックスが必要になります。
 */
export function subscribeReviewRecords(
  onData: (records: StudyRecord[]) => void,
  onError?: (err: unknown) => void
) {
  const q = query(collection(db, RECORDS_COL), where("understanding", "==", "review"));

  return onSnapshot(
    q,
    (snap) => {
      const list: StudyRecord[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          subject: data.subject,
          topic: data.topic ?? "",
          minutes: data.minutes,
          date: data.date,
          time: data.time,
          understanding: data.understanding ?? null,
        };
      });
      onData(list);
    },
    (err) => {
      console.error("[records] subscribeReviewRecords failed", err);
      onError?.(err);
    }
  );
}

export async function addRecord(input: {
  subject: string;
  topic: string;
  minutes: number;
  date: string;
  time: string;
}): Promise<void> {
  try {
    await addDoc(collection(db, RECORDS_COL), {
      subject: input.subject,
      topic: input.topic,
      minutes: input.minutes,
      date: input.date,
      time: input.time,
      understanding: null,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("[records] addRecord failed", err);
    throw err;
  }
}

export async function updateRecord(
  id: string,
  patch: Partial<Pick<StudyRecord, "subject" | "topic" | "minutes" | "understanding">>
): Promise<void> {
  try {
    await updateDoc(doc(db, RECORDS_COL, id), patch as any);
  } catch (err) {
    console.error("[records] updateRecord failed", err, { id, patch });
    throw err;
  }
}

export async function deleteRecord(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, RECORDS_COL, id));
  } catch (err) {
    console.error("[records] deleteRecord failed", err, { id });
    throw err;
  }
}

export function subscribeGoal(
  onData: (minutes: number) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    doc(db, SETTINGS_DOC),
    (snap) => {
      const data = snap.data();
      onData(typeof data?.goalMinutes === "number" ? data.goalMinutes : 180);
    },
    (err) => {
      console.error("[records] subscribeGoal failed", err);
      onError?.(err);
    }
  );
}

export async function setGoal(minutes: number): Promise<void> {
  try {
    await setDoc(doc(db, SETTINGS_DOC), { goalMinutes: minutes }, { merge: true });
  } catch (err) {
    console.error("[records] setGoal failed", err);
    throw err;
  }
}

export async function ensureSettingsDocExists(): Promise<void> {
  try {
    const ref = doc(db, SETTINGS_DOC);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { goalMinutes: 180 });
    }
  } catch (err) {
    console.error("[records] ensureSettingsDocExists failed", err);
  }
}
