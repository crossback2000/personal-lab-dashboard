import { CATEGORY_ORDER } from "@/lib/constants";
import { getDashboardCards, type DashboardCardData } from "@/lib/data/repository";
import { DashboardTestGrid } from "@/components/dashboard/dashboard-test-grid";
import type { TestRow } from "@/types/database";

type SectionData = {
  category: TestRow["category"];
  cards: DashboardCardData[];
};

export default async function DashboardPage() {
  const cards = await getDashboardCards({ sparklinePoints: 10 });
  const cardsByCategory = new Map<TestRow["category"], DashboardCardData[]>();
  for (const card of cards) {
    const list = cardsByCategory.get(card.test.category);
    if (list) {
      list.push(card);
      continue;
    }
    cardsByCategory.set(card.test.category, [card]);
  }

  const sections: SectionData[] = CATEGORY_ORDER.map((category) => ({
    category,
    cards: cardsByCategory.get(category) ?? []
  })).filter((section) => section.cards.length > 0);

  return (
    <div className="space-y-6">
      {sections.length === 0 ? (
        <div className="rounded-lg border bg-card p-6">
          <p className="font-medium">아직 저장된 검사 결과가 없습니다.</p>
          <p className="text-sm text-muted-foreground">
            수동 입력 또는 텍스트 import로 첫 데이터를 추가하세요.
          </p>
        </div>
      ) : null}

      <DashboardTestGrid sections={sections} />
    </div>
  );
}
