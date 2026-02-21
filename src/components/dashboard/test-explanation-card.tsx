import type { TestExplanation } from "@/lib/test-explanations";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

function ExplanationList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function ExplanationSection({
  title,
  items
}: {
  title: string;
  items: string[];
}) {
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      <ExplanationList items={items} />
    </section>
  );
}

export function TestExplanationCard({ explanation }: { explanation: TestExplanation }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>검사값 설명</CardTitle>
        <CardDescription>{explanation.test}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <section className="space-y-2">
          <h4 className="text-sm font-semibold">한줄요약</h4>
          <p className="text-sm leading-relaxed">{explanation.oneLineSummary}</p>
        </section>

        <ExplanationSection title="이게뭐예요" items={explanation.whatIsIt} />

        <div className="grid gap-5 md:grid-cols-2">
          <ExplanationSection title="높게나오면" items={explanation.high} />
          <ExplanationSection title="낮게나오면" items={explanation.low} />
        </div>

        <ExplanationSection title="해석팁" items={explanation.tips} />
        <ExplanationSection title="같이보면좋은항목" items={explanation.related} />
      </CardContent>
    </Card>
  );
}
