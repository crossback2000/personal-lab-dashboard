"use client";

import { useActionState } from "react";
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
  const [saveState, saveAction] = useActionState(saveObservationAction, INITIAL_ACTION_STATE);
  const [deleteState, deleteAction] = useActionState(deleteObservationAction, INITIAL_ACTION_STATE);

  return (
    <TableRow>
      <TableCell>{formatObservedDate(row.observed_at)}</TableCell>
      <TableCell>
        <form action={saveAction} className="grid gap-2 md:grid-cols-[minmax(0,160px)_minmax(0,1fr)_auto] md:items-center">
          <input type="hidden" name="test_id" value={testId} />
          <input type="hidden" name="original_observed_at" value={row.observed_at} />
          <Input name="observed_at" type="date" defaultValue={normalizeDateInput(row.observed_at)} required />
          <Input
            name="value"
            defaultValue={row.value_numeric !== null ? String(row.value_numeric) : row.value_text || ""}
            required
          />
          <SubmitButton label="수정" />
          <div className="md:col-span-3">
            <ActionMessage state={saveState} />
          </div>
        </form>
      </TableCell>
      <TableCell>{row.unit || "-"}</TableCell>
      <TableCell>{formatRange(row)}</TableCell>
      <TableCell>{resolveObservationFlag(row) || "-"}</TableCell>
      <TableCell>
        <form
          action={deleteAction}
          className="space-y-2"
          onSubmit={(event) => {
            if (!confirmDelete(`${formatObservedDate(row.observed_at)} 데이터를 삭제할까요?`)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="test_id" value={testId} />
          <input type="hidden" name="observed_at" value={row.observed_at} />
          <SubmitButton label="삭제" variant="destructive" />
          <ActionMessage state={deleteState} />
        </form>
      </TableCell>
    </TableRow>
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

      <Card>
        <CardHeader>
          <CardTitle>상세 데이터</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>기존 날짜</TableHead>
                <TableHead>수정</TableHead>
                <TableHead>단위</TableHead>
                <TableHead>정상범위</TableHead>
                <TableHead>Flag</TableHead>
                <TableHead>삭제</TableHead>
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
          아직 저장된 상세 데이터가 없습니다. 위 폼에서 첫 값을 추가하세요.
        </p>
      ) : null}
    </div>
  );
}
