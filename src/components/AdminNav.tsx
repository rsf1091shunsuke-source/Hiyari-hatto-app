"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/dashboard", label: "ダッシュボード" },
  { href: "/admin/stats", label: "統計・分析" },
  { href: "/admin/risk-items", label: "危険項目管理" },
  { href: "/admin/tasks", label: "作業内容管理" },
  { href: "/admin/students", label: "訓練生管理" },
  { href: "/admin/ai-analysis", label: "AI分析" },
  { href: "/admin/pdf", label: "PDF出力" },
  { href: "/admin/monthly-report", label: "月次報告書" },
  { href: "/admin/settings", label: "設定" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1.5 border-b border-black/[0.06] bg-surface/90 px-3 py-2.5 backdrop-blur-glass">
      {links.map((l) => {
        const isActive = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive ? "page" : undefined}
            className={[
              "min-h-[38px] rounded-full px-3.5 py-2 text-ios-footnote font-medium transition-colors duration-150",
              isActive
                ? "bg-primary text-white shadow-button"
                : "text-label-secondary hover:bg-black/[0.04]",
            ].join(" ")}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
