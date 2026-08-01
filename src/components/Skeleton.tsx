/**
 * Skeleton
 * 参照：詳細設計書 2章 コンポーネント設計（Skeleton：shape(text/card/chart)）
 *       1章 共通ルール（グレーのプレースホルダーが脈動するアニメーション）
 */

type Shape = "text" | "card" | "chart";

interface SkeletonProps {
  shape: Shape;
  className?: string;
}

const shapeClasses: Record<Shape, string> = {
  text: "h-4 w-full rounded",
  card: "h-24 w-full rounded-card",
  chart: "h-48 w-full rounded-card",
};

export function Skeleton({ shape, className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        "animate-pulse bg-black/10",
        shapeClasses[shape],
        className,
      ].join(" ")}
    />
  );
}
