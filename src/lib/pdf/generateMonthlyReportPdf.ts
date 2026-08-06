/**
 * 月次報告書PDF生成サービス
 * 参照：しゅんすけさん提供の紙の様式（器工具・リスクアセスメント記録集計）を再現
 *
 * 構成：
 * 1. 表：列＝危険項目、行＝月合計＋日付ごと（同日同作業内容はまとめず、日付×作業内容単位で1行）
 *    件数の大小に応じて背景色を変える（多い＝赤、やや多い＝黄）
 * 2. 今月のヒヤリハット：教官が選んだ記述を番号付きで列挙
 * 3. 対策：上記に対応する番号付きの対策文
 */

import { PDFDocument, PDFFont, rgb, RGB } from "pdf-lib";
import { embedFonts } from "./fontService";

const MM_TO_PT = 2.834645669;
const MARGIN = 14 * MM_TO_PT;
const PAGE_WIDTH = 297 * MM_TO_PT; // A4横（列数が多いため横向き）
const PAGE_HEIGHT = 210 * MM_TO_PT;

// 件数に応じた背景色のしきい値（実際の運用を見ながら調整可能）
const HIGH_THRESHOLD = 20;
const MID_THRESHOLD = 5;

function cellColor(count: number): RGB | null {
  if (count >= HIGH_THRESHOLD) return rgb(0.96, 0.55, 0.5); // 赤系
  if (count >= MID_THRESHOLD) return rgb(0.98, 0.9, 0.4); // 黄系
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
  return lines.length > 0 ? lines : [""];
}

export async function generateMonthlyReportPdf(data: MonthlyReportPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const { regular: font } = await embedFonts(pdfDoc);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const contentWidth = PAGE_WIDTH - MARGIN * 2;

  function newPage() {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    return PAGE_HEIGHT - MARGIN;
  }

  let y = PAGE_HEIGHT - MARGIN;

  // --- ヘッダー ---
  page.drawText(data.title, { x: MARGIN, y, size: 18, font, color: rgb(0, 0, 0) });
  page.drawText(data.generatedDateLabel, {
    x: PAGE_WIDTH - MARGIN - 90,
    y,
    size: 10,
    font,
  });
  page.drawText(data.personInChargeLabel, {
    x: PAGE_WIDTH - MARGIN - 90,
    y: y - 14,
    size: 10,
    font,
  });
  y -= 28;
  page.drawText(data.monthLabel, { x: MARGIN, y, size: 13, font });
  y -= 20;

  // --- 表 ---
  const labelColWidth = 90;
  const totalColWidth = 32;
  const riskColWidth = Math.max(
    26,
    (contentWidth - labelColWidth - totalColWidth) / Math.max(data.riskItemNames.length, 1)
  );
  const rowHeight = 16;

  function drawTableHeader(startY: number): number {
    let hy = startY;
    page.drawRectangle({
      x: MARGIN,
      y: hy - rowHeight,
      width: contentWidth,
      height: rowHeight,
      borderColor: rgb(0.6, 0.6, 0.6),
      borderWidth: 0.5,
    });
    let x = MARGIN + labelColWidth;
    data.riskItemNames.forEach((name, i) => {
      page.drawText(`${i + 1}`, { x: x + 2, y: hy - 12, size: 8, font });
      const lines = wrapTextByWidth(name, font, 6.5, riskColWidth - 4);
      lines.slice(0, 2).forEach((line, li) => {
        page.drawText(line, { x: x + 2, y: hy - 12 - (li + 1) * 7, size: 6.5, font });
      });
      page.drawRectangle({
        x,
        y: hy - rowHeight,
        width: riskColWidth,
        height: rowHeight,
        borderColor: rgb(0.6, 0.6, 0.6),
        borderWidth: 0.5,
      });
      x += riskColWidth;
    });
    page.drawText("件数", { x: x + 4, y: hy - 12, size: 8, font });
    hy -= rowHeight;
    return hy;
  }

  y = drawTableHeader(y);

  data.rows.forEach((row) => {
    if (y - rowHeight < MARGIN + 60) {
      y = newPage();
      y = drawTableHeader(y);
    }
    const rowTop = y;
    page.drawRectangle({
      x: MARGIN,
      y: rowTop - rowHeight,
      width: labelColWidth,
      height: rowHeight,
      borderColor: rgb(0.6, 0.6, 0.6),
      borderWidth: 0.5,
      color: row.isSummaryRow ? rgb(0.92, 0.92, 0.92) : undefined,
    });
    const labelLines = wrapTextByWidth(row.label, font, 8, labelColWidth - 4);
    page.drawText(labelLines[0] ?? "", { x: MARGIN + 2, y: rowTop - 11, size: 8, font });

    let x = MARGIN + labelColWidth;
    row.counts.forEach((count) => {
      const bg = cellColor(count);
      page.drawRectangle({
        x,
        y: rowTop - rowHeight,
        width: riskColWidth,
        height: rowHeight,
        borderColor: rgb(0.6, 0.6, 0.6),
        borderWidth: 0.5,
        color: bg ?? undefined,
      });
      if (count > 0) {
        page.drawText(String(count), { x: x + 4, y: rowTop - 11, size: 8, font });
      }
      x += riskColWidth;
    });

    const totalBg = cellColor(row.total);
    page.drawRectangle({
      x,
      y: rowTop - rowHeight,
      width: totalColWidth,
      height: rowHeight,
      borderColor: rgb(0.6, 0.6, 0.6),
      borderWidth: 0.5,
      color: totalBg ?? undefined,
    });
    page.drawText(String(row.total), { x: x + 4, y: rowTop - 11, size: 8, font });

    y -= rowHeight;
  });

  y -= 20;

  // --- 今月のヒヤリハット／対策 ---
  const boxWidth = (contentWidth - 16) / 2;
  const boxTop = y;
  const hiyariX = MARGIN;
  const taisakuX = MARGIN + boxWidth + 16;

  function drawBox(
    x: number,
    title: string,
    items: string[],
    borderColor: RGB
  ) {
    let by = boxTop;
    if (by - 24 < MARGIN) {
      by = newPage();
    }
    page.drawText(`● ${title}`, { x, y: by, size: 13, font });
    by -= 20;
    items.forEach((item, i) => {
      if (by - 14 < MARGIN) {
        by = newPage();
      }
      const lines = wrapTextByWidth(`${i + 1}　${item}`, font, 9, boxWidth - 10);
      lines.forEach((line) => {
        if (by - 12 < MARGIN) {
          by = newPage();
        }
        page.drawText(line, { x: x + 4, y: by, size: 9, font });
        by -= 12;
      });
      by -= 6;
    });
    page.drawRectangle({
      x: x - 4,
      y: by,
      width: boxWidth,
      height: boxTop - by + 4,
      borderColor,
      borderWidth: 1,
    });
  }

  drawBox(hiyariX, "今月のヒヤリハット", data.hiyariHattoItems, rgb(0.8, 0.3, 0.3));
  drawBox(taisakuX, "対策", data.countermeasures, rgb(0.5, 0.6, 0.3));

  return pdfDoc.save();
}
