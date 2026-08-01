/**
 * Firestoreコレクション参照＋型変換（クライアント用）
 * 参照：詳細設計書 3章 データベース設計（詳細版）
 */

import {
  addDoc,
  collection,
  CollectionReference,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from "firebase/firestore";
import { db } from "./firebase-client";
import { Year, Student, Task, RiskItem, Admin, Report, AIAnalysis } from "@/types/firestore";

function makeConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T) {
      const { id, ...rest } = data;
      return rest;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions
    ): T {
      const data = snapshot.data(options);
      return { id: snapshot.id, ...data } as T;
    },
  };
}

export const yearsCol = collection(db, "years").withConverter(
  makeConverter<Year>()
) as CollectionReference<Year>;

export const studentsCol = collection(db, "students").withConverter(
  makeConverter<Student>()
) as CollectionReference<Student>;

export const tasksCol = collection(db, "tasks").withConverter(
  makeConverter<Task>()
) as CollectionReference<Task>;

export const riskItemsCol = collection(db, "riskItems").withConverter(
  makeConverter<RiskItem>()
) as CollectionReference<RiskItem>;

export const adminsCol = collection(db, "admins").withConverter(
  makeConverter<Admin>()
) as CollectionReference<Admin>;

export const reportsCol = collection(db, "reports").withConverter(
  makeConverter<Report>()
) as CollectionReference<Report>;

export const aiAnalysesCol = collection(db, "aiAnalyses").withConverter(
  makeConverter<AIAnalysis>()
) as CollectionReference<AIAnalysis>;

/**
 * 新規ドキュメント作成用ヘルパー。
 * converterの型はidを必須とするため（読み取り時にドキュメントIDを含めるため）、
 * 書き込み時はid不要なOmit<T,'id'>を受け取り、内部でダミーidを付与してキャストする
 * （toFirestore側でidは常に除去されるため実害はない）。
 */
export async function addNewDoc<T extends { id: string }>(
  col: CollectionReference<T>,
  data: Omit<T, "id">
) {
  return addDoc(col, { ...data, id: "" } as unknown as T);
}
