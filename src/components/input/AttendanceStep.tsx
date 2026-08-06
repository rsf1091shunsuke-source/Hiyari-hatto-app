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
    <div className="px-5 py-6">
      <h1 className="mb-1 text-ios-title1">出席番号を選んでください</h1>
      <p className="mb-6 text-ios-subhead text-label-secondary">
        自分の番号をタップして進みます
      </p>
      {Object.entries(grouped).map(([groupName, groupStudents]) => (
        <div key={groupName} className="mb-7">
          <h2 className="mb-3 text-ios-footnote font-semibold uppercase tracking-wide text-label-secondary">
            {groupName}
          </h2>
          <div className="grid grid-cols-5 gap-3 sm:grid-cols-8">
            {groupStudents
              .sort((a, b) => a.attendanceNumber - b.attendanceNumber)
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s)}
                  aria-label={`出席番号 ${s.attendanceNumber}番`}
                  className="aspect-square min-h-[44px] min-w-[44px] rounded-full bg-surface text-ios-headline text-label shadow-card transition-all duration-150 ease-out active:scale-90 active:bg-primary active:text-white active:shadow-button"
                >
                  {s.attendanceNumber}
                </button>
              ))}
          </div>
        </div>
      ))}
      {students.length === 0 && (
        <div className="rounded-[18px] bg-surface px-5 py-8 text-center shadow-card">
          <p className="text-ios-body text-label-secondary">
            出席番号が登録されていません。
            <br />
            管理者に登録を依頼してください。
          </p>
        </div>
      )}
    </div>
  );
}
