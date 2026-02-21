import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

const navLinks = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/dashboard/import", label: "데이터 입력" },
  { href: "/dashboard/table", label: "테이블" },
  { href: "/dashboard/backups", label: "백업/복원" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="space-y-0.5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Personal Lab Dashboard
            </p>
            <h1 className="text-xl font-semibold">개인 검사결과 추이</h1>
          </Link>
          <div className="flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={buttonStyles({ variant: "ghost", size: "sm" })}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
