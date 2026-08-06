"use client";

export const dynamic = "force-dynamic";

/**
 * 1-9. 危険項目管理
 * 参照：詳細設計書 1-9画面仕様
 */

import { useEffect, useState } from "react";
import {
  onSnapshot,
  query,
  updateDoc,
  where,
  doc as firestoreDoc,
} from "firebase/firestore";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminNav } from "@/components/AdminNav";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Modal } from "@/components/Modal";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useCurrentYear } from "@/lib/useCurrentYear";
import { riskItemsCol, tasksCol, addNewDoc } from "@/lib/collections";
import {
  validateRiskItemNameFormat,
  checkRiskItemNameDuplicate,
  assertRiskItemEditable,
} from "@/lib/validators";
import { RiskItem, Task } from "@/types/firestore";

function RiskItemsPageContent() {
  const { year } = useCurrentYear();
  const { showToast } = useToast();
  const [riskItems, setRiskItems] = useState<RiskItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<RiskItem | null>(null);
  const [name, setName] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!year) return;
    const q1 = query(riskItemsCol, where("yearId", "==", year.id));
    const unsub1 = onSnapshot(q1, (snap) => {
      setRiskItems(snap.docs.map((d) => d.data()).sort((a, b) => a.order - b.order));
      setIsLoading(false);
    });
    const q2 = query(tasksCol, where("yearId", "==", year.id), where("isActive", "==", true));
    const unsub2 = onSnapshot(q2, (snap) => setTasks(snap.docs.map((d) => d.data())));
    return () => {
      unsub1();
      unsub2();
    };
  }, [year]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setSelectedTaskIds([]);
    setNameError(null);
    setIsModalOpen(true);
  };

  const openEdit = (item: RiskItem) => {
    const guard = assertRiskItemEditable(item);
    if (!guard.isValid) {
      showToast(guard.errorMessage!, "error");
      return;
    }
    setEditing(item);
    setName(item.name);
    setSelectedTaskIds(item.relatedTaskIds);
    setNameError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!year) return;
    const formatCheck = validateRiskItemNameFormat(name);
    if (!formatCheck.isValid) {
      setNameError(formatCheck.errorMessage!);
      return;
    }
    setIsSaving(true);
    const dupCheck = await checkRiskItemNameDuplicate(year.id, name, editing?.id);
    if (!dupCheck.isValid) {
      setNameError(dupCheck.errorMessage!);
      setIsSaving(false);
      return;
    }

    try {
      if (editing) {
        await updateDoc(firestoreDoc(riskItemsCol, editing.id), {
          name,
          relatedTaskIds: selectedTaskIds,
        });
      } else {
        const maxOrder = riskItems.reduce((m, r) => Math.max(m, r.order), 0);
        await addNewDoc(riskItemsCol, {
          yearId: year.id,
          name,
          relatedTaskIds: selectedTaskIds,
          order: maxOrder + 1,
          isActive: true,
          isSystemItem: false,
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

  const handleDeactivate = async (item: RiskItem) => {
    const guard = assertRiskItemEditable(item);
    if (!guard.isValid) {
      showToast(guard.errorMessage!, "error");
      return;
    }
    try {
      await updateDoc(firestoreDoc(riskItemsCol, item.id), { isActive: false });
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
        <h1 className="text-ios-title1">危険項目管理</h1>
        <PrimaryButton label="＋ 追加" onPress={openCreate} />
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton shape="text" />
          <Skeleton shape="text" />
        </div>
      ) : riskItems.length === 0 ? (
        <div className="rounded-[18px] bg-surface px-5 py-8 text-center shadow-card">
          <p className="text-ios-body text-label-secondary">まだ危険項目が登録されていません</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] bg-surface shadow-card">
          {riskItems.map((item, i) => (
            <div
              key={item.id}
              className={[
                "flex items-center justify-between gap-3 px-4 py-3.5",
                i !== riskItems.length - 1 ? "border-b border-black/[0.06]" : "",
              ].join(" ")}
            >
              <p className={["truncate text-ios-body", item.isActive ? "text-label" : "text-label-secondary line-through"].join(" ")}>
                {item.name}
                {item.isSystemItem && (
                  <span className="ml-2 rounded-full bg-black/[0.05] px-2 py-0.5 text-ios-caption text-label-secondary">
                    システム項目
                  </span>
                )}
              </p>
              {!item.isSystemItem && (
                <div className="flex shrink-0 gap-3">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="min-h-[36px] text-ios-footnote font-semibold text-primary"
                  >
                    編集
                  </button>
                  {item.isActive && (
                    <button
                      type="button"
                      onClick={() => handleDeactivate(item)}
                      className="min-h-[36px] text-ios-footnote font-semibold text-risk-high"
                    >
                      無効化
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        title={editing ? "危険項目を編集" : "危険項目を追加"}
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

        <label className="mb-2 mt-4 block text-ios-footnote font-semibold uppercase tracking-wide text-label-secondary">
          紐づく作業内容
        </label>
        <div className="flex flex-wrap gap-2">
          {tasks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() =>
                setSelectedTaskIds((prev) =>
                  prev.includes(t.id)
                    ? prev.filter((id) => id !== t.id)
                    : [...prev, t.id]
                )
              }
              className={[
                "min-h-[40px] rounded-full border px-3.5 py-1.5 text-ios-footnote transition-all duration-150",
                selectedTaskIds.includes(t.id)
                  ? "border-primary bg-primary text-white"
                  : "border-black/[0.08] bg-background text-label",
              ].join(" ")}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <PrimaryButton label="保存" onPress={handleSave} isLoading={isSaving} />
        </div>
      </Modal>
    </div>
  );
}

export default function RiskItemsPage() {
  return (
    <AdminGuard>
      <AdminNav />
      <RiskItemsPageContent />
    </AdminGuard>
  );
}
