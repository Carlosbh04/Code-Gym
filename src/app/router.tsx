import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import HomePage from '@/features/home/HomePage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import TechnologyPage from '@/features/practice/TechnologyPage';
import TopicPage from '@/features/practice/TopicPage';
import SessionPage from '@/features/session/SessionPage';
import ReviewPage from '@/features/review/ReviewPage';
import ResultsPage from '@/features/results/ResultsPage';
import NotFoundPage from '@/features/NotFoundPage';
import OnboardingPage from '@/features/onboarding/OnboardingPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/onboarding', element: <OnboardingPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/tech/:technologyId', element: <TechnologyPage /> },
      { path: '/tech/:technologyId/:topicId', element: <TopicPage /> },
      { path: '/practice/:sessionId', element: <SessionPage /> },
      { path: '/review/:sessionId', element: <ReviewPage /> },
      { path: '/results/:sessionId', element: <ResultsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
