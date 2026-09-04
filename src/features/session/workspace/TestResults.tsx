import { CircleCheck, CircleX } from 'lucide-react';
import type { ExecutionResult } from '@/lib/engine/types';
import type { TestCase } from '@/types/exercise';

export interface TestResultsProps {
  result: ExecutionResult;
  testCases: TestCase[];
}

function display(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';

  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? String(value) : serialized;
  } catch {
    return String(value);
  }
}

/** Resultado de los casos reales devueltos por el Worker, sin reinterpretarlos. */
export function TestResults({ result, testCases }: TestResultsProps) {
  return (
    <section aria-labelledby="test-results-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id="test-results-title" className="text-sm font-semibold text-foreground">
          Resultados de tests
        </h3>
        <p className="text-xs text-muted-foreground">
          {result.results.filter((test) => test.pass).length} de {result.results.length} pasados
        </p>
      </div>

      <ol className="flex flex-col gap-2">
        {result.results.map((test, index) => {
          const passed = test.pass;
          const Icon = passed ? CircleCheck : CircleX;
          const testCase = testCases[index];

          return (
            <li
              key={`${index}-${String(test.input)}`}
              className={
                passed
                  ? 'rounded-md border border-success/40 bg-success/10 p-3'
                  : 'rounded-md border border-destructive/40 bg-destructive/10 p-3'
              }
            >
              <p className="flex items-start gap-2 text-sm font-medium text-foreground">
                <Icon
                  aria-hidden="true"
                  className={passed ? 'mt-0.5 size-4 text-success' : 'mt-0.5 size-4 text-destructive'}
                />
                <span>
                  {passed ? 'Test pasado' : 'Test fallido'} {index + 1}
                  {testCase === undefined ? '' : `: ${testCase.description}`}
                </span>
              </p>
              {!passed && (
                <dl className="mt-2 grid gap-1 break-words font-mono text-xs text-foreground sm:grid-cols-[max-content_1fr]">
                  <dt className="font-sans font-medium">Expected</dt>
                  <dd>{display(test.expected)}</dd>
                  <dt className="font-sans font-medium">Received</dt>
                  <dd>{display(test.actual)}</dd>
                  {test.error !== undefined && (
                    <>
                      <dt className="font-sans font-medium">Error</dt>
                      <dd>{test.error}</dd>
                    </>
                  )}
                </dl>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
