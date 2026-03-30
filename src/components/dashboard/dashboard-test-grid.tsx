"use client";

import { useMemo, useState } from "react";
import type { DashboardCardData } from "@/lib/data/repository";
import { categoryLabel } from "@/lib/constants";
import type { TestRow } from "@/types/database";
import { TestCard } from "@/components/dashboard/test-card";
import { Input } from "@/components/ui/input";

type SectionData = {
  category: TestRow["category"];
  cards: DashboardCardData[];
};

export function DashboardTestGrid({ sections }: { sections: SectionData[] }) {
  const [query, setQuery] = useState("");
  const filteredSections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return sections;
    }

    return sections
      .map((section) => ({
        ...section,
        cards: section.cards.filter((card) => {
          const label = `${card.test.name_ko || ""} ${card.test.name_en || ""}`.toLowerCase();
          return label.includes(normalized);
        })
      }))
      .filter((section) => section.cards.length > 0);
  }, [query, sections]);

  const visibleCount = filteredSections.reduce((count, section) => count + section.cards.length, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <Input
            placeholder="검사항목 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            {query.trim()
              ? `${visibleCount}개 항목이 검색되었습니다.`
              : "검사항목명(한글/영문)으로 원하는 카드만 빠르게 볼 수 있습니다."}
          </p>
        </div>
      </div>

      {filteredSections.map((section) => (
        <section key={section.category} className="space-y-3">
          <h3 className="text-lg font-semibold">{categoryLabel(section.category)}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {section.cards.map((card) => (
              <TestCard
                key={card.test.id}
                test={card.test}
                latest={card.latest}
                sparklineValues={card.sparklineValues}
              />
            ))}
          </div>
        </section>
      ))}

      {filteredSections.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          검색 조건에 맞는 검사항목이 없습니다.
        </div>
      ) : null}
    </div>
  );
}
