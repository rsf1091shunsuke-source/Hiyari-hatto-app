/**
 * PDFフォント設定
 * 参照：しゅんすけさん指示（案A：pdf-lib + fontkit + Noto Sans JP）
 *
 * ウェイトを追加したい場合は、対応するフォントファイルを src/assets/fonts/ に配置し、
 * このマップにパスを追加するだけでよい（コード側の変更は不要）。
 * 現時点ではNoto Sans JPの可変フォント（デフォルトインスタンス＝Regular相当）のみを用意している。
 */

export type FontWeight = "regular" | "medium" | "bold";

export const FONT_FAMILY = "NotoSansJP";

export const FONT_FILE_PATHS: Partial<Record<FontWeight, string>> = {
  regular: "src/assets/fonts/NotoSansJP-Variable.ttf",
  // medium: "src/assets/fonts/NotoSansJP-Medium.ttf",  // 将来追加する場合はここに追記
  // bold: "src/assets/fonts/NotoSansJP-Bold.ttf",      // 将来追加する場合はここに追記
};
