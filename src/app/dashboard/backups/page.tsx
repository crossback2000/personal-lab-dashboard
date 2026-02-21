import { BackupControls } from "@/components/dashboard/backup-controls";
import { requireUser } from "@/lib/auth";

export default async function BackupsPage() {
  await requireUser();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">백업 / 복원</h2>
        <p className="text-sm text-muted-foreground">
          백업 생성은 SQLite 스냅샷 백업으로 생성되며, 복원 실행 시 업로드한 DB로 전체 교체됩니다.
        </p>
      </div>

      <BackupControls />
    </div>
  );
}
