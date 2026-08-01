/**
 * Claude API連携（AI分析生成）
 * 参照：詳細設計書 6章 AI設計
 */

import { AIInputData } from "./buildInputData";
import { AIAnalysisContents } from "@/types/firestore";

const SYSTEM_PROMPT = `あなたは作業訓練現場の安全管理を支援するアシスタントです。
与えられた集計データから、以下7カテゴリのコメントを生成してください。
断定的な予測は避け、「〜の傾向があります」という表現を使ってください。
安全指導の専門用語を使いすぎないでください。
朝礼コメントは60秒で読める分量（250〜350文字目安）にしてください。

出力は必ず以下のJSON形式のみとし、前置きやMarkdown装飾を含めないでください：
{
  "riskTrend": "危険傾向分析（200文字程度）",
  "prediction": "危険予測（150文字程度）",
  "improvement": "改善案（150文字程度）",
  "countermeasure": "対策案（150文字程度）",
  "morningComment": "朝礼コメント（250〜350文字）",
  "boardComment": "掲示用コメント（100文字程度）",
  "pdfComment": "PDF用コメント（150文字程度）"
}`;

export async function generateAIAnalysisContents(
  inputData: AIInputData
): Promise<AIAnalysisContents> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が設定されていません");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `以下の集計データからコメントを生成してください：\n${JSON.stringify(
            inputData
          )}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("AI生成に失敗しました");
  }

  const data = await response.json();
  const text = data.content
    ?.filter((block: { type: string }) => block.type === "text")
    .map((block: { text: string }) => block.text)
    .join("");

  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as AIAnalysisContents;
}
