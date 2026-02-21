import { AppShell } from "@/components/dashboard/app-shell";
import { requireUser } from "@/lib/auth";
import { initDatabase } from "@/lib/db/init";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  initDatabase();

  return <AppShell>{children}</AppShell>;
}
