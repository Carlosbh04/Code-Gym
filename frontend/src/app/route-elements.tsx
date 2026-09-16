import { lazy, Suspense, type ComponentType } from 'react';
import type { AuthMode } from '@/features/auth/auth-types';
import { Skeleton } from '@/components/codegym/Skeleton';

const AuthPage = lazy(() => import('@/features/auth/AuthPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));
const HomePage = lazy(() => import('@/features/home/HomePage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const TrainingPage = lazy(() => import('@/features/practice/TrainingPage'));
const TechnologyPage = lazy(() => import('@/features/practice/TechnologyPage'));
const TopicPage = lazy(() => import('@/features/practice/TopicPage'));
const SessionPage = lazy(() => import('@/features/session/SessionPage'));
const ReviewHubPage = lazy(() => import('@/features/review/ReviewHubPage'));
const ReviewPage = lazy(() => import('@/features/review/ReviewPage'));
const ResultsPage = lazy(() => import('@/features/results/ResultsPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const SecurityPage = lazy(() => import('@/features/settings/SecurityPage'));
const NotFoundPage = lazy(() => import('@/features/NotFoundPage'));
const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage'));

function RouteLoading() {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mx-auto w-full max-w-7xl py-2 sm:py-4"
    >
      <span className="sr-only">Cargando página…</span>

      <div aria-hidden="true" className="space-y-6">
        <div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-10 w-64 max-w-full sm:h-12" />
          <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-4 w-4/5 max-w-xl" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.75fr)]">
          <div className="space-y-5">
            <Skeleton className="h-52 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>

          <div className="space-y-5">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}

function lazyRoute(Page: ComponentType) {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Page />
    </Suspense>
  );
}

export function LazyHomePage() {
  return lazyRoute(HomePage);
}

export function LazyAuthPage({ initialMode = 'login' }: { initialMode?: AuthMode }) {
  return (
    <Suspense fallback={null}>
      <AuthPage initialMode={initialMode} />
    </Suspense>
  );
}

export function LazyForgotPasswordPage() {
  return lazyRoute(ForgotPasswordPage);
}

export function LazyOnboardingPage() {
  return lazyRoute(OnboardingPage);
}

export function LazyDashboardPage() {
  return lazyRoute(DashboardPage);
}

export function LazyTechnologyPage() {
  return lazyRoute(TechnologyPage);
}

export function LazyTrainingPage() {
  return lazyRoute(TrainingPage);
}

export function LazyTopicPage() {
  return lazyRoute(TopicPage);
}

export function LazySessionPage() {
  return lazyRoute(SessionPage);
}

export function LazyReviewPage() {
  return lazyRoute(ReviewPage);
}

export function LazyReviewHubPage() {
  return lazyRoute(ReviewHubPage);
}

export function LazyResultsPage() {
  return lazyRoute(ResultsPage);
}

export function LazyProfilePage() {
  return lazyRoute(ProfilePage);
}

export function LazySecurityPage() {
  return lazyRoute(SecurityPage);
}

export function LazyNotFoundPage() {
  return lazyRoute(NotFoundPage);
}
