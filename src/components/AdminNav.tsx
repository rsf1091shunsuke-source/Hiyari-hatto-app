"use client";

import Link from "next/link";

const links = [
  { href: "/admin/dashboard", label: "ダッシュボード" },
  { href: "/admin/stats", label: "統計・分析" },
  { href: "/admin/risk-items", label: "危険項目管理" },
  { href: "/admin/tasks", label: "作業内容管理" },
  { href: "/admin/students", label: "訓練生管理" },
  { href: "/admin/ai-analysis", label: "AI分析" },
  { href: "/admin/pdf", label: "PDF出力" },
  { href: "/admin/settings", label: "設定" },
];

export function AdminNav() {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-black/10 bg-surface px-2 py-2">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="min-h-[44px] whitespace-nowrap rounded-card px-3 py-2 text-sm text-label hover:bg-black/5"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
