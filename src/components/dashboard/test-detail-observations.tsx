"use client";

import { Fragment, useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteObservationAction,
  saveObservationAction
} from "@/app/dashboard/actions";
import type { ObservationRow, TestRow } from "@/types/database";
import { formatNumber } from "@/lib/utils";
import { resolveObservationFlag } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

type ActionState = {
  ok: boolean;
  message: string;
};

function confirmDelete(message: string) {
  if (typeof window === "undefined") {
    return true;
  }
  return window.confirm(message);
}

const INITIAL_ACTION_STATE: ActionState = {
  ok: false,
  message: ""
};

function SubmitButton({ label, variant = "default" }: { label: string; variant?: "default" | "outline" | "destructive" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size="sm" disabled={pending}>
      {pending ? "처리 중..." : label}
    </Button>
  );
}

function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p className={`text-sm ${state.ok ? "text-secondary-foreground" : "text-destructive"}`}>
      {state.message}
    </p>
  );
}

function formatObservedDate(value: string): string {
  const dateOnly = value.split("T")[0] ?? value;
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!matched) {
    return dateOnly;
  }
  return `${matched[1]}.${matched[2]}.${matched[3]}`;
}

function normalizeDateInput(value: string) {
  return value.split("T")[0] ?? value;
}

function formatRange(row: ObservationRow) {
  return `${row.ref_low ?? "-"} ~ ${row.ref_high ?? "-"}`;
}

function ObservationEditRow({ row, testId }: { row: ObservationRow; testId: string }) {
  const [mode, setMode] = useState<"idle" | "edit" | "delete">("idle");
  const [saveState, saveAction] = useActionState(saveObservationAction, INITIAL_ACTION_STATE);
  const [deleteState, deleteAction] = useActionState(deleteObservationAction, INITIAL_ACTION_STATE);

  return (
    <Fragment>
      <TableRow>
        <TableCell>{formatObservedDate(row.observed_at)}</TableCell>
        <TableCell>
          {row.value_numeric !== null ? formatNumber(row.value_numeric) : row.value_text || "-"}
        </TableCell>
        <TableCell>{row.unit || "-"}</TableCell>
        <TableCell>{formatRange(row)}</TableCell>
        <TableCell>{resolveObservationFlag(row) || "-"}</TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={mode === "edit" ? "default" : "outline"} onClick={() => setMode(mode === "edit" ? "idle" : "edit")}>
              수정
            </Button>
            <Button
              size="sm"
              variant={mode === "delete" ? "destructive" : "outline"}
              onClick={() => setMode(mode === "delete" ? "idle" : "delete")}
            >
              삭제
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {mode === "edit" ? (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30">
            <form
              action={saveAction}
              className="grid gap-3 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] md:items-end"
            >
              <input type="hidden" name="test_id" value={testId} />
              <input type="hidden" name="original_observed_at" value={row.observed_at} />
              <div className="space-y-1">
                <Label htmlFor={`edit-date-${row.id}`}>날짜</Label>
                <Input
                  id={`edit-date-${row.id}`}
                  name="observed_at"
                  type="date"
                  defaultValue={normalizeDateInput(row.observed_at)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`edit-value-${row.id}`}>값</Label>
                <Input
                  id={`edit-value-${row.id}`}
                  name="value"
                  defaultValue={row.value_numeric !== null ? String(row.value_numeric) : row.value_text || ""}
                  required
                />
              </div>
              <div className="flex gap-2">
                <SubmitButton label="저장" />
                <Button type="button" variant="outline" size="sm" onClick={() => setMode("idle")}>
                  취소
                </Button>
              </div>
              <div className="md:col-span-3 space-y-1 text-sm text-muted-foreground">
                <p>단위: {row.unit || "-"}</p>
                <p>정상범위: {formatRange(row)}</p>
                <ActionMessage state={saveState} />
              </div>
            </form>
          </TableCell>
        </TableRow>
      ) : null}

      {mode === "delete" ? (
        <TableRow>
          <TableCell colSpan={6} className="bg-destructive/5">
            <form
              action={deleteAction}
              className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
              onSubmit={(event) => {
                if (!confirmDelete(`${formatObservedDate(row.observed_at)} 데이터를 삭제할까요?`)) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="test_id" value={testId} />
              <input type="hidden" name="observed_at" value={row.observed_at} />
              <div className="text-sm">
                <p className="font-medium">{formatObservedDate(row.observed_at)} 데이터를 삭제합니다.</p>
                <p className="text-muted-foreground">삭제 후 복구할 수 없습니다.</p>
                <ActionMessage state={deleteState} />
              </div>
              <div className="flex gap-2">
                <SubmitButton label="삭제 확인" variant="destructive" />
                <Button type="button" variant="outline" size="sm" onClick={() => setMode("idle")}>
                  취소
                </Button>
              </div>
            </form>
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  );
}

export function TestDetailObservations({
  test,
  observations,
  latestForAdd
}: {
  test: TestRow;
  observations: ObservationRow[];
  latestForAdd: ObservationRow | null;
}) {
  const [addState, addAction] = useActionState(saveObservationAction, INITIAL_ACTION_STATE);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>상세 데이터</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>날짜</TableHead>
                <TableHead>값</TableHead>
                <TableHead>단위</TableHead>
                <TableHead>정상범위</TableHead>
                <TableHead>Flag</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {observations.map((row) => (
                <ObservationEditRow key={row.id} row={row} testId={test.id} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {observations.length === 0 ? (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          아직 저장된 상세 데이터가 없습니다. 아래에서 첫 값을 추가하세요.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>값 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addAction} className="grid gap-3 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] md:items-end">
            <input type="hidden" name="test_id" value={test.id} />
            <div className="space-y-1">
              <Label htmlFor={`add-date-${test.id}`}>날짜</Label>
              <Input id={`add-date-${test.id}`} name="observed_at" type="date" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`add-value-${test.id}`}>값</Label>
              <Input id={`add-value-${test.id}`} name="value" placeholder="숫자 또는 텍스트 값" required />
            </div>
            <SubmitButton label="추가" />
            <div className="md:col-span-3 space-y-1 text-sm text-muted-foreground">
              <p>단위: {latestForAdd?.unit || test.unit_default || "-"}</p>
              <p>
                정상범위: {latestForAdd?.ref_low ?? "-"} ~ {latestForAdd?.ref_high ?? "-"}
              </p>
              <ActionMessage state={addState} />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
