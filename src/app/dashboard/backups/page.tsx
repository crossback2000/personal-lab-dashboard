import { BackupControls } from "@/components/dashboard/backup-controls";
import { requireUser } from "@/lib/auth";

export default async function BackupsPage() {
  await requireUser();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">백업 / 복원</h2>
        <p className="text-sm text-muted-foreground">
          백업 생성은 현재 SQLite DB 전체 파일을 복사합니다. 복원 실행 시 업로드한 DB로 전체 교체됩니다.
        </p>
      </div>

      <BackupControls />
    </div>
  );
}
