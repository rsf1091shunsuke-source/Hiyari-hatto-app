"use client";

export const dynamic = "force-dynamic";

/**
 * 1-14. 設定（年度切替等）
 * 参照：詳細設計書 1-14画面仕様
 */

import { useEffect, useState } from "react";
import { onSnapshot, orderBy, query, updateDoc, doc as firestoreDoc, writeBatch } from "firebase/firestore";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminNav } from "@/components/AdminNav";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useToast } from "@/components/Toast";
import { createYear, isCreateYearError } from "@/lib/years";
import { yearsCol } from "@/lib/collections";
import { db } from "@/lib/firebase-client";
import { Year } from "@/types/firestore";
import { signOutAdmin } from "@/lib/useAdminAuth";
import { useRouter } from "next/navigation";

function SettingsPageContent() {
  const { showToast } = useToast();
  const router = useRouter();
  const [years, setYears] = useState<Year[]>([]);
  const [newYearName, setNewYearName] = useState("");
  const [newYearStartDate, setNewYearStartDate] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const q = query(yearsCol, orderBy("startDate", "desc"));
    const unsub = onSnapshot(q, (snap) => setYears(snap.docs.map((d) => d.data())));
    return unsub;
  }, []);

  const handleCreateYear = async () => {
    if (!newYearStartDate) {
      setNameError("開始日を入力してください");
      return;
    }
    setIsCreating(true);
    try {
      const result = await createYear(newYearName, new Date(newYearStartDate));
      if (isCreateYearError(result)) {
        setNameError(result.errorMessage);
        return;
      }
      setNewYearName("");
      setNewYearStartDate("");
      setNameError(null);
      showToast("年度を作成しました", "success");
    } catch {
      setNameError("年度の作成に失敗しました。時間をおいて再度お試しください");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSwitchYear = async (targetYearId: string) => {
    try {
      const batch = writeBatch(db);
      years.forEach((y) => {
        batch.update(firestoreDoc(yearsCol, y.id), { isActive: y.id === targetYearId });
      });
      await batch.commit();
      showToast("年度を切り替えました", "success");
    } catch {
      showToast("年度切替に失敗しました", "error");
    }
  };

  const handleLogout = async () => {
    await signOutAdmin();
    router.push("/admin/login");
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-semibold">設定</h1>

      <div className="mb-6 rounded-card border border-black/10 bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold">年度一覧</h2>
        <div className="space-y-2">
          {years.map((y) => (
            <div
              key={y.id}
              className="flex items-center justify-between rounded-card border border-black/10 px-3 py-2"
            >
              <span>
                {y.name} {y.isActive && <span className="text-primary">（現行）</span>}
              </span>
              {!y.isActive && (
                <button
                  type="button"
                  onClick={() => handleSwitchYear(y.id)}
                  className="min-h-[44px] text-sm text-primary"
                >
                  この年度に切替
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-card border border-black/10 bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold">新年度を作成</h2>
        <input
          type="text"
          placeholder="年度名（例：2027年度）"
          value={newYearName}
          onChange={(e) => {
            setNewYearName(e.target.value);
            setNameError(null);
          }}
          className="mb-2 min-h-[44px] w-full rounded-card border border-black/10 bg-surface px-3"
        />
        <input
          type="date"
          value={newYearStartDate}
          onChange={(e) => setNewYearStartDate(e.target.value)}
          className="mb-2 min-h-[44px] w-full rounded-card border border-black/10 bg-surface px-3"
        />
        {nameError && <p className="mb-2 text-sm text-risk-high">{nameError}</p>}
        <PrimaryButton label="新年度を作成" onPress={handleCreateYear} isLoading={isCreating} />
      </div>

      <PrimaryButton label="ログアウト" onPress={handleLogout} variant="secondary" />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AdminGuard>
      <AdminNav />
      <SettingsPageContent />
    </AdminGuard>
  );
}
