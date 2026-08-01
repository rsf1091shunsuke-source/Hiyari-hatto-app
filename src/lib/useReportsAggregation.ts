"use client";

/**
 * 集計フック（ダッシュボード・統計画面共通）
 * 参照：詳細設計書 1-7/1-8画面仕様
 *
 * 3章のインデックス設計方針では将来的にdailyStats等のバッチ集計を推奨しているが、
 * MVPではクライアント側でreportsをonSnapshot購読し集計する簡易実装とする（残課題として最終報告に記載）。
 */

import { useEffect, useState } from "react";
import { onSnapshot, query, where } from "firebase/firestore";
import { reportsCol, studentsCol, tasksCol, riskItemsCol } from "./collections";
import { Report, Student, Task, RiskItem } from "@/types/firestore";

export interface AggregationData {
  reports: Report[];
  students: Student[];
  tasks: Task[];
  riskItems: RiskItem[];
  isLoading: boolean;
}

export function useReportsAggregation(yearId: string | undefined): AggregationData {
  const [reports, setReports] = useState<Report[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [riskItems, setRiskItems] = useState<RiskItem[]>([]);
  const [loadedFlags, setLoadedFlags] = useState({
    reports: false,
    students: false,
    tasks: false,
    riskItems: false,
  });

  useEffect(() => {
    if (!yearId) return;

    const unsubReports = onSnapshot(
      query(reportsCol, where("yearId", "==", yearId), where("isDeleted", "==", false)),
      (snap) => {
        setReports(snap.docs.map((d) => d.data()));
        setLoadedFlags((f) => ({ ...f, reports: true }));
      }
    );
    const unsubStudents = onSnapshot(
      query(studentsCol, where("yearId", "==", yearId), where("isActive", "==", true)),
      (snap) => {
        setStudents(snap.docs.map((d) => d.data()));
        setLoadedFlags((f) => ({ ...f, students: true }));
      }
    );
    const unsubTasks = onSnapshot(
      query(tasksCol, where("yearId", "==", yearId)),
      (snap) => {
        setTasks(snap.docs.map((d) => d.data()));
        setLoadedFlags((f) => ({ ...f, tasks: true }));
      }
    );
    const unsubRiskItems = onSnapshot(
      query(riskItemsCol, where("yearId", "==", yearId)),
      (snap) => {
        setRiskItems(snap.docs.map((d) => d.data()));
        setLoadedFlags((f) => ({ ...f, riskItems: true }));
      }
    );

    return () => {
      unsubReports();
      unsubStudents();
      unsubTasks();
      unsubRiskItems();
    };
  }, [yearId]);

  return {
    reports,
    students,
    tasks,
    riskItems,
    isLoading: !Object.values(loadedFlags).every(Boolean),
  };
}
