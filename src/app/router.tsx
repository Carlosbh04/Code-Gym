import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  LazyDashboardPage,
  LazyHomePage,
  LazyNotFoundPage,
  LazyOnboardingPage,
  LazyResultsPage,
  LazyReviewPage,
  LazySessionPage,
  LazyTechnologyPage,
  LazyTopicPage,
} from '@/app/route-elements';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <LazyHomePage /> },
      { path: '/onboarding', element: <LazyOnboardingPage /> },
      { path: '/dashboard', element: <LazyDashboardPage /> },
      { path: '/tech/:technologyId', element: <LazyTechnologyPage /> },
      { path: '/tech/:technologyId/:topicId', element: <LazyTopicPage /> },
      { path: '/practice/:sessionId', element: <LazySessionPage /> },
      { path: '/review/:sessionId', element: <LazyReviewPage /> },
      { path: '/results/:sessionId', element: <LazyResultsPage /> },
      { path: '*', element: <LazyNotFoundPage /> },
    ],
  },
], {
  future: {
    v7_relativeSplatPath: true,
  },
});
