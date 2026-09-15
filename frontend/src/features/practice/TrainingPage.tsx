import { useEffect, useMemo, useState } from 'react';
import { Code2, Layers3, Rocket } from 'lucide-react';
import { EmptyState } from '@/components/codegym/EmptyState';
import { useContent } from '@/hooks/useContent';
import { useProgress } from '@/hooks/useProgress';
import { TechnologySection } from './components/TechnologySection';
import { TrainingHeader } from './components/TrainingHeader';
import { TrainingLoading } from './components/TrainingLoading';
import {
  createTrainingTechnologyItems,
  groupTrainingTechnologies,
  loadTrainingCatalog,
  type TrainingCatalogItem,
} from './training-page-model';

type CatalogState =
  | { status: 'loading' }
  | { status: 'success'; catalog: TrainingCatalogItem[] }
  | { status: 'error'; message: string };

function TrainingPage() {
  const { technologies, getTopics, getConceptsByTopic, isLoading: contentLoading } = useContent();
  const { progress, isLoading: progressLoading, error: progressError } = useProgress();
  const [catalogState, setCatalogState] = useState<CatalogState>({ status: 'loading' });

  useEffect(() => {
    if (contentLoading) return;
    let active = true;
    void Promise.resolve()
      .then(() => {
        if (active) setCatalogState({ status: 'loading' });
        return loadTrainingCatalog({ technologies, getTopics, getConceptsByTopic });
      })
      .then((catalog) => {
        if (active) setCatalogState({ status: 'success', catalog });
      })
      .catch((error: unknown) => {
        if (active) setCatalogState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      active = false;
    };
  }, [contentLoading, getConceptsByTopic, getTopics, technologies]);

  const items = useMemo(
    () => catalogState.status === 'success'
      ? createTrainingTechnologyItems(catalogState.catalog, progress)
      : [],
    [catalogState, progress],
  );
  const groups = useMemo(() => groupTrainingTechnologies(items), [items]);
  const isLoading = contentLoading || progressLoading || catalogState.status === 'loading';
  const error = progressError ?? (catalogState.status === 'error' ? catalogState.message : null);

  return (
    <section aria-labelledby="training-title" className="mx-auto w-full max-w-7xl py-2 sm:py-4">
      <TrainingHeader />
      <div className="mt-5">
        {isLoading ? (
          <TrainingLoading />
        ) : error !== null ? (
          <section role="alert" aria-labelledby="training-error-title" className="rounded-2xl border border-destructive/35 bg-destructive/10 p-5">
            <h2 id="training-error-title" className="text-xl font-bold text-foreground">No pudimos cargar el catálogo</h2>
            <p className="mt-2 text-sm text-destructive">{error}</p>
          </section>
        ) : items.length === 0 ? (
          <EmptyState title="No hay tecnologías disponibles" description="Todavía no hay tecnologías preparadas para entrenar." className="max-w-none rounded-2xl border border-border bg-card" />
        ) : (
          <div className="space-y-4">
            <TechnologySection id="web-technologies-title" icon={Code2} title="Tecnologías de desarrollo web" description="Construye la base de tu futuro como desarrollador." items={groups.web} />
            <TechnologySection id="advanced-technologies-title" icon={Rocket} title="Tecnologías avanzadas" description="Lleva tus habilidades al siguiente nivel." items={groups.advanced} />
            <TechnologySection id="other-technologies-title" icon={Layers3} title="Más tecnologías" description="Explora el resto del catálogo disponible." items={groups.other} />
          </div>
        )}
      </div>
    </section>
  );
}

export default TrainingPage;
