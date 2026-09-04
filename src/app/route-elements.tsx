import { lazy, Suspense, type ComponentType } from 'react';

const HomePage = lazy(() => import('@/features/home/HomePage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const TechnologyPage = lazy(() => import('@/features/practice/TechnologyPage'));
const TopicPage = lazy(() => import('@/features/practice/TopicPage'));
const SessionPage = lazy(() => import('@/features/session/SessionPage'));
const ReviewPage = lazy(() => import('@/features/review/ReviewPage'));
const ResultsPage = lazy(() => import('@/features/results/ResultsPage'));
const NotFoundPage = lazy(() => import('@/features/NotFoundPage'));
const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage'));

function RouteLoading() {
  return (
    <div role="status" aria-live="polite" className="py-8 text-sm text-muted-foreground">
      Cargando página…
    </div>
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

export function LazyOnboardingPage() {
  return lazyRoute(OnboardingPage);
}

export function LazyDashboardPage() {
  return lazyRoute(DashboardPage);
}

export function LazyTechnologyPage() {
  return lazyRoute(TechnologyPage);
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

export function LazyResultsPage() {
  return lazyRoute(ResultsPage);
}

export function LazyNotFoundPage() {
  return lazyRoute(NotFoundPage);
}
