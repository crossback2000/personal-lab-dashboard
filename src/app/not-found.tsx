import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold">페이지를 찾을 수 없습니다.</h1>
        <p className="text-sm text-muted-foreground">요청한 검사 항목이 없거나 접근 권한이 없습니다.</p>
        <Link href="/dashboard" className={buttonStyles({ variant: "default" })}>
          대시보드로 이동
        </Link>
      </div>
    </main>
  );
}
