/**
 * フォントバイトキャッシュ
 * 参照：しゅんすけさん指示（フォントは毎回読み込まずキャッシュする）
 *
 * pdf-libの埋め込みフォント（PDFFont）はPDFDocumentインスタンスに紐づくため
 * ドキュメントをまたいで使い回せないが、元となるフォントバイト列（ディスクI/O）は
 * サーバーインスタンスが生きている間キャッシュして再利用する。
 */

import fs from "fs";
import path from "path";
import { FONT_FILE_PATHS, FontWeight } from "./fontConfig";

const byteCache = new Map<FontWeight, Buffer>();

export function loadFontBytes(weight: FontWeight = "regular"): Buffer {
  const cached = byteCache.get(weight);
  if (cached) return cached;

  const relativePath = FONT_FILE_PATHS[weight];
  if (!relativePath) {
    throw new Error(
      `フォントウェイト "${weight}" は設定されていません（src/lib/pdf/fonts/fontConfig.ts を確認してください）`
    );
  }

  const fullPath = path.join(process.cwd(), relativePath);
  const bytes = fs.readFileSync(fullPath);
  byteCache.set(weight, bytes);
  return bytes;
}
