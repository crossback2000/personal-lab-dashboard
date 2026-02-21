import { CATEGORY_ORDER, categoryLabel } from "@/lib/constants";
import { getObservations, getTests } from "@/lib/data/repository";
import { TestCard } from "@/components/dashboard/test-card";
import type { ObservationRow, TestRow } from "@/types/database";

type SectionData = {
  category: TestRow["category"];
  cards: Array<{
    test: TestRow;
    latest: ObservationRow | null;
    sparklineValues: number[];
  }>;
};

export default async function DashboardPage() {
  const [tests, observations] = await Promise.all([
    getTests(),
    getObservations()
  ]);

  const observationMap = new Map<string, ObservationRow[]>();
  for (const observation of observations) {
    const list = observationMap.get(observation.test_id) ?? [];
    list.push(observation);
    observationMap.set(observation.test_id, list);
  }

  const testsByCategory = new Map<TestRow["category"], TestRow[]>();
  for (const test of tests) {
    const list = testsByCategory.get(test.category);
    if (list) {
      list.push(test);
      continue;
    }
    testsByCategory.set(test.category, [test]);
  }

  const sections: SectionData[] = CATEGORY_ORDER.map((category) => ({
    category,
    cards: (testsByCategory.get(category) ?? []).map((test) => {
      const list = observationMap.get(test.id) ?? [];
      const numericValues: number[] = [];

      for (const item of list) {
        if (item.value_numeric !== null) {
          numericValues.push(item.value_numeric);
          if (numericValues.length >= 8) {
            break;
          }
        }
      }

      numericValues.reverse();

      return {
        test,
        latest: list[0] ?? null,
        sparklineValues: numericValues
      };
    })
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

      {sections.map((section) => (
        <section key={section.category} className="space-y-3">
          <h3 className="text-lg font-semibold">{categoryLabel(section.category)}</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
    </div>
  );
}
