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
    return <p className="p-4 text-label-secondary">年度が設定されていません</p>;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">作業内容管理</h1>
        <PrimaryButton label="追加" onPress={openCreate} />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton shape="text" />
          <Skeleton shape="text" />
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-label-secondary">まだ作業内容が登録されていません</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-card border border-black/10 bg-surface px-4 py-3"
            >
              <p className={t.isActive ? "" : "text-label-secondary line-through"}>
                {t.name}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(t)}
                  className="min-h-[44px] px-2 text-sm text-primary"
                >
                  編集
                </button>
                {t.isActive && (
                  <button
                    type="button"
                    onClick={() => handleDeactivate(t)}
                    className="min-h-[44px] px-2 text-sm text-risk-high"
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
        <label className="mb-1 block text-sm text-label-secondary">名称</label>
        <input
          type="text"
          value={name}
          maxLength={20}
          onChange={(e) => {
            setName(e.target.value);
            setNameError(null);
          }}
          className={[
            "mb-1 min-h-[44px] w-full rounded-card border bg-surface px-4",
            nameError ? "border-risk-high" : "border-black/10",
          ].join(" ")}
        />
        {nameError && <p className="mb-2 text-sm text-risk-high">{nameError}</p>}
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
