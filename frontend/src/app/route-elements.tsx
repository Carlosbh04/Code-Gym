import { lazy, Suspense, type ComponentType } from 'react';
import type { AuthMode } from '@/features/auth/auth-types';

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

export function LazyAuthPage({ initialMode = 'login' }: { initialMode?: AuthMode }) {
  return (
    <Suspense fallback={<RouteLoading />}>
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
