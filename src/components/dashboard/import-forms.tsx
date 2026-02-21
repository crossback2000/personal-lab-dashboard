"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  csvImportAction,
  manualObservationAction,
  pasteImportAction
} from "@/app/dashboard/import/actions";
import type { TestRow } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const categories = [
  { value: "general_blood", label: "일반혈액" },
  { value: "chemistry", label: "일반화학" },
  { value: "coagulation", label: "응고" },
  { value: "urinalysis", label: "요검사" },
  { value: "other", label: "기타" }
];

type ActionState = {
  ok: boolean;
  message: string;
};

const INITIAL_ACTION_STATE: ActionState = {
  ok: false,
  message: ""
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
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

export function ImportForms({ tests }: { tests: TestRow[] }) {
  const [manualState, manualAction] = useActionState(manualObservationAction, INITIAL_ACTION_STATE);
  const [pasteState, pasteAction] = useActionState(pasteImportAction, INITIAL_ACTION_STATE);
  const [csvState, csvAction] = useActionState(csvImportAction, INITIAL_ACTION_STATE);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>수동 입력</CardTitle>
          <CardDescription>날짜, 검사 항목, 값을 직접 저장합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" action={manualAction}>
            <div className="space-y-1">
              <Label htmlFor="observed_at">검사일</Label>
              <Input id="observed_at" name="observed_at" type="date" required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="test_id">기존 검사 항목 선택</Label>
              <Select id="test_id" name="test_id" defaultValue="">
                <option value="">신규 항목 입력</option>
                {tests.map((test) => (
                  <option key={test.id} value={test.id}>
                    {test.name_ko || test.name_en}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="new_name_ko">신규 항목명(한글)</Label>
                <Input id="new_name_ko" name="new_name_ko" placeholder="예: 혈색소" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new_name_en">신규 항목명(영문)</Label>
                <Input id="new_name_en" name="new_name_en" placeholder="Hemoglobin" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="value_numeric">숫자값</Label>
                <Input id="value_numeric" name="value_numeric" inputMode="decimal" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="value_text">텍스트값</Label>
                <Input id="value_text" name="value_text" placeholder="Negative 등" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="unit">단위</Label>
              <Input id="unit" name="unit" placeholder="g/dL" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="ref_low">정상범위 하한</Label>
                <Input id="ref_low" name="ref_low" inputMode="decimal" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ref_high">정상범위 상한</Label>
                <Input id="ref_high" name="ref_high" inputMode="decimal" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="manual_category">카테고리</Label>
              <Select id="manual_category" name="category" defaultValue="other">
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </Select>
            </div>

            <SubmitButton label="수동 저장" />
            <ActionMessage state={manualState} />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>텍스트 붙여넣기 Import</CardTitle>
          <CardDescription>
            탭/줄바꿈 기반 표를 붙여넣고 여러 날짜 값을 한 번에 저장합니다. 패널명(예: 일반혈액/요검사)에서 섹션을 자동 분류합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" action={pasteAction}>
            <div className="space-y-1">
              <Label htmlFor="raw_text">원문 텍스트</Label>
              <Textarea
                id="raw_text"
                name="raw_text"
                className="min-h-48"
                placeholder="샘플 파일(samples/paste-import-sample.txt) 형식으로 붙여넣으세요."
                required
              />
            </div>

            <SubmitButton label="텍스트 Import" />
            <ActionMessage state={pasteState} />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CSV Import</CardTitle>
          <CardDescription>
            `test_name, observed_at, value` 컬럼을 포함한 CSV를 붙여넣어 저장합니다. `category` 컬럼이 있으면 섹션을 자동 반영합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" action={csvAction}>
            <div className="space-y-1">
              <Label htmlFor="csv_text">CSV</Label>
              <Textarea
                id="csv_text"
                name="csv_text"
                className="min-h-48"
                placeholder="test_name,observed_at,value,unit,ref_low,ref_high"
                required
              />
            </div>

            <SubmitButton label="CSV Import" />
            <ActionMessage state={csvState} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
