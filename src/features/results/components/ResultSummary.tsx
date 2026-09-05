import { Clock3, Layers3, Target } from 'lucide-react';
import { DifficultyBadge } from '@/components/codegym/DifficultyBadge';
import type { Difficulty } from '@/types/exercise';
import type { CompletedSession } from '@/types/progress';
import { ResultScoreRing } from './ResultScoreRing';

function formatDuration(timeSpentMs: number): string {
  const totalSeconds = Math.max(0, Math.round(timeSpentMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} s`;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}

export interface ResultSummaryProps {
  completedSession: CompletedSession;
  difficulty?: Difficulty;
  topicName?: string;
}

export function ResultSummary({ completedSession, difficulty, topicName }: ResultSummaryProps) {
  return (
    <section aria-labelledby="result-summary-title" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 id="result-summary-title" className="text-xl font-bold text-foreground">Tu resultado</h2>
      <div className="mt-5 flex justify-center"><ResultScoreRing {...completedSession} /></div>
      <dl className="mt-6 divide-y divide-border">
        <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="flex items-center gap-2 text-muted-foreground"><Clock3 aria-hidden="true" className="size-4 text-primary" />Tiempo total</dt><dd className="font-semibold text-foreground">{formatDuration(completedSession.timeSpentMs)}</dd></div>
        <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="flex items-center gap-2 text-muted-foreground"><Target aria-hidden="true" className="size-4 text-primary" />Precisión</dt><dd className="font-semibold text-foreground">{completedSession.accuracy}%</dd></div>
        {difficulty !== undefined && <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-muted-foreground">Dificultad</dt><dd><DifficultyBadge difficulty={difficulty} /></dd></div>}
        {topicName !== undefined && <div className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="flex items-center gap-2 text-muted-foreground"><Layers3 aria-hidden="true" className="size-4 text-primary" />Tema</dt><dd className="text-right font-semibold text-foreground">{topicName}</dd></div>}
      </dl>
    </section>
  );
}
