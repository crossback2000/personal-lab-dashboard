import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="max-w-md space-y-3 rounded-lg border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">내부 로그인 화면은 사용하지 않습니다.</h1>
        <p className="text-sm text-muted-foreground">
          이 앱은 Cloudflare Zero Trust Access를 관문 인증으로 사용합니다.
        </p>
        <Link href="/dashboard" className={buttonStyles({ variant: "default" })}>
          대시보드로 이동
        </Link>
      </div>
    </main>
  );
}
