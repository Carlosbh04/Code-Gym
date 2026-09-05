import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface ReviewNavigationProps {
  sessionId: string;
  position: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function ReviewNavigation({ sessionId, position, totalSteps, onPrevious, onNext }: ReviewNavigationProps) {
  return <footer className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={onPrevious} disabled={position === 1} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"><ArrowLeft aria-hidden="true" className="size-4" />Anterior</button><Link to={`/results/${sessionId}`} className="inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Volver a resultados</Link><button type="button" onClick={onNext} disabled={position === totalSteps} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">Siguiente<ArrowRight aria-hidden="true" className="size-4" /></button></footer>;
}
