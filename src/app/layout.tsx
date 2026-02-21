import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Lab Dashboard",
  description: "혈액/소변 검사 결과 추이 대시보드"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
