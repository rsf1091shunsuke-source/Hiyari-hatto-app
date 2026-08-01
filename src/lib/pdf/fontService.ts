/**
 * フォント埋め込みサービス
 * 参照：しゅんすけさん指示（PDF生成処理はサービス層へ分離）
 */

import { PDFDocument, PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { loadFontBytes } from "./fonts/fontCache";
import { FontWeight } from "./fonts/fontConfig";

export interface PdfFontSet {
  regular: PDFFont;
  // 将来 medium / bold を追加した場合はここにフィールドを増やす
}

/**
 * 指定したPDFDocumentにNoto Sans JPを登録・サブセット埋め込みする。
 * subset: true により、実際に使用したグリフのみが埋め込まれるため、
 * 元フォントファイルが約9MBでも出力PDFへの寄与は数十KB程度に収まる。
 */
export async function embedFonts(pdfDoc: PDFDocument): Promise<PdfFontSet> {
  pdfDoc.registerFontkit(fontkit);

  const regularBytes = loadFontBytes("regular" as FontWeight);
  const regular = await pdfDoc.embedFont(regularBytes, { subset: true });

  return { regular };
}
