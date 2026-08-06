"use client";

/**
 * InputFlow
 * 参照：詳細設計書 1-1〜1-5画面仕様、5章 状態管理設計
 */

import { useEffect, useRef, useState } from "react";
import { ProgressStepper } from "@/components/ProgressStepper";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { AttendanceStep } from "./AttendanceStep";
import { TaskStep } from "./TaskStep";
import { RiskItemStep } from "./RiskItemStep";
import { ConfirmStep } from "./ConfirmStep";
import { CompleteStep } from "./CompleteStep";
import { InputStep, StudentMaster, TaskMaster, RiskItemMaster } from "./types";
import {
  enqueuePendingReport,
  flushPendingReports,
} from "@/lib/offlineQueue";

const STEP_ORDER: InputStep[] = ["attendance", "task", "riskItem", "confirm", "complete"];
const DUPLICATE_BLOCK_MS = 5000; // 1-1画面仕様

interface InputFlowProps {
  yearId: string;
  token: string;
}

export function InputFlow({ yearId, token }: InputFlowProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<InputStep>("attendance");
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [students, setStudents] = useState<StudentMaster[]>([]);
  const [tasks, setTasks] = useState<TaskMaster[]>([]);
  const [riskItems, setRiskItems] = useState<RiskItemMaster[]>([]);

  const [selectedStudent, setSelectedStudent] = useState<StudentMaster | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskOtherText, setSelectedTaskOtherText] = useState<string | null>(null);
  const [selectedRiskItemIds, setSelectedRiskItemIds] = useState<string[]>([]);

  const lastSubmitRef = useRef<{ studentId: string; at: number } | null>(null);

  useEffect(() => {
    async function loadMaster() {
      setIsLoadingMaster(true);
      try {
        const [studentsRes, tasksRes, riskItemsRes] = await Promise.all([
          fetch(`/api/students?yearId=${yearId}&token=${token}`),
          fetch(`/api/tasks?yearId=${yearId}&token=${token}`),
          fetch(`/api/risk-items?yearId=${yearId}&token=${token}`),
        ]);
        if (!studentsRes.ok || !tasksRes.ok || !riskItemsRes.ok) {
          throw new Error("マスタデータの取得に失敗しました");
        }
        const studentsJson = await studentsRes.json();
        const tasksJson = await tasksRes.json();
        const riskItemsJson = await riskItemsRes.json();
        setStudents(studentsJson.items ?? []);
        setTasks(tasksJson.items ?? []);
        setRiskItems(riskItemsJson.items ?? []);
      } catch {
        showToast("読み込みに失敗しました", "error");
      } finally {
        setIsLoadingMaster(false);
      }
    }
    loadMaster();
  }, [yearId, token, showToast]);

  // オンライン復帰時の未送信データ自動再送（5章準拠）
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      flushPendingReports();
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);
    if (navigator.onLine) flushPendingReports();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const resetFlow = () => {
    setSelectedStudent(null);
    setSelectedTaskId(null);
    setSelectedTaskOtherText(null);
    setSelectedRiskItemIds([]);
    setStep("attendance");
  };

  const handleSelectStudent = (student: StudentMaster) => {
    setSelectedStudent(student);
    setStep("task");
  };

  const handleSelectTask = (taskId: string, otherText?: string) => {
    setSelectedTaskId(taskId);
    setSelectedTaskOtherText(otherText ?? null);
    setStep("riskItem");
  };

  const handleSelectRiskItems = (riskItemIds: string[]) => {
    setSelectedRiskItemIds(riskItemIds);
    setStep("confirm");
  };

  const handleSubmit = async (freeText: string) => {
    if (!selectedStudent || !selectedTaskId) return;

    // 1-1画面仕様: 同一出席番号での5秒以内の連続送信をブロック
    const last = lastSubmitRef.current;
    if (
      last &&
      last.studentId === selectedStudent.id &&
      Date.now() - last.at < DUPLICATE_BLOCK_MS
    ) {
      showToast("直前に送信済みです", "error");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      yearId,
      token,
      studentId: selectedStudent.id,
      taskId: selectedTaskId,
      taskOtherText: selectedTaskOtherText,
      riskItemIds: selectedRiskItemIds,
      freeText: freeText.trim().length > 0 ? freeText : null,
    };

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("送信に失敗しました");
      lastSubmitRef.current = { studentId: selectedStudent.id, at: Date.now() };
      setStep("complete");
    } catch {
      // オフライン等で送信失敗した場合はIndexedDBへ一時保存（5章準拠）
      await enqueuePendingReport({
        localId: `${Date.now()}-${Math.random()}`,
        ...payload,
      });
      showToast("ローカルに保存しました。オンライン復帰後に自動送信されます", "info");
      lastSubmitRef.current = { studentId: selectedStudent.id, at: Date.now() };
      setStep("complete");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMaster) {
    return (
      <div className="space-y-3 px-4 py-4">
        <Skeleton shape="card" />
        <Skeleton shape="card" />
        <Skeleton shape="card" />
      </div>
    );
  }

  const currentStepIndex = STEP_ORDER.indexOf(step) + 1;

  return (
    <div>
      {isOffline && (
        <div className="bg-risk-medium px-4 py-2 text-center text-sm text-white">
          保存されます。送信は自動で再試行されます
        </div>
      )}
      {step !== "complete" && (
        <ProgressStepper currentStep={currentStepIndex} totalSteps={4} />
      )}

      {step === "attendance" && (
        <AttendanceStep students={students} onSelect={handleSelectStudent} />
      )}

      {step === "task" && (
        <TaskStep
          tasks={tasks}
          onSelect={handleSelectTask}
          onBack={() => setStep("attendance")}
        />
      )}

      {step === "riskItem" && selectedTaskId && (
        <RiskItemStep
          riskItems={riskItems}
          selectedTaskId={selectedTaskId}
          onNext={handleSelectRiskItems}
          onBack={() => setStep("task")}
        />
      )}

      {step === "confirm" && selectedStudent && selectedTaskId && (
        <ConfirmStep
          student={selectedStudent}
          task={
            selectedTaskId === "other"
              ? { id: "other" as const, name: selectedTaskOtherText ?? "その他" }
              : tasks.find((t) => t.id === selectedTaskId)!
          }
          selectedRiskItems={riskItems.filter((r) =>
            selectedRiskItemIds.includes(r.id)
          )}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onEditAttendance={() => setStep("attendance")}
          onEditTask={() => setStep("task")}
          onEditRiskItems={() => setStep("riskItem")}
        />
      )}

      {step === "complete" && <CompleteStep onDone={resetFlow} />}
    </div>
  );
}
