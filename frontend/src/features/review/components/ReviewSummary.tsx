import { CircleCheck, CircleX, Hash, Layers3 } from 'lucide-react';
import { DifficultyBadge } from '@/components/codegym/DifficultyBadge';
import type { Difficulty } from '@/types/exercise';
import type { HistoryAttempt } from '@/types/history';

export interface ReviewSummaryProps {
  technologyName: string;
  topicName?: string;
  sessionTitle: string;
  difficulty: Difficulty;
  position: number;
  totalSteps: number;
  attempt: HistoryAttempt | undefined;
  attemptCount: number;
}

export function ReviewSummary({ technologyName, topicName, sessionTitle, difficulty, position, totalSteps, attempt, attemptCount }: ReviewSummaryProps) {
  const status = attempt === undefined ? 'Sin respuesta registrada' : attempt.isCorrect ? 'Respuesta correcta' : 'Respuesta incorrecta';
  const StatusIcon = attempt?.isCorrect ? CircleCheck : CircleX;
  const statusClass = attempt?.isCorrect ? 'border-success/40 bg-success/10 text-success' : attempt === undefined ? 'border-border bg-muted/30 text-muted-foreground' : 'border-destructive/40 bg-destructive/10 text-destructive';

  return <aside aria-labelledby="review-summary-title" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><h2 id="review-summary-title" className="text-xl font-bold text-foreground">Resumen</h2><p className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${statusClass}`}><StatusIcon aria-hidden="true" className="size-4" />{status}</p><dl className="mt-5 divide-y divide-border text-sm"><div className="flex items-center justify-between gap-4 py-3"><dt className="flex items-center gap-2 text-muted-foreground"><Hash aria-hidden="true" className="size-4 text-primary" />Pregunta</dt><dd className="font-semibold text-foreground">{position} de {totalSteps}</dd></div><div className="flex items-center justify-between gap-4 py-3"><dt className="flex items-center gap-2 text-muted-foreground"><Layers3 aria-hidden="true" className="size-4 text-primary" />Tecnología</dt><dd className="text-right font-semibold text-foreground">{technologyName}</dd></div>{topicName !== undefined && <div className="flex items-center justify-between gap-4 py-3"><dt className="text-muted-foreground">Tema</dt><dd className="text-right font-semibold text-foreground">{topicName}</dd></div>}<div className="flex items-center justify-between gap-4 py-3"><dt className="text-muted-foreground">Dificultad</dt><dd><DifficultyBadge difficulty={difficulty} /></dd></div><div className="flex items-center justify-between gap-4 py-3"><dt className="text-muted-foreground">Intentos registrados</dt><dd className="font-semibold text-foreground">{attemptCount}</dd></div></dl><p className="mt-5 text-sm font-medium text-foreground">{sessionTitle}</p></aside>;
}
