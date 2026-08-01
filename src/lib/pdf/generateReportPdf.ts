/**
 * 掲示用PDF生成サービス
 * 参照：詳細設計書 7章 PDF設計
 *       しゅんすけさん指示（案A：pdf-lib + fontkit + Noto Sans JP、日本語文字化け対応）
 */

import { PDFDocument, PDFFont, rgb } from "pdf-lib";
import { AIAnalysisContents } from "@/types/firestore";
import { embedFonts } from "./fontService";

const MM_TO_PT = 2.834645669;
const MARGIN = 20 * MM_TO_PT; // 7章: 上下左右余白20mm
const PAGE_WIDTH = 210 * MM_TO_PT; // A4縦
const PAGE_HEIGHT = 297 * MM_TO_PT;

interface RankingItem {
  name: string;
  count: number;
}

export interface PdfReportData {
  dateLabel: string;
  periodLabel: string;
  totalReports: number;
  riskItemRanking: RankingItem[];
  taskRanking: RankingItem[];
  aiContents: AIAnalysisContents;
}

// 実際のフォント幅を測定して行を折り返す（日本語はスペース区切りがないため文字単位で判定）
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

export async function generateReportPdf(data: PdfReportData): Promise<Uint8Array> {
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

  function drawHeading(text: string, size = 16) {
    ensureSpace(size + 12);
    page.drawText(text, { x: MARGIN, y, size, font, color: rgb(0, 0, 0) });
    y -= size + 12;
  }

  function drawBody(text: string, size = 11) {
    const lines = wrapTextByWidth(text, font, size, contentWidth);
    lines.forEach((line) => {
      ensureSpace(size + 6);
      page.drawText(line, { x: MARGIN, y, size, font, color: rgb(0.1, 0.1, 0.1) });
      y -= size + 6;
    });
  }

  function drawRanking(title: string, items: RankingItem[]) {
    drawHeading(title, 14);
    const max = Math.max(1, ...items.map((i) => i.count));
    items.forEach((item) => {
      ensureSpace(20);
      const barWidth = (item.count / max) * (contentWidth - 150);
      page.drawText(item.name, { x: MARGIN, y, size: 10, font });
      page.drawRectangle({
        x: MARGIN + 130,
        y: y - 2,
        width: barWidth,
        height: 10,
        color: rgb(0.04, 0.52, 1),
      });
      page.drawText(String(item.count), {
        x: MARGIN + 135 + barWidth,
        y,
        size: 10,
        font,
      });
      y -= 18;
    });
    y -= 8;
  }

  // 1ページ目：タイトル・日付・集計期間・ランキング・件数サマリー
  page.drawText("ヒヤリハット集計レポート", { x: MARGIN, y, size: 24, font, color: rgb(0, 0, 0) });
  y -= 36;
  drawBody(`日付：${data.dateLabel}　集計期間：${data.periodLabel}`);
  drawBody(`ヒヤリハット件数：${data.totalReports}件`);
  y -= 8;

  drawRanking("危険項目ランキング", data.riskItemRanking);
  drawRanking("作業内容ランキング", data.taskRanking);

  // 2ページ目相当：AI分析（ensureSpaceにより自動でページ分割）
  drawHeading("AI分析", 16);
  drawBody(data.aiContents.riskTrend);
  drawHeading("改善案", 14);
  drawBody(data.aiContents.improvement);
  drawHeading("対策案", 14);
  drawBody(data.aiContents.countermeasure);

  const morningBoxHeight = 60;
  ensureSpace(morningBoxHeight);
  page.drawRectangle({
    x: MARGIN,
    y: y - 50,
    width: contentWidth,
    height: 50,
    borderColor: rgb(0.04, 0.52, 1),
    borderWidth: 1,
  });
  page.drawText("朝礼コメント", { x: MARGIN + 8, y: y - 14, size: 10, font });
  const morningLines = wrapTextByWidth(
    data.aiContents.morningComment,
    font,
    9,
    contentWidth - 16
  );
  morningLines.slice(0, 2).forEach((line, i) => {
    page.drawText(line, { x: MARGIN + 8, y: y - 30 - i * 14, size: 9, font });
  });
  y -= morningBoxHeight;

  return pdfDoc.save();
}
