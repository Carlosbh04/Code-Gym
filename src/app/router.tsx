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

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/tech/:technologyId', element: <TechnologyPage /> },
      { path: '/tech/:technologyId/:topicId', element: <TopicPage /> },
      { path: '/practice/:sessionId', element: <SessionPage /> },
      { path: '/review', element: <ReviewPage /> },
      { path: '/results/:sessionId', element: <ResultsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
