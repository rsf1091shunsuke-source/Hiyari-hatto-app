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
    <div className="px-4 py-4 pb-24">
      <button
        type="button"
        onClick={onBack}
        aria-label="戻る"
        className="mb-4 min-h-[44px] text-primary"
      >
        ← 戻る
      </button>
      <h1 className="mb-4 text-lg font-semibold">危険だったところを選んでください</h1>

      <div className="flex flex-wrap gap-2">
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
          <h2 className="mb-2 mt-4 text-sm font-semibold text-label-secondary">
            その他の項目
          </h2>
          <div className="flex flex-wrap gap-2 opacity-70">
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
        <div className="mt-6">
          <Chip
            label={systemItem.name}
            isSelected={selectedIds.includes(systemItem.id)}
            onToggle={() => toggle(systemItem.id)}
          />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 flex items-center justify-between bg-surface px-4 py-3 shadow-card-elevated">
        <span className="text-sm text-label-secondary">
          {selectedIds.length}件選択中
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
