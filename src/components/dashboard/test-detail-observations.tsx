"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveObservationAction, saveTestDetailAction } from "@/app/dashboard/actions";
import type { ObservationRow, TestRow } from "@/types/database";
import { formatNumber } from "@/lib/utils";
import { resolveObservationFlag } from "@/lib/status";
import { TestDetailDeleteButton } from "@/components/dashboard/test-detail-delete-button";
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

const INITIAL_ACTION_STATE: ActionState = {
  ok: false,
  message: ""
};

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

function SubmitButton({
  label,
  variant = "default",
  form,
  type = "submit"
}: {
  label: string;
  variant?: "default" | "outline" | "destructive";
  form?: string;
  type?: "submit" | "button";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type={type} variant={variant} size="sm" disabled={pending} form={form}>
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

function AddObservationSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "처리 중..." : "추가"}
    </Button>
  );
}

type EditableObservation = {
  id: string;
  observedAt: string;
  value: string;
};

export function TestDetailObservations({
  test,
  observations,
  editObservations,
  latestForAdd
}: {
  test: TestRow;
  observations: ObservationRow[];
  editObservations: ObservationRow[];
  latestForAdd: ObservationRow | null;
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [testState, testAction] = useActionState(saveTestDetailAction, INITIAL_ACTION_STATE);
  const [addState, addAction] = useActionState(saveObservationAction, INITIAL_ACTION_STATE);
  const [draftRows, setDraftRows] = useState<EditableObservation[]>(() =>
    editObservations.map((row) => ({
      id: row.id,
      observedAt: normalizeDateInput(row.observed_at),
      value: row.value_numeric !== null ? String(row.value_numeric) : row.value_text || ""
    }))
  );
  const [metadataDraft, setMetadataDraft] = useState(() => ({
    nameKo: test.name_ko || "",
    nameEn: test.name_en,
    unitDefault: latestForAdd?.unit || test.unit_default || "",
    refLow: latestForAdd?.ref_low !== null && latestForAdd?.ref_low !== undefined ? String(latestForAdd.ref_low) : "",
    refHigh:
      latestForAdd?.ref_high !== null && latestForAdd?.ref_high !== undefined
        ? String(latestForAdd.ref_high)
        : ""
  }));

  useEffect(() => {
    setDraftRows(
      editObservations.map((row) => ({
        id: row.id,
        observedAt: normalizeDateInput(row.observed_at),
        value: row.value_numeric !== null ? String(row.value_numeric) : row.value_text || ""
      }))
    );
  }, [editObservations]);

  useEffect(() => {
    setMetadataDraft({
      nameKo: test.name_ko || "",
      nameEn: test.name_en,
      unitDefault: latestForAdd?.unit || test.unit_default || "",
      refLow:
        latestForAdd?.ref_low !== null && latestForAdd?.ref_low !== undefined
          ? String(latestForAdd.ref_low)
          : "",
      refHigh:
        latestForAdd?.ref_high !== null && latestForAdd?.ref_high !== undefined
          ? String(latestForAdd.ref_high)
          : ""
    });
  }, [latestForAdd, test]);

  useEffect(() => {
    if (testState.ok) {
      setIsEditMode(false);
    }
  }, [testState.ok]);

  const summaryRange = useMemo(() => {
    const low = latestForAdd?.ref_low ?? null;
    const high = latestForAdd?.ref_high ?? null;
    return `${low ?? "-"} ~ ${high ?? "-"}`;
  }, [latestForAdd]);

  function resetDrafts() {
    setDraftRows(
      editObservations.map((row) => ({
        id: row.id,
        observedAt: normalizeDateInput(row.observed_at),
        value: row.value_numeric !== null ? String(row.value_numeric) : row.value_text || ""
      }))
    );
    setMetadataDraft({
      nameKo: test.name_ko || "",
      nameEn: test.name_en,
      unitDefault: latestForAdd?.unit || test.unit_default || "",
      refLow:
        latestForAdd?.ref_low !== null && latestForAdd?.ref_low !== undefined
          ? String(latestForAdd.ref_low)
          : "",
      refHigh:
        latestForAdd?.ref_high !== null && latestForAdd?.ref_high !== undefined
          ? String(latestForAdd.ref_high)
          : ""
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>상세 데이터</CardTitle>
            <div className="flex gap-2">
              {isEditMode ? (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    resetDrafts();
                    setIsEditMode(false);
                  }}>
                    취소
                  </Button>
                  <Button type="submit" size="sm" form="test-detail-edit-form">
                    저장
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                    수정
                  </Button>
                  <TestDetailDeleteButton testId={test.id} testLabel={test.name_ko || test.name_en} />
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditMode ? (
            <form id="test-detail-edit-form" action={testAction} className="space-y-4">
              <input type="hidden" name="test_id" value={test.id} />

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor={`name-ko-${test.id}`}>항목명(한글)</Label>
                  <Input
                    id={`name-ko-${test.id}`}
                    name="name_ko"
                    value={metadataDraft.nameKo}
                    onChange={(event) =>
                      setMetadataDraft((current) => ({ ...current, nameKo: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`name-en-${test.id}`}>항목명(영문)</Label>
                  <Input
                    id={`name-en-${test.id}`}
                    name="name_en"
                    value={metadataDraft.nameEn}
                    onChange={(event) =>
                      setMetadataDraft((current) => ({ ...current, nameEn: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`unit-${test.id}`}>단위</Label>
                  <Input
                    id={`unit-${test.id}`}
                    name="unit_default"
                    value={metadataDraft.unitDefault}
                    onChange={(event) =>
                      setMetadataDraft((current) => ({ ...current, unitDefault: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor={`ref-low-${test.id}`}>정상범위 하한</Label>
                    <Input
                      id={`ref-low-${test.id}`}
                      name="ref_low"
                      inputMode="decimal"
                      value={metadataDraft.refLow}
                      onChange={(event) =>
                        setMetadataDraft((current) => ({ ...current, refLow: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`ref-high-${test.id}`}>정상범위 상한</Label>
                    <Input
                      id={`ref-high-${test.id}`}
                      name="ref_high"
                      inputMode="decimal"
                      value={metadataDraft.refHigh}
                      onChange={(event) =>
                        setMetadataDraft((current) => ({ ...current, refHigh: event.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>값</TableHead>
                    <TableHead>Flag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draftRows.map((row) => {
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <input type="hidden" name="observation_ids" value={row.id} />
                          <Input
                            name={`observed_at_${row.id}`}
                            type="date"
                            value={row.observedAt}
                            onChange={(event) => {
                              const next = event.target.value;
                              setDraftRows((current) =>
                                current.map((item) =>
                                  item.id === row.id ? { ...item, observedAt: next } : item
                                )
                              );
                            }}
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            name={`value_${row.id}`}
                            value={row.value}
                            onChange={(event) => {
                              const next = event.target.value;
                              setDraftRows((current) =>
                                current.map((item) => (item.id === row.id ? { ...item, value: next } : item))
                              );
                            }}
                            required
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">저장 후 갱신</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <ActionMessage state={testState} />
            </form>
          ) : (
            <>
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs">항목명(한글)</p>
                  <p className="font-medium text-foreground">{test.name_ko || "-"}</p>
                </div>
                <div>
                  <p className="text-xs">항목명(영문)</p>
                  <p className="font-medium text-foreground">{test.name_en}</p>
                </div>
                <div>
                  <p className="text-xs">단위</p>
                  <p className="font-medium text-foreground">{latestForAdd?.unit || test.unit_default || "-"}</p>
                </div>
                <div>
                  <p className="text-xs">정상범위</p>
                  <p className="font-medium text-foreground">{summaryRange}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>값</TableHead>
                    <TableHead>Flag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {observations.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatObservedDate(row.observed_at)}</TableCell>
                      <TableCell>
                        {row.value_numeric !== null ? formatNumber(row.value_numeric) : row.value_text || "-"}
                      </TableCell>
                      <TableCell>{resolveObservationFlag(row) || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {observations.length === 0 ? (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          아직 저장된 상세 데이터가 없습니다. 아래에서 첫 값을 추가하세요.
        </p>
      ) : null}

      {!isEditMode ? (
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
              <AddObservationSubmit />
              <div className="md:col-span-3 space-y-1 text-sm text-muted-foreground">
                <p>단위: {latestForAdd?.unit || test.unit_default || "-"}</p>
                <p>정상범위: {summaryRange}</p>
                <ActionMessage state={addState} />
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
