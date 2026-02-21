"use client";

import { useMemo, useState } from "react";
import type { ObservationRow, TestRow } from "@/types/database";
import { formatNumber } from "@/lib/utils";
import { resolveObservationFlag } from "@/lib/status";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

type Row = ObservationRow & {
  test: Pick<TestRow, "name_ko" | "name_en" | "category" | "unit_default"> | undefined;
};

export function ObservationsTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"date_desc" | "date_asc" | "value_desc" | "value_asc">(
    "date_desc"
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();

    const searched = rows.filter((row) => {
      if (!q) {
        return true;
      }
      const name = `${row.test?.name_ko || ""} ${row.test?.name_en || ""}`.toLowerCase();
      return name.includes(q) || row.observed_at.includes(q);
    });

    return searched.sort((a, b) => {
      if (sort === "date_desc") {
        return new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime();
      }
      if (sort === "date_asc") {
        return new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime();
      }
      if (sort === "value_desc") {
        return (b.value_numeric ?? Number.NEGATIVE_INFINITY) - (a.value_numeric ?? Number.NEGATIVE_INFINITY);
      }
      return (a.value_numeric ?? Number.POSITIVE_INFINITY) - (b.value_numeric ?? Number.POSITIVE_INFINITY);
    });
  }, [query, rows, sort]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          placeholder="검사항목/날짜 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
          <option value="date_desc">날짜 최신순</option>
          <option value="date_asc">날짜 오래된순</option>
          <option value="value_desc">값 큰순</option>
          <option value="value_asc">값 작은순</option>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>날짜</TableHead>
            <TableHead>검사 항목</TableHead>
            <TableHead>값</TableHead>
            <TableHead>단위</TableHead>
            <TableHead>정상범위</TableHead>
            <TableHead>Flag</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.observed_at}</TableCell>
              <TableCell>{row.test?.name_ko || row.test?.name_en || "-"}</TableCell>
              <TableCell>
                {row.value_numeric !== null ? formatNumber(row.value_numeric) : row.value_text || "-"}
              </TableCell>
              <TableCell>{row.unit || row.test?.unit_default || "-"}</TableCell>
              <TableCell>
                {row.ref_low ?? "-"} ~ {row.ref_high ?? "-"}
              </TableCell>
              <TableCell>{resolveObservationFlag(row) || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
