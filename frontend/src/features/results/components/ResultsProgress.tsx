import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import type { ConceptProgress } from '@/types/progress';

export function ResultsProgress({ progress }: { progress: ConceptProgress | undefined }) {
  if (progress === undefined || progress.totalAttempts === 0) return null;
  const accuracy = Math.round((progress.correctAttempts / progress.totalAttempts) * 100);

  return <section aria-labelledby="results-progress-title" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><h2 id="results-progress-title" className="text-xl font-bold text-foreground">Progreso</h2><span className="text-sm font-semibold text-success">{accuracy}%</span></div><Progress value={accuracy} className="mt-4" /><p className="mt-3 text-sm text-muted-foreground">{progress.correctAttempts} respuestas correctas de {progress.totalAttempts} intentos en este concepto.</p><Link to="/dashboard" className="mt-4 inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ver mi progreso</Link></section>;
}
