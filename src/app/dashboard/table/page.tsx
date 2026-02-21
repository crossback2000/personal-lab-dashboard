import { ObservationsTable } from "@/components/dashboard/observations-table";
import { requireUser } from "@/lib/auth";
import { getObservations, getTests } from "@/lib/data/repository";

export default async function TablePage() {
  await requireUser();

  const [tests, observations] = await Promise.all([
    getTests(),
    getObservations()
  ]);

  const testMap = new Map(tests.map((test) => [test.id, test]));
  const rows = observations.map((observation) => ({
    ...observation,
    test: testMap.get(observation.test_id)
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">테이블 보기</h2>
        <p className="text-sm text-muted-foreground">정렬/필터로 전체 관측치를 조회합니다.</p>
      </div>
      <ObservationsTable rows={rows} />
    </div>
  );
}
