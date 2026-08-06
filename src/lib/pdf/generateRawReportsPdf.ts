/**
 * ヒヤリハット記録一覧PDF生成サービス
 *
 * 1件ごとの記録（日時・作業内容・選んだ危険項目）をそのまま一覧形式で出力する。
 * AI分析機能とは独立しており、AI分析を使わない運用でも利用できる。
 */

import { PDFDocument, PDFFont, rgb } from "pdf-lib";
import { embedFonts } from "./fontService";

const MM_TO_PT = 2.834645669;
const MARGIN = 20 * MM_TO_PT;
const PAGE_WIDTH = 210 * MM_TO_PT;
const PAGE_HEIGHT = 297 * MM_TO_PT;

export interface RawReportRow {
  dateTimeLabel: string;
  taskName: string;
  riskItemNames: string[];
}

export interface RawReportsPdfData {
  periodLabel: string;
  totalCount: number;
  rows: RawReportRow[];
}

function wrapTextByWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  let currentLine = "";
  for (const char of text) {
    const candidate = currentLine + char;
    const width = font.widthOfTextAtSize(candidate, size);
    if (width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = candidate;
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);
  return lines.length > 0 ? lines : [""];
}

export async function generateRawReportsPdf(data: RawReportsPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const { regular: font } = await embedFonts(pdfDoc);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const contentWidth = PAGE_WIDTH - MARGIN * 2;

  function ensureSpace(height: number) {
    if (y - height < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  }

  page.drawText("ヒヤリハット記録一覧", { x: MARGIN, y, size: 22, font, color: rgb(0, 0, 0) });
  y -= 32;

  const drawLine = (text: string, size = 11) => {
    const lines = wrapTextByWidth(text, font, size, contentWidth);
    lines.forEach((line) => {
      ensureSpace(size + 6);
      page.drawText(line, { x: MARGIN, y, size, font, color: rgb(0.1, 0.1, 0.1) });
      y -= size + 6;
    });
  };

  drawLine(`対象期間：${data.periodLabel}`);
  drawLine(`件数：${data.totalCount}件`);
  y -= 10;

  if (data.rows.length === 0) {
    ensureSpace(20);
    page.drawText("該当する記録はありません", { x: MARGIN, y, size: 11, font });
  }

  data.rows.forEach((row, index) => {
    ensureSpace(24);
    page.drawLine({
      start: { x: MARGIN, y: y + 8 },
      end: { x: PAGE_WIDTH - MARGIN, y: y + 8 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    drawLine(`${index + 1}. ${row.dateTimeLabel}　作業内容：${row.taskName}`, 11);
    drawLine(`危険項目：${row.riskItemNames.join("、") || "（なし）"}`, 10);
    y -= 6;
  });

  return pdfDoc.save();
}
