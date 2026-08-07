/**
 * PDFフォント設定
 * 参照：しゅんすけさん指示（案A：pdf-lib + fontkit + Noto Sans JP）
 *
 * 【重要】可変フォント（Variable Font）は使用しないこと。
 * 以前 NotoSansJP-Variable.ttf を使用していたところ、pdf-lib/fontkitでの
 * 文字幅計算（widthOfTextAtSize）と実際の描画位置がずれ、PDF出力時に文字が
 * 重なって読めなくなる不具合が発生した（実際に発生した不具合対応）。
 * 現在は固定ウェイトの静的フォント（Noto Sans CJK JP Regular、TTCから抽出）を使用する。
 *
 * ウェイトを追加したい場合も、必ず静的（Static）フォントファイルを使用すること。
 */

export type FontWeight = "regular" | "medium" | "bold";

export const FONT_FAMILY = "NotoSansJP";

export const FONT_FILE_PATHS: Partial<Record<FontWeight, string>> = {
  regular: "src/assets/fonts/NotoSansCJKjp-Regular.ttf",
  // medium: "src/assets/fonts/NotoSansCJKjp-Medium.ttf",  // 将来追加する場合はここに追記（静的フォントのみ）
  // bold: "src/assets/fonts/NotoSansCJKjp-Bold.ttf",      // 将来追加する場合はここに追記（静的フォントのみ）
};
