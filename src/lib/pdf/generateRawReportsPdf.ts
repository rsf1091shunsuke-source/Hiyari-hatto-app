/**
 * ヒヤリハット記録一覧PDF生成サービス
 *
 * 1件ごとの記録（日時・作業内容・危険項目・自由記述）を、罫線で区切った
 * 表形式で出力する。列ごとに幅を固定し、はみ出す文字は折り返すことで
 * 文字の重なりを防ぐ（文章を連結して描画する旧方式で重なりが発生したため見直し）。
 */

import { PDFDocument, PDFFont, rgb } from "pdf-lib";
import { embedFonts } from "./fontService";

const MM_TO_PT = 2.834645669;
const MARGIN = 14 * MM_TO_PT;
const PAGE_WIDTH = 297 * MM_TO_PT; // A4横（列数・自由記述の分量を考慮し横向き）
const PAGE_HEIGHT = 210 * MM_TO_PT;

export interface RawReportRow {
  dateTimeLabel: string;
  taskName: string;
  riskItemNames: string[];
  freeText: string | null;
}

export interface RawReportsPdfData {
  periodLabel: string;
  totalCount: number;
  rows: RawReportRow[];
}

const FONT_SIZE = 9;
const LINE_HEIGHT = 12;
const CELL_PADDING = 5;
const HEADER_HEIGHT = 20;

// 列定義（幅はpt）
const COLUMNS: { key: keyof Omit<RawReportRow, "riskItemNames"> | "riskItemNames"; label: string; width: number }[] = [
  { key: "dateTimeLabel", label: "日時", width: 95 },
  { key: "taskName", label: "作業内容", width: 90 },
  { key: "riskItemNames", label: "危険項目", width: 190 },
  { key: "freeText", label: "自由記述", width: 340 },
];

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

function cellText(row: RawReportRow, key: (typeof COLUMNS)[number]["key"]): string {
  if (key === "riskItemNames") return row.riskItemNames.join("、") || "（なし）";
  if (key === "freeText") return row.freeText?.trim() || "（自由記述なし）";
  return row[key];
}

export async function generateRawReportsPdf(data: RawReportsPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const { regular: font } = await embedFonts(pdfDoc);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const contentWidth = PAGE_WIDTH - MARGIN * 2;

  function drawHeaderBlock() {
    page.drawText("ヒヤリハット記録一覧", { x: MARGIN, y, size: 18, font, color: rgb(0, 0, 0) });
    y -= 22;
    page.drawText(`対象期間：${data.periodLabel}　／　件数：${data.totalCount}件`, {
      x: MARGIN,
      y,
      size: 10,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
    y -= 18;
  }

  function drawTableHeader() {
    let x = MARGIN;
    COLUMNS.forEach((col) => {
      page.drawRectangle({
        x,
        y: y - HEADER_HEIGHT,
        width: col.width,
        height: HEADER_HEIGHT,
        color: rgb(0.93, 0.93, 0.95),
        borderColor: rgb(0.6, 0.6, 0.6),
        borderWidth: 0.5,
      });
      page.drawText(col.label, {
        x: x + CELL_PADDING,
        y: y - HEADER_HEIGHT + 6,
        size: 10,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      x += col.width;
    });
    y -= HEADER_HEIGHT;
  }

  function newPage() {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    drawTableHeader();
  }

  drawHeaderBlock();
  drawTableHeader();

  if (data.rows.length === 0) {
    page.drawText("該当する記録はありません", { x: MARGIN, y: y - 16, size: 11, font });
    return pdfDoc.save();
  }

  data.rows.forEach((row, index) => {
    // 各列の折り返し行数から、この行に必要な高さを先に計算する
    const wrappedByColumn = COLUMNS.map((col) =>
      wrapTextByWidth(cellText(row, col.key), font, FONT_SIZE, col.width - CELL_PADDING * 2)
    );
    const maxLines = Math.max(...wrappedByColumn.map((lines) => lines.length));
    const rowHeight = Math.max(LINE_HEIGHT + CELL_PADDING, maxLines * LINE_HEIGHT + CELL_PADDING);

    if (y - rowHeight < MARGIN) {
      newPage();
    }

    const rowTop = y;
    const bg = index % 2 === 1 ? rgb(0.97, 0.97, 0.98) : rgb(1, 1, 1);
    let x = MARGIN;
    COLUMNS.forEach((col, colIndex) => {
      page.drawRectangle({
        x,
        y: rowTop - rowHeight,
        width: col.width,
        height: rowHeight,
        color: bg,
        borderColor: rgb(0.85, 0.85, 0.87),
        borderWidth: 0.5,
      });
      wrappedByColumn[colIndex].forEach((line, lineIndex) => {
        page.drawText(line, {
          x: x + CELL_PADDING,
          y: rowTop - CELL_PADDING - 8 - lineIndex * LINE_HEIGHT,
          size: FONT_SIZE,
          font,
          color: rgb(0.15, 0.15, 0.15),
        });
      });
      x += col.width;
    });

    y -= rowHeight;
  });

  return pdfDoc.save();
}
