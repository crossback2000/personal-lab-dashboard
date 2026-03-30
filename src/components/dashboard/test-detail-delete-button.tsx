"use client";

import { useFormStatus } from "react-dom";
import { deleteTestDetailAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="destructive" size="sm" disabled={pending}>
      {pending ? "삭제 중..." : "삭제"}
    </Button>
  );
}

export function TestDetailDeleteButton({ testId, testLabel }: { testId: string; testLabel: string }) {
  return (
    <form
      action={deleteTestDetailAction}
      onSubmit={(event) => {
        if (
          typeof window !== "undefined" &&
          !window.confirm(`${testLabel} 항목과 연결된 전체 데이터를 삭제할까요?`)
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="test_id" value={testId} />
      <DeleteButton />
    </form>
  );
}
