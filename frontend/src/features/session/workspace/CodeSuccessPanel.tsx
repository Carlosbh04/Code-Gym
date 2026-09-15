import { CircleCheck } from 'lucide-react';
import type { ExecutionResult } from '@/lib/engine/types';
import { ConfettiLayer } from '../components/feedback/ConfettiLayer';

export function CodeSuccessPanel({ result, successEventId = null }: { result: ExecutionResult; successEventId?: string | null }) {
  const passed = result.results.filter((test) => test.pass).length;

  return (
    <section aria-labelledby="code-success-title" className="relative overflow-hidden rounded-2xl border border-success/50 bg-card p-4 shadow-[0_0_32px_hsl(var(--success)/0.10)] sm:p-5">
      <ConfettiLayer eventId={successEventId} mode="code" />
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success animate-celebrate-check">
          <CircleCheck aria-hidden="true" className="size-6" />
        </span>
        <div className="relative">
          <h2 id="code-success-title" className="font-semibold text-foreground">Código correcto</h2>
          <p className="mt-1 text-sm text-foreground">Tu solución funciona como se esperaba.</p>
          <p className="mt-2 text-sm text-success">{passed} de {result.results.length} tests superados.</p>
        </div>
      </div>
    </section>
  );
}
