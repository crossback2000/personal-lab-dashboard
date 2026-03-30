"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { deleteTestsAction } from "@/app/dashboard/actions";
import type { DashboardCardData } from "@/lib/data/repository";
import { categoryLabel } from "@/lib/constants";
import type { TestRow } from "@/types/database";
import { Button } from "@/components/ui/button";
import { TestCard } from "@/components/dashboard/test-card";

type SectionData = {
  category: TestRow["category"];
  cards: DashboardCardData[];
};

type ActionState = {
  ok: boolean;
  message: string;
};

const INITIAL_ACTION_STATE: ActionState = {
  ok: false,
  message: ""
};

export function DashboardTestGrid({ sections }: { sections: SectionData[] }) {
  const [state, action] = useActionState(deleteTestsAction, INITIAL_ACTION_STATE);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allIds = useMemo(
    () => sections.flatMap((section) => section.cards.map((card) => card.test.id)),
    [sections]
  );
  const allSelected = allIds.length > 0 && selectedIds.length === allIds.length;

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => allIds.includes(id)));
  }, [allIds]);

  useEffect(() => {
    if (state.ok) {
      setSelectedIds([]);
    }
  }, [state.ok]);

  function toggleOne(testId: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(testId) ? current : [...current, testId];
      }
      return current.filter((value) => value !== testId);
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? allIds : []);
  }

  return (
    <form
      action={action}
      className="space-y-6"
      onSubmit={(event) => {
        if (selectedIds.length === 0) {
          return;
        }

        if (
          typeof window !== "undefined" &&
          !window.confirm(`선택한 ${selectedIds.length}개 검사 항목과 연결된 데이터 전체를 삭제할까요?`)
        ) {
          event.preventDefault();
        }
      }}
    >
      {sections.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(event) => toggleAll(event.target.checked)}
            />
            전체 선택 ({selectedIds.length}개 선택)
          </label>
          <div className="space-y-1 text-right">
            <Button type="submit" variant="destructive" disabled={selectedIds.length === 0}>
              선택한 항목 삭제
            </Button>
            {state.message ? (
              <p className={`text-sm ${state.ok ? "text-secondary-foreground" : "text-destructive"}`}>
                {state.message}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {sections.map((section) => (
        <section key={section.category} className="space-y-3">
          <h3 className="text-lg font-semibold">{categoryLabel(section.category)}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {section.cards.map((card) => {
              const checked = selectedIdSet.has(card.test.id);
              return (
                <div key={card.test.id} className="flex items-start gap-3">
                  <label className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      name="test_ids"
                      value={card.test.id}
                      checked={checked}
                      onChange={(event) => toggleOne(card.test.id, event.target.checked)}
                    />
                    선택
                  </label>
                  <div className="min-w-0 flex-1">
                    <TestCard
                      test={card.test}
                      latest={card.latest}
                      sparklineValues={card.sparklineValues}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </form>
  );
}
