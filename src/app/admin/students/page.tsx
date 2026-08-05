"use client";

export const dynamic = "force-dynamic";

/**
 * 1-11. 訓練生管理（一覧／CSV登録／編集）
 * 参照：詳細設計書 1-11画面仕様
 */

import { useEffect, useRef, useState } from "react";
import { onSnapshot, query, updateDoc, where, doc as firestoreDoc, writeBatch } from "firebase/firestore";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminNav } from "@/components/AdminNav";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useCurrentYear } from "@/lib/useCurrentYear";
import { studentsCol, addNewDoc } from "@/lib/collections";
import { db } from "@/lib/firebase-client";
import { checkAttendanceNumberDuplicate } from "@/lib/validators";
import { parseStudentsCsv, ParsedCsvRow } from "@/lib/csv";
import { Student } from "@/types/firestore";

function StudentsPageContent() {
  const { year } = useCurrentYear();
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [manualNumber, setManualNumber] = useState("");
  const [manualGroup, setManualGroup] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangeGroup, setRangeGroup] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [isRangeAdding, setIsRangeAdding] = useState(false);
  const [csvPreview, setCsvPreview] = useState<ParsedCsvRow[] | null>(null);
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!year) return;
    const q = query(studentsCol, where("yearId", "==", year.id));
    const unsub = onSnapshot(q, (snap) => {
      setStudents(
        snap.docs.map((d) => d.data()).sort((a, b) => a.attendanceNumber - b.attendanceNumber)
      );
      setIsLoading(false);
    });
    return unsub;
  }, [year]);

  const handleManualAdd = async () => {
    if (!year) return;
    const num = Number(manualNumber);
    if (!manualNumber || Number.isNaN(num)) {
      setManualError("出席番号を入力してください");
      return;
    }
    if (!manualGroup.trim()) {
      setManualError("班名を入力してください");
      return;
    }
    const dupCheck = await checkAttendanceNumberDuplicate(year.id, num);
    if (!dupCheck.isValid) {
      setManualError(dupCheck.errorMessage!);
      return;
    }
    try {
      await addNewDoc(studentsCol, {
        yearId: year.id,
        attendanceNumber: num,
        groupName: manualGroup,
        isActive: true,
      });
      setManualNumber("");
      setManualGroup("");
      setManualError(null);
      showToast("追加しました", "success");
    } catch {
      showToast("追加に失敗しました", "error");
    }
  };

  const handleRangeAdd = async () => {
    if (!year) return;
    const start = Number(rangeStart);
    const end = Number(rangeEnd);
    if (!rangeStart || !rangeEnd || Number.isNaN(start) || Number.isNaN(end)) {
      setRangeError("開始番号と終了番号を入力してください");
      return;
    }
    if (start > end) {
      setRangeError("開始番号は終了番号以下にしてください");
      return;
    }
    if (end - start + 1 > 200) {
      setRangeError("一度に登録できるのは200件までです");
      return;
    }
    if (!rangeGroup.trim()) {
      setRangeError("班名を入力してください");
      return;
    }
    setIsRangeAdding(true);
    try {
      const existingNumbers = new Set(students.map((s) => s.attendanceNumber));
      const batch = writeBatch(db);
      let addedCount = 0;
      for (let n = start; n <= end; n++) {
        if (existingNumbers.has(n)) continue;
        const ref = firestoreDoc(studentsCol);
        batch.set(ref, {
          id: "",
          yearId: year.id,
          attendanceNumber: n,
          groupName: rangeGroup,
          isActive: true,
        });
        addedCount++;
      }
      if (addedCount === 0) {
        setRangeError("この範囲は既に全て登録済みです");
        return;
      }
      await batch.commit();
      setRangeStart("");
      setRangeEnd("");
      setRangeGroup("");
      setRangeError(null);
      const skipped = end - start + 1 - addedCount;
      showToast(
        `${addedCount}件登録しました${skipped > 0 ? `（${skipped}件は登録済みのためスキップ）` : ""}`,
        skipped > 0 ? "info" : "success"
      );
    } catch {
      setRangeError("登録に失敗しました");
    } finally {
      setIsRangeAdding(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const { rows, warnings } = parseStudentsCsv(buffer);
    setCsvPreview(rows);
    setCsvWarnings(warnings);
  };

  const handleImportConfirm = async () => {
    if (!year || !csvPreview) return;
    setIsImporting(true);
    try {
      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearId: year.id, rows: csvPreview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      showToast(
        `${data.insertedCount}件登録しました${
          data.errors.length > 0 ? `（${data.errors.length}件はスキップ）` : ""
        }`,
        data.errors.length > 0 ? "info" : "success"
      );
      setCsvPreview(null);
      setCsvWarnings([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      showToast("インポートに失敗しました", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeactivate = async (student: Student) => {
    try {
      await updateDoc(firestoreDoc(studentsCol, student.id), { isActive: false });
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
      <h1 className="mb-4 text-lg font-semibold">訓練生管理</h1>

      <div className="mb-4 rounded-card border border-black/10 bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold">CSV一括登録</h2>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="mb-2 text-sm"
        />
        {csvWarnings.length > 0 && (
          <ul className="mb-2 text-xs text-risk-high">
            {csvWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
        {csvPreview && (
          <div>
            <p className="mb-2 text-sm text-label-secondary">
              {csvPreview.length}件をプレビュー中
            </p>
            <PrimaryButton
              label="登録を確定"
              onPress={handleImportConfirm}
              isLoading={isImporting}
            />
          </div>
        )}
      </div>

      <div className="mb-4 rounded-card border border-black/10 bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold">出席番号を範囲で一括登録</h2>
        <p className="mb-2 text-xs text-label-secondary">
          例：1〜40番までを同じ班名で一度に登録できます
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            placeholder="開始番号（例：1）"
            value={rangeStart}
            onChange={(e) => {
              setRangeStart(e.target.value);
              setRangeError(null);
            }}
            className="min-h-[44px] w-36 rounded-card border border-black/10 bg-surface px-3"
          />
          <span className="text-label-secondary">〜</span>
          <input
            type="number"
            placeholder="終了番号（例：40）"
            value={rangeEnd}
            onChange={(e) => {
              setRangeEnd(e.target.value);
              setRangeError(null);
            }}
            className="min-h-[44px] w-36 rounded-card border border-black/10 bg-surface px-3"
          />
          <input
            type="text"
            placeholder="班名"
            value={rangeGroup}
            onChange={(e) => {
              setRangeGroup(e.target.value);
              setRangeError(null);
            }}
            className="min-h-[44px] w-32 rounded-card border border-black/10 bg-surface px-3"
          />
          <PrimaryButton label="一括登録" onPress={handleRangeAdd} isLoading={isRangeAdding} />
        </div>
        {rangeError && <p className="mt-2 text-sm text-risk-high">{rangeError}</p>}
      </div>

      <div className="mb-4 rounded-card border border-black/10 bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold">手動追加</h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="number"
            placeholder="出席番号"
            value={manualNumber}
            onChange={(e) => {
              setManualNumber(e.target.value);
              setManualError(null);
            }}
            className="min-h-[44px] w-32 rounded-card border border-black/10 bg-surface px-3"
          />
          <input
            type="text"
            placeholder="班名"
            value={manualGroup}
            onChange={(e) => {
              setManualGroup(e.target.value);
              setManualError(null);
            }}
            className="min-h-[44px] w-32 rounded-card border border-black/10 bg-surface px-3"
          />
          <PrimaryButton label="追加" onPress={handleManualAdd} />
        </div>
        {manualError && <p className="mt-2 text-sm text-risk-high">{manualError}</p>}
      </div>

      {isLoading ? (
        <Skeleton shape="card" />
      ) : students.length === 0 ? (
        <p className="text-label-secondary">
          CSVをアップロードするか手動で追加してください
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-label-secondary">
                <th className="px-2 py-1">出席番号</th>
                <th className="px-2 py-1">班</th>
                <th className="px-2 py-1">状態</th>
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-black/10">
                  <td className="px-2 py-2">{s.attendanceNumber}</td>
                  <td className="px-2 py-2">{s.groupName}</td>
                  <td className="px-2 py-2">{s.isActive ? "有効" : "無効"}</td>
                  <td className="px-2 py-2">
                    {s.isActive && (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(s)}
                        className="min-h-[44px] text-risk-high"
                      >
                        無効化
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function StudentsPage() {
  return (
    <AdminGuard>
      <AdminNav />
      <StudentsPageContent />
    </AdminGuard>
  );
}
