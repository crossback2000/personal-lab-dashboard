import { ImportForms } from "@/components/dashboard/import-forms";
import { requireUser } from "@/lib/auth";
import { getTests } from "@/lib/data/repository";

export default async function ImportPage() {
  await requireUser();
  const tests = await getTests();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">데이터 입력 / Import</h2>
        <p className="text-sm text-muted-foreground">
          수동 입력과 텍스트/CSV import를 모두 지원합니다.
        </p>
      </div>

      <ImportForms tests={tests} />
    </div>
  );
}
