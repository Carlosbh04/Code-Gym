import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowRight,
  BarChart3,
  Code2,
  Flag,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/codegym/EmptyState';
import { PageLoadTransition } from '@/components/codegym/PageLoadTransition';
import { SessionRecoveryContext } from '@/contexts/session-recovery-context';
import { useContent } from '@/hooks/useContent';
import { useDashboard } from '@/hooks/useDashboard';
import { useHistory } from '@/hooks/useHistory';
import { useProgress } from '@/hooks/useProgress';
import type { SessionRecoverySnapshot } from '@/lib/recovery/ISessionRecoveryStore';

import { CodeGymLandscape } from './components/CodeGymLandscape';
import { ContinueCard } from './components/ContinueCard';
import { HomeProgressSummary } from './components/HomeProgressSummary';
import { HomeRecentActivity } from './components/HomeRecentActivity';
import { MotivationCard } from './components/MotivationCard';
import { TechnologyGrid } from './components/TechnologyGrid';
import { TechnologyLoading } from './components/TechnologyLoading';
import { HomeInitialLoading } from './components/HomeInitialLoading';

import {
  createHomeDiscoverySeed,
  selectHomeTechnologies,
} from './home-technology-selection';

import {
  createHomeActivities,
  createTechnologyProgress,
  loadHomeCatalog,
  selectHomeContinueItem,
} from './home-view-model';

import type {
  HomeCatalog,
  HomePrimaryCardState,
} from './home-types';

type CatalogState =
  | { status: 'loading' }
  | { status: 'success'; catalog: HomeCatalog }
  | { status: 'error'; message: string };

function HomePage() {
  const {
    technologies,
    getTopics,
    getConceptsByTopic,
    getSessionsByConcept,
    isLoading: contentLoading,
  } = useContent();

  const {
    dashboard,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useDashboard();

  const {
    recentCompletedSessions,
    completedSessionsLoading,
    completedSessionsError,
    getCompletedSession,
  } = useHistory();

  const {
    progress,
    isLoading: progressLoading,
  } = useProgress();

  const recoveryStore =
    useContext(SessionRecoveryContext);

  const [recovery] =
    useState<SessionRecoverySnapshot | null>(
      () => {
        if (recoveryStore === null) {
          return null;
        }

        try {
          return recoveryStore.load();
        } catch {
          return null;
        }
      },
    );

  const [
    catalogState,
    setCatalogState,
  ] = useState<CatalogState>({
    status: 'loading',
  });

  const [technologyDiscoverySeed] =
    useState(() =>
      createHomeDiscoverySeed(
        new Date(),
      ),
    );

  useEffect(() => {
    if (contentLoading) {
      return;
    }

    let active = true;

    void Promise.resolve()
      .then(() => {
        if (active) {
          setCatalogState({
            status: 'loading',
          });
        }

        return loadHomeCatalog({
          technologies,
          getTopics,
          getConceptsByTopic,
          getSessionsByConcept,
          getCompletedSession,
        });
      })
      .then((catalog) => {
        if (active) {
          setCatalogState({
            status: 'success',
            catalog,
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setCatalogState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : String(error),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [
    contentLoading,
    getCompletedSession,
    getConceptsByTopic,
    getSessionsByConcept,
    getTopics,
    technologies,
  ]);

  const catalog =
    catalogState.status === 'success'
      ? catalogState.catalog
      : null;

  const technologyProgress =
    useMemo(
      () =>
        catalog === null
          ? []
          : createTechnologyProgress(
              catalog,
              progress,
            ),
      [
        catalog,
        progress,
      ],
    );

  const homeTechnologies =
    useMemo(
      () =>
        catalog === null
          ? []
          : selectHomeTechnologies({
              items:
                technologyProgress,
              catalog,
              progress,
              recovery,
              discoverySeed:
                technologyDiscoverySeed,
            }),
      [
        catalog,
        progress,
        recovery,
        technologyDiscoverySeed,
        technologyProgress,
      ],
    );

  const onboardingTechnologies =
    useMemo(
      () =>
        technologyProgress.slice(
          0,
          6,
        ),
      [technologyProgress],
    );

  const continueItem =
    useMemo(
      () =>
        catalog === null
          ? null
          : selectHomeContinueItem(
              catalog,
              progress,
              recovery,
            ),
      [
        catalog,
        progress,
        recovery,
      ],
    );

  const activities =
    useMemo(
      () =>
        catalog === null
          ? []
          : createHomeActivities(
              catalog,
              recentCompletedSessions,
            ),
      [
        catalog,
        recentCompletedSessions,
      ],
    );

  const totalConcepts =
    technologyProgress.reduce(
      (total, item) =>
        total + item.totalConcepts,
      0,
    );

  const practicedConcepts = Math.max(
    dashboard?.progress.filter(
      (item) =>
        item.totalAttempts > 0,
    ).length ?? 0,
    [...progress.values()].filter(
      (item) => item.totalAttempts > 0,
    ).length,
  );

  const hasPersistedActivity =
    dashboard !== null
    && (
      dashboard.progress.some(
        (item) =>
          item.totalAttempts > 0
          || item.completedSessions > 0,
      )
      || dashboard
          .badges
          .summary
          .completedSessions > 0
      || dashboard
          .recentCompletedSessions
          .length > 0
    );

  const hasContextActivity =
    recentCompletedSessions.length > 0
    || [...progress.values()].some(
      (item) => item.totalAttempts > 0,
    );

  const hasValidRecovery =
    continueItem?.source
      === 'recovery';

  const showAdvancedHome =
    hasPersistedActivity
    || hasContextActivity
    || hasValidRecovery;

  const primaryCardState:
    HomePrimaryCardState =
      hasValidRecovery
        ? 'recovery'
        : 'returning';

  const catalogLoading =
    contentLoading
    || catalogState.status
      === 'loading';

  const globalAccuracy =
    dashboard
      ?.review
      .overview
      .accuracy === null
      || dashboard
        ?.review
        .overview
        .accuracy === undefined
      ? undefined
      : Math.round(
          dashboard
            .review
            .overview
            .accuracy
          * 100,
        );

  const initialHomeLoading =
    dashboardLoading
    || progressLoading
    || completedSessionsLoading
    || (
      dashboard === null
      && dashboardError === null
    )
    || (
      recovery !== null
      && catalogLoading
      && !hasPersistedActivity
    );

  if (
    !initialHomeLoading
    && (
      dashboardError !== null
      || dashboard === null
    )
  ) {
    return (
      <section
        className="mx-auto w-full max-w-3xl py-8"
        aria-labelledby="home-error-title"
      >
        <div
          className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6"
          role="alert"
        >
          <h1
            id="home-error-title"
            className="text-xl font-bold text-foreground"
          >
            No pudimos cargar tu inicio
          </h1>

          <p className="mt-2 text-sm leading-snug text-muted-foreground">
            No podemos determinar tu progreso en este momento.
            Inténtalo de nuevo más tarde.
          </p>
        </div>
      </section>
    );
  }

  /*
   * Si existe recovery local, necesitamos resolver el catálogo
   * antes de decidir si realmente pertenece a una sesión publicada.
   *
   * Así evitamos mostrar onboarding durante unos milisegundos
   * y cambiar después a la Home avanzada.
   */
  if (
    !initialHomeLoading
    && recovery !== null
    && catalogState.status === 'error'
    && !hasPersistedActivity
  ) {
    return (
      <section
        className="mx-auto w-full max-w-3xl py-8"
        aria-labelledby="home-catalog-error-title"
      >
        <div
          className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6"
          role="alert"
        >
          <h1
            id="home-catalog-error-title"
            className="text-xl font-bold text-foreground"
          >
            No pudimos comprobar tu práctica
          </h1>

          <p className="mt-2 text-sm leading-snug text-muted-foreground">
            No podemos verificar la sesión que tenías en curso.
          </p>
        </div>
      </section>
    );
  }

  const technologySection = () => (
    <section
      id="technologies"
      aria-labelledby="technologies-title"
      className="min-w-0 scroll-mt-24"
    >
      <div className="mb-3">
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-center">
          <div className="min-w-0 py-2">
            <div className="w-fit max-w-full">
              <h2
                id="technologies-title"
                className="text-[2rem] font-bold leading-[1.02] tracking-tight text-foreground sm:text-[2.35rem] xl:text-[2.7rem]"
              >
                ¿Qué quieres{' '}
                <span className="text-primary">
                  entrenar
                </span>{' '}
                hoy?
              </h2>

              <p className="mt-2 w-full text-center text-sm text-muted-foreground sm:text-base">
                Elige una tecnología y comienza a practicar.
              </p>
            </div>
          </div>

          <div className="relative hidden h-[116px] overflow-hidden xl:block">
            <CodeGymLandscape
              compact
              className="absolute inset-0 size-full"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-background/55 via-background/10 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent" />

            <div className="absolute left-5 top-1/2 z-10 max-w-[220px] -translate-y-1/2 border-l-2 border-primary pl-4">
              <p className="text-sm font-medium leading-relaxed text-foreground/90">
                “Pequeños pasos,
                <span className="block">
                  grandes resultados.”
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-2">
          <h3 className="text-sm font-semibold text-foreground sm:text-base">
            Tecnologías
          </h3>
        </div>
      </div>

      {catalogLoading ? (
        <TechnologyLoading />
      ) : catalogState.status
          === 'error' ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          No pudimos cargar las tecnologías:{' '}
          {catalogState.message}
        </p>
      ) : technologyProgress
          .length === 0 ? (
        <EmptyState
          title="No hay tecnologías disponibles"
          description="Todavía no hay tecnologías preparadas para practicar."
          className="rounded-2xl border border-border bg-card"
        />
      ) : (
        <TechnologyGrid
          items={homeTechnologies}
          variant="quick-start"
        />
      )}
    </section>
  );

  const homeContent =
    initialHomeLoading
      ? null
      : showAdvancedHome
        ? (
      <div className="mx-auto w-full max-w-[1450px] pb-4 pt-0 sm:pb-6">
        <div
          data-entry-item
          data-entry-index="0"
        >
          {technologySection()}
        </div>

        <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.34fr)_minmax(390px,0.92fr)]">
          <div
            data-entry-item
            data-entry-index="1"
            className="min-w-0"
          >
            <ContinueCard
              item={continueItem}
              fallbackTechnology={
                technologies[0] ?? null
              }
              isLoading={
                catalogLoading
                || progressLoading
              }
              error={
                catalogState.status === 'error'
                  ? catalogState.message
                  : null
              }
              state={primaryCardState}
              variant="advanced"
            />
          </div>

          <div
            data-entry-item
            data-entry-index="2"
            className="min-w-0"
          >
            <HomeProgressSummary
              practicedConcepts={practicedConcepts}
              totalConcepts={totalConcepts}
              hasActivity={hasPersistedActivity}
              isLoading={
                catalogLoading
                || progressLoading
              }
              variant="advanced"
              globalAccuracy={globalAccuracy}
              recentSessions={
                recentCompletedSessions.length
              }
            />
          </div>

          <div
            data-entry-item
            data-entry-index="3"
            className="min-w-0"
          >
            <HomeRecentActivity
              activities={activities}
              isLoading={
                completedSessionsLoading
                || catalogLoading
              }
              error={completedSessionsError}
              variant="advanced"
            />
          </div>

          <div
            data-entry-item
            data-entry-index="4"
            className="min-w-0"
          >
            <MotivationCard variant="advanced" />
          </div>
        </div>
      </div>
        )
        : (
    <div className="mx-auto w-full max-w-7xl pb-8 pt-2 sm:pt-4">
      <section
        data-entry-item
        data-entry-index="0"
        aria-labelledby="home-title"
        className="relative overflow-hidden rounded-2xl border border-primary/30 bg-[#07101f] px-6 py-7 shadow-[0_18px_55px_rgba(0,0,0,0.32)] sm:px-8 lg:px-12 lg:py-8"
      >
        <CodeGymLandscape className="pointer-events-none absolute inset-0 size-full opacity-[0.30]" />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(5,13,28,0.98)_0%,rgba(7,18,38,0.94)_45%,rgba(20,24,65,0.64)_100%)]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-52 size-[34rem] rounded-full bg-indigo-600/20 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 top-10 size-32 rounded-full bg-indigo-500/15 blur-xl"
        />

        <div className="relative grid min-w-0 gap-10 xl:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.92fr)] xl:items-center">
          <div className="min-w-0">
            <h1
              id="home-title"
              className="max-w-3xl text-4xl font-extrabold leading-[1.02] tracking-[-0.045em] text-foreground sm:text-5xl lg:text-[3.35rem]"
            >
              Todo empieza con
              <span className="block bg-gradient-to-r from-violet-500 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
                la primera práctica.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-[1.05rem]">
              Practica, aprende y construye las habilidades que te llevarán
              más lejos.
            </p>

            <Link
              to="/tech"
              className="mt-5 inline-flex min-h-11 items-center gap-4 rounded-2xl bg-primary px-8 py-3 text-base font-extrabold text-primary-foreground shadow-[0_10px_30px_rgba(99,102,241,0.30)] transition-all hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Empezar
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </div>

          <div
            className="relative mx-auto w-full max-w-[440px]"
            aria-label="Cómo funciona CodeGym"
          >
            <div
              aria-hidden="true"
              className="absolute bottom-8 left-[1.15rem] top-8 w-px bg-gradient-to-b from-primary/75 via-primary/50 to-primary/70"
            />

            <div className="relative grid gap-5">
              <article className="relative grid grid-cols-[2.4rem_4rem_minmax(0,1fr)] items-center gap-4">
                <span
                  aria-hidden="true"
                  className="relative z-10 size-3 justify-self-center rounded-full bg-primary shadow-[0_0_18px_rgba(99,102,241,0.9)]"
                />

                <span className="flex size-14 items-center justify-center rounded-full border border-primary/35 bg-indigo-950/45 text-primary shadow-[0_8px_24px_rgba(20,25,70,0.35)]">
                  <Code2 className="size-6" aria-hidden="true" />
                </span>

                <div>
                  <p className="text-sm font-extrabold tracking-[0.025em] text-primary">
                    PRÁCTICA
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Resuelve ejercicios interactivos.
                  </p>
                </div>
              </article>

              <article className="relative grid grid-cols-[2.4rem_4rem_minmax(0,1fr)] items-center gap-4">
                <span
                  aria-hidden="true"
                  className="relative z-10 size-3 justify-self-center rounded-full bg-primary shadow-[0_0_18px_rgba(99,102,241,0.9)]"
                />

                <span className="flex size-14 items-center justify-center rounded-full border border-primary/35 bg-indigo-950/45 text-primary shadow-[0_8px_24px_rgba(20,25,70,0.35)]">
                  <BarChart3 className="size-6" aria-hidden="true" />
                </span>

                <div>
                  <p className="text-sm font-extrabold tracking-[0.025em] text-primary">
                    RESULTADO
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Aprende con feedback inmediato.
                  </p>
                </div>
              </article>

              <article className="relative grid grid-cols-[2.4rem_4rem_minmax(0,1fr)] items-center gap-4">
                <span
                  aria-hidden="true"
                  className="relative z-10 size-3 justify-self-center rounded-full bg-primary shadow-[0_0_18px_rgba(99,102,241,0.9)]"
                />

                <span className="flex size-14 items-center justify-center rounded-full border border-primary/35 bg-indigo-950/45 text-primary shadow-[0_8px_24px_rgba(20,25,70,0.35)]">
                  <Flag className="size-6" aria-hidden="true" />
                </span>

                <div>
                  <p className="text-sm font-extrabold tracking-[0.025em] text-primary">
                    PROGRESO
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Construye tus habilidades.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section
        data-entry-item
        data-entry-index="1"
        className="mt-8 min-w-0"
        aria-labelledby="onboarding-technologies-title"
      >
        <div className="mb-3 gap-4 sm:flex sm:items-end sm:justify-between">
          <div>
            <h2
              id="onboarding-technologies-title"
              className="text-[1.55rem] font-extrabold leading-none tracking-[-0.035em] text-foreground sm:text-[1.7rem]"
            >
              Elige tu tecnología
            </h2>

            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Un mismo camino: ser mejor desarrollador.
            </p>
          </div>

          <div className="mt-3 hidden items-center gap-4 sm:flex">
            <span
              aria-hidden="true"
              className="h-px w-12 bg-gradient-to-r from-primary to-blue-400"
            />
            <p className="text-sm font-medium text-muted-foreground/85">
              Seis caminos. Un mismo destino: ser mejor desarrollador.
            </p>
          </div>
        </div>

        {catalogLoading ? (
          <TechnologyLoading />
        ) : catalogState.status
            === 'error' ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            No pudimos cargar las tecnologías:{' '}
            {catalogState.message}
          </p>
        ) : onboardingTechnologies
            .length === 0 ? (
          <EmptyState
            title="No hay tecnologías disponibles"
            description="Todavía no hay tecnologías preparadas para practicar."
            className="rounded-2xl border border-border bg-card"
          />
        ) : (
          <TechnologyGrid
            items={
              onboardingTechnologies
            }
            variant="onboarding"
          />
        )}
      </section>
    </div>
        );

  return (
    <PageLoadTransition
      loading={initialHomeLoading}
      presentationKey="home"
      ariaLabel="Inicio"
      skeleton={<HomeInitialLoading />}
    >
      {homeContent}
    </PageLoadTransition>
  );
}

export default HomePage;
