"use client";

/**
 * 1-1. 入力トップ（出席番号選択）
 * 参照：詳細設計書 1-1画面仕様
 */

import { StudentMaster } from "./types";

interface AttendanceStepProps {
  students: StudentMaster[];
  onSelect: (student: StudentMaster) => void;
}

export function AttendanceStep({ students, onSelect }: AttendanceStepProps) {
  // 班ごとにセクション分け（1-1画面仕様: クラス・作業班別にセクション分け）
  const grouped = students.reduce<Record<string, StudentMaster[]>>((acc, s) => {
    (acc[s.groupName] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="px-4 py-4">
      <h1 className="mb-4 text-lg font-semibold">出席番号を選んでください</h1>
      {Object.entries(grouped).map(([groupName, groupStudents]) => (
        <div key={groupName} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-label-secondary">
            {groupName}
          </h2>
          <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
            {groupStudents
              .sort((a, b) => a.attendanceNumber - b.attendanceNumber)
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s)}
                  aria-label={`出席番号 ${s.attendanceNumber}番`}
                  className="min-h-[44px] min-w-[44px] rounded-card border border-black/10 bg-surface text-label transition-transform duration-150 active:scale-95"
                >
                  {s.attendanceNumber}
                </button>
              ))}
          </div>
        </div>
      ))}
      {students.length === 0 && (
        <p className="text-sm text-label-secondary">
          出席番号が登録されていません。管理者に登録を依頼してください。
        </p>
      )}
    </div>
  );
}
