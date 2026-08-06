"use client";

export const dynamic = "force-dynamic";

/**
 * 1-10. 作業内容管理
 * 参照：詳細設計書 1-10画面仕様（危険項目管理と同一構造）
 */

import { useEffect, useState } from "react";
import { onSnapshot, query, updateDoc, where, doc as firestoreDoc } from "firebase/firestore";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminNav } from "@/components/AdminNav";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Modal } from "@/components/Modal";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useCurrentYear } from "@/lib/useCurrentYear";
import { tasksCol, addNewDoc } from "@/lib/collections";
import { validateTaskNameFormat, checkTaskNameDuplicate } from "@/lib/validators";
import { Task } from "@/types/firestore";

function TasksPageContent() {
  const { year } = useCurrentYear();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!year) return;
    const q = query(tasksCol, where("yearId", "==", year.id));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => d.data()).sort((a, b) => a.order - b.order));
      setIsLoading(false);
    });
    return unsub;
  }, [year]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setNameError(null);
    setIsModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setName(task.name);
    setNameError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!year) return;
    const formatCheck = validateTaskNameFormat(name);
    if (!formatCheck.isValid) {
      setNameError(formatCheck.errorMessage!);
      return;
    }
    setIsSaving(true);
    const dupCheck = await checkTaskNameDuplicate(year.id, name, editing?.id);
    if (!dupCheck.isValid) {
      setNameError(dupCheck.errorMessage!);
      setIsSaving(false);
      return;
    }
    try {
      if (editing) {
        await updateDoc(firestoreDoc(tasksCol, editing.id), { name });
      } else {
        const maxOrder = tasks.reduce((m, t) => Math.max(m, t.order), 0);
        await addNewDoc(tasksCol, {
          yearId: year.id,
          name,
          order: maxOrder + 1,
          isActive: true,
        });
      }
      setIsModalOpen(false);
      showToast("保存しました", "success");
    } catch {
      showToast("保存に失敗しました", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (task: Task) => {
    try {
      await updateDoc(firestoreDoc(tasksCol, task.id), { isActive: false });
      showToast("無効化しました", "success");
    } catch {
      showToast("無効化に失敗しました", "error");
    }
  };

  if (!year) {
    return <div className="mx-auto max-w-2xl px-5 py-10 text-center"><p className="text-ios-body text-label-secondary">年度が設定されていません</p></div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-ios-title1">作業内容管理</h1>
        <PrimaryButton label="＋ 追加" onPress={openCreate} />
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton shape="text" />
          <Skeleton shape="text" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-[18px] bg-surface px-5 py-8 text-center shadow-card">
          <p className="text-ios-body text-label-secondary">まだ作業内容が登録されていません</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] bg-surface shadow-card">
          {tasks.map((t, i) => (
            <div
              key={t.id}
              className={[
                "flex items-center justify-between gap-3 px-4 py-3.5",
                i !== tasks.length - 1 ? "border-b border-black/[0.06]" : "",
              ].join(" ")}
            >
              <p className={["truncate text-ios-body", t.isActive ? "text-label" : "text-label-secondary line-through"].join(" ")}>
                {t.name}
              </p>
              <div className="flex shrink-0 gap-3">
                <button
                  type="button"
                  onClick={() => openEdit(t)}
                  className="min-h-[36px] text-ios-footnote font-semibold text-primary"
                >
                  編集
                </button>
                {t.isActive && (
                  <button
                    type="button"
                    onClick={() => handleDeactivate(t)}
                    className="min-h-[36px] text-ios-footnote font-semibold text-risk-high"
                  >
                    無効化
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        title={editing ? "作業内容を編集" : "作業内容を追加"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <label className="mb-1.5 block text-ios-footnote font-semibold uppercase tracking-wide text-label-secondary">
          名称
        </label>
        <input
          type="text"
          value={name}
          maxLength={20}
          onChange={(e) => {
            setName(e.target.value);
            setNameError(null);
          }}
          className={[
            "mb-1.5 min-h-[46px] w-full rounded-[12px] border bg-background px-4 text-ios-body text-label outline-none",
            nameError ? "border-risk-high" : "border-transparent focus:border-primary",
          ].join(" ")}
        />
        {nameError && <p className="mb-2 text-ios-footnote text-risk-high">{nameError}</p>}
        <div className="mt-4">
          <PrimaryButton label="保存" onPress={handleSave} isLoading={isSaving} />
        </div>
      </Modal>
    </div>
  );
}

export default function TasksPage() {
  return (
    <AdminGuard>
      <AdminNav />
      <TasksPageContent />
    </AdminGuard>
  );
}
