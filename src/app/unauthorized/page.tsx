import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="max-w-md space-y-3 rounded-lg border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">접근이 거부되었습니다.</h1>
        <p className="text-sm text-muted-foreground">
          Cloudflare Access 인증 헤더가 없거나 허용된 단일 사용자 이메일과 일치하지 않습니다.
        </p>
        <Link href="/dashboard" className={buttonStyles({ variant: "outline" })}>
          다시 시도
        </Link>
      </div>
    </main>
  );
}
