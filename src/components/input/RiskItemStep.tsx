"use client";

/**
 * 1-3. 危険項目選択
 * 参照：詳細設計書 1-3画面仕様（動的優先表示、特になしとの排他選択）
 */

import { useMemo, useState } from "react";
import { Chip } from "@/components/SelectableCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RiskItemMaster } from "./types";

interface RiskItemStepProps {
  riskItems: RiskItemMaster[];
  selectedTaskId: string;
  onNext: (riskItemIds: string[]) => void;
  onBack: () => void;
}

export function RiskItemStep({
  riskItems,
  selectedTaskId,
  onNext,
  onBack,
}: RiskItemStepProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { primaryGroup, otherGroup, systemItem } = useMemo(() => {
    const nonSystem = riskItems.filter((r) => !r.isSystemItem);
    const system = riskItems.find((r) => r.isSystemItem);
    const primary = nonSystem
      .filter((r) => r.relatedTaskIds.includes(selectedTaskId))
      .sort((a, b) => a.order - b.order);
    const other = nonSystem
      .filter((r) => !r.relatedTaskIds.includes(selectedTaskId))
      .sort((a, b) => a.order - b.order);
    return { primaryGroup: primary, otherGroup: other, systemItem: system };
  }, [riskItems, selectedTaskId]);

  const toggle = (id: string) => {
    const item = riskItems.find((r) => r.id === id);
    if (!item) return;

    if (item.isSystemItem) {
      // 特になし選択時は他の選択をすべて解除（排他制御）
      setSelectedIds((prev) => (prev.includes(id) ? [] : [id]));
      return;
    }

    setSelectedIds((prev) => {
      const withoutSystem = prev.filter((pid) => pid !== systemItem?.id);
      return withoutSystem.includes(id)
        ? withoutSystem.filter((pid) => pid !== id)
        : [...withoutSystem, id];
    });
  };

  return (
    <div className="px-5 py-6 pb-28">
      <button
        type="button"
        onClick={onBack}
        aria-label="戻る"
        className="mb-3 -ml-1 flex min-h-[44px] items-center gap-1 text-ios-body text-primary"
      >
        <svg width="10" height="17" viewBox="0 0 10 17" fill="none" aria-hidden="true">
          <path d="M9 1L1.5 8.5L9 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        戻る
      </button>
      <h1 className="mb-1 text-ios-title1">危険だったところを選んでください</h1>
      <p className="mb-6 text-ios-subhead text-label-secondary">
        当てはまるものをすべて選んでください
      </p>

      <div className="flex flex-wrap gap-2.5">
        {primaryGroup.map((item) => (
          <Chip
            key={item.id}
            label={item.name}
            isSelected={selectedIds.includes(item.id)}
            onToggle={() => toggle(item.id)}
          />
        ))}
      </div>

      {otherGroup.length > 0 && (
        <>
          <h2 className="mb-3 mt-6 text-ios-footnote font-semibold uppercase tracking-wide text-label-secondary">
            その他の項目
          </h2>
          <div className="flex flex-wrap gap-2.5 opacity-80">
            {otherGroup.map((item) => (
              <Chip
                key={item.id}
                label={item.name}
                isSelected={selectedIds.includes(item.id)}
                onToggle={() => toggle(item.id)}
              />
            ))}
          </div>
        </>
      )}

      {systemItem && (
        <div className="mt-7 border-t border-black/[0.06] pt-5">
          <Chip
            label={systemItem.name}
            isSelected={selectedIds.includes(systemItem.id)}
            onToggle={() => toggle(systemItem.id)}
          />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 flex items-center justify-between border-t border-black/[0.06] bg-surface/90 px-5 py-3.5 backdrop-blur-glass [padding-bottom:max(0.875rem,env(safe-area-inset-bottom))]">
        <span className="text-ios-subhead text-label-secondary">
          {selectedIds.length > 0 ? `${selectedIds.length}件選択中` : "1件以上選んでください"}
        </span>
        <PrimaryButton
          label="次へ"
          onPress={() => onNext(selectedIds)}
          isDisabled={selectedIds.length === 0}
        />
      </div>
    </div>
  );
}
