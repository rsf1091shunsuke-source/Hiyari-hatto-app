/**
 * 月次報告書PDF生成サービス
 * 参照：しゅんすけさん提供の紙の様式（器工具・リスクアセスメント記録集計）を再現
 *
 * 構成：
 * 1. 表：列＝危険項目（丸数字＋名称）、行＝月合計＋日付ごと（日付×作業内容単位で1行）
 *    件数の大小に応じて背景色を変える（多い＝赤、やや多い＝黄）。罫線は実物同様に黒で統一。
 * 2. 今月のヒヤリハット：教官が選んだ記述を番号付きで列挙
 * 3. 対策：上記に対応する番号付きの対策文
 */

import { PDFDocument, PDFFont, rgb, RGB } from "pdf-lib";
import { embedFonts } from "./fontService";

const MM_TO_PT = 2.834645669;
const MARGIN = 12 * MM_TO_PT;
const PAGE_WIDTH = 297 * MM_TO_PT; // A4横（列数が多いため横向き）
const PAGE_HEIGHT = 210 * MM_TO_PT;

// 件数に応じた背景色のしきい値（実際の運用を見ながら調整可能）
const HIGH_THRESHOLD = 20;
const MID_THRESHOLD = 5;

// ①〜⑳の丸数字（列見出しに実物同様の番号を付ける）
const CIRCLED_DIGITS = [
  "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩",
  "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳",
];

function cellColor(count: number): RGB | null {
  if (count > HIGH_THRESHOLD) return rgb(0.93, 0.35, 0.31); // 赤系（20件を超える）
  if (count > MID_THRESHOLD) return rgb(1, 0.88, 0.35); // 黄系（5件を超える）
  return null;
}

export interface MonthlyTableRow {
  label: string; // 例："5/11 穴掘り" / 先頭行は "月合計"
  counts: number[]; // riskItemNames と同じ並び
  total: number;
  isSummaryRow?: boolean;
}

export interface MonthlyReportPdfData {
  title: string; // 例："器工具・リスクアセスメント記録集計"
  monthLabel: string; // 例："5月"
  generatedDateLabel: string; // 例："2026/6/2"
  personInChargeLabel: string; // 例："安全管理担当"
  riskItemNames: string[];
  rows: MonthlyTableRow[];
  hiyariHattoItems: string[]; // 「今月のヒヤリハット」欄の本文（番号は自動採番）
  countermeasures: string[]; // 「対策」欄。hiyariHattoItemsと同じ並び・同じ件数を想定
}

function wrapTextByWidth(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (text.length === 0) return [""];
  const lines: string[] = [];
  let currentLine = "";
  for (const char of text) {
    const candidate = currentLine + char;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = candidate;
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);
  return lines;
}

export async function generateMonthlyReportPdf(data: MonthlyReportPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const { regular: font } = await embedFonts(pdfDoc);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  const BORDER = rgb(0.15, 0.15, 0.15);

  function newPage() {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    return PAGE_HEIGHT - MARGIN;
  }

  let y = PAGE_HEIGHT - MARGIN;

  // --- ヘッダー（実物同様：左に月、中央にタイトル、右上に日付・担当） ---
  page.drawText(data.title, {
    x: PAGE_WIDTH / 2 - font.widthOfTextAtSize(data.title, 16) / 2,
    y,
    size: 16,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawText(data.generatedDateLabel, {
    x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(data.generatedDateLabel, 10),
    y: y + 4,
    size: 10,
    font,
  });
  page.drawText(data.personInChargeLabel, {
    x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(data.personInChargeLabel, 10),
    y: y - 10,
    size: 10,
    font,
  });
  y -= 26;
  page.drawText(data.monthLabel, { x: MARGIN, y, size: 13, font });
  y -= 16;

  // --- 表 ---
  const labelColWidth = 92;
  const totalColWidth = 32;
  const riskColWidth = Math.max(
    24,
    (contentWidth - labelColWidth - totalColWidth) / Math.max(data.riskItemNames.length, 1)
  );
  const headerRowHeight = 34;
  const rowHeight = 15;

  function drawTableHeader(startY: number): number {
    let x = MARGIN;
    // 「内容」ラベル列（実物の左上セル）
    page.drawRectangle({
      x,
      y: startY - headerRowHeight,
      width: labelColWidth,
      height: headerRowHeight,
      borderColor: BORDER,
      borderWidth: 0.7,
    });
    page.drawText("内容", { x: x + 6, y: startY - headerRowHeight / 2 - 4, size: 9, font });
    x += labelColWidth;

    data.riskItemNames.forEach((name, i) => {
      page.drawRectangle({
        x,
        y: startY - headerRowHeight,
        width: riskColWidth,
        height: headerRowHeight,
        borderColor: BORDER,
        borderWidth: 0.7,
      });
      const circled = CIRCLED_DIGITS[i] ?? `(${i + 1})`;
      page.drawText(circled, {
        x: x + riskColWidth / 2 - font.widthOfTextAtSize(circled, 8) / 2,
        y: startY - 11,
        size: 8,
        font,
      });
      const lines = wrapTextByWidth(name, font, 6.5, riskColWidth - 4);
      lines.slice(0, 3).forEach((line, li) => {
        page.drawText(line, {
          x: x + riskColWidth / 2 - font.widthOfTextAtSize(line, 6.5) / 2,
          y: startY - 22 - li * 8,
          size: 6.5,
          font,
        });
      });
      x += riskColWidth;
    });

    page.drawRectangle({
      x,
      y: startY - headerRowHeight,
      width: totalColWidth,
      height: headerRowHeight,
      borderColor: BORDER,
      borderWidth: 0.7,
    });
    page.drawText("件数", { x: x + 4, y: startY - headerRowHeight / 2 - 4, size: 8, font });

    return startY - headerRowHeight;
  }

  y = drawTableHeader(y);

  data.rows.forEach((row) => {
    if (y - rowHeight < MARGIN + 70) {
      y = newPage();
      y = drawTableHeader(y);
    }
    const rowTop = y;
    page.drawRectangle({
      x: MARGIN,
      y: rowTop - rowHeight,
      width: labelColWidth,
      height: rowHeight,
      borderColor: BORDER,
      borderWidth: 0.6,
      color: row.isSummaryRow ? rgb(0.9, 0.9, 0.9) : undefined,
    });
    const labelLines = wrapTextByWidth(row.label, font, 8, labelColWidth - 6);
    page.drawText(labelLines[0] ?? "", { x: MARGIN + 3, y: rowTop - 11, size: 8, font });

    let x = MARGIN + labelColWidth;
    row.counts.forEach((count) => {
      // Excel C4:O4相当：危険項目ごとのセル色分けは「月合計」行のみに適用する
      const bg = row.isSummaryRow ? cellColor(count) : null;
      page.drawRectangle({
        x,
        y: rowTop - rowHeight,
        width: riskColWidth,
        height: rowHeight,
        borderColor: BORDER,
        borderWidth: 0.6,
        color: bg ?? undefined,
      });
      if (count > 0) {
        const text = String(count);
        page.drawText(text, {
          x: x + riskColWidth / 2 - font.widthOfTextAtSize(text, 8) / 2,
          y: rowTop - 11,
          size: 8,
          font,
        });
      }
      x += riskColWidth;
    });

    // 件数（合計）列は行の種類にかかわらず毎回、値に応じて色分けする
    const totalBg = cellColor(row.total);
    page.drawRectangle({
      x,
      y: rowTop - rowHeight,
      width: totalColWidth,
      height: rowHeight,
      borderColor: BORDER,
      borderWidth: 0.6,
      color: totalBg ?? undefined,
    });
    const totalText = String(row.total);
    page.drawText(totalText, {
      x: x + totalColWidth / 2 - font.widthOfTextAtSize(totalText, 8) / 2,
      y: rowTop - 11,
      size: 8,
      font,
    });

    y -= rowHeight;
  });

  y -= 22;

  // --- 今月のヒヤリハット／対策（実物同様：赤枠・緑枠の2カラム） ---
  const boxWidth = (contentWidth - 16) / 2;
  const boxTop = y;
  const hiyariX = MARGIN;
  const taisakuX = MARGIN + boxWidth + 16;

  function drawBox(x: number, title: string, items: string[], borderColor: RGB) {
    let by = boxTop;
    if (by - 30 < MARGIN) {
      by = newPage();
    }
    const boxStartY = by;
    page.drawCircle({ x: x + 6, y: by - 4, size: 3, color: rgb(0, 0, 0) });
    page.drawText(title, { x: x + 14, y: by - 8, size: 13, font });
    by -= 24;
    items.forEach((item, i) => {
      if (by - 14 < MARGIN) {
        by = newPage();
      }
      const lines = wrapTextByWidth(`${i + 1}　${item}`, font, 9, boxWidth - 14);
      lines.forEach((line) => {
        if (by - 12 < MARGIN) {
          by = newPage();
        }
        page.drawText(line, { x: x + 8, y: by, size: 9, font });
        by -= 13;
      });
      by -= 8;
    });
    page.drawRectangle({
      x: x - 4,
      y: by - 4,
      width: boxWidth,
      height: boxStartY - by + 4,
      borderColor,
      borderWidth: 1.4,
    });
  }

  drawBox(hiyariX, "今月のヒヤリハット", data.hiyariHattoItems, rgb(0.82, 0.22, 0.2));
  drawBox(taisakuX, "対策", data.countermeasures, rgb(0.55, 0.62, 0.25));

  return pdfDoc.save();
}
