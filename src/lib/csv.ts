/**
 * CSV解析（出席番号,班名の2列想定）
 * 参照：詳細設計書 1-11画面仕様（文字コードUTF-8/Shift_JIS自動判定、欠損行スキップ＋警告）
 */

export interface ParsedCsvRow {
  attendanceNumber: number;
  groupName: string;
}

export interface ParsedCsvResult {
  rows: ParsedCsvRow[];
  warnings: string[];
}

function decodeBuffer(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    // UTF-8として不正な場合はShift_JISとして再デコード
    return new TextDecoder("shift-jis").decode(buffer);
  }
}

export function parseStudentsCsv(buffer: ArrayBuffer): ParsedCsvResult {
  const text = decodeBuffer(buffer);
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);

  const rows: ParsedCsvRow[] = [];
  const warnings: string[] = [];

  lines.forEach((line, index) => {
    const [numberStr, groupName] = line.split(",").map((s) => s?.trim());
    const attendanceNumber = Number(numberStr);
    if (!numberStr || Number.isNaN(attendanceNumber) || !groupName) {
      warnings.push(`${index + 1}行目: 形式が不正なためスキップしました`);
      return;
    }
    rows.push({ attendanceNumber, groupName });
  });

  return { rows, warnings };
}
