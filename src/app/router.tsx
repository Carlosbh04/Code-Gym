import {
  createBrowserRouter,
} from 'react-router-dom';

import {
  AppLayout,
} from '@/components/layout/AppLayout';

import {
  RequireAuth,
} from '@/features/auth/RequireAuth';
import {
  LazyAuthPage,
  LazyDashboardPage,
  LazyForgotPasswordPage,
  LazyHomePage,
  LazyNotFoundPage,
  LazyOnboardingPage,
  LazyProfilePage,
  LazyResultsPage,
  LazyReviewHubPage,
  LazyReviewPage,
  LazySecurityPage,
  LazySessionPage,
  LazyTrainingPage,
  LazyTechnologyPage,
  LazyTopicPage,
} from '@/app/route-elements';

export const router =
  createBrowserRouter(
    [
      {
        path: '/auth',
        element: <LazyAuthPage />,
      },

      {
        path: '/login',
        element: <LazyAuthPage />,
      },

      {
        path: '/register',
        element: (
          <LazyAuthPage
            initialMode="register"
          />
        ),
      },

      {
        path: '/forgot-password',
        element: <LazyForgotPasswordPage />,
      },

      {
        element: <RequireAuth />,

        children: [
          {
            element: <AppLayout />,

            children: [
              {
                path: '/',
                element: <LazyHomePage />,
              },

              {
                path: '/onboarding',
                element:
                  <LazyOnboardingPage />,
              },

              {
                path: '/dashboard',
                element:
                  <LazyDashboardPage />,
              },

              {
                path: '/profile',
                element:
                  <LazyProfilePage />,
              },

              {
                path: '/settings/security',
                element:
                  <LazySecurityPage />,
              },

              {
                path: '/tech',
                element:
                  <LazyTrainingPage />,
              },

              {
                path:
                  '/tech/:technologyId',

                element:
                  <LazyTechnologyPage />,
              },

              {
                path:
                  '/tech/:technologyId/:topicId',

                element:
                  <LazyTopicPage />,
              },

              {
                path:
                  '/practice/:sessionId',

                element:
                  <LazySessionPage />,
              },

              {
                path: '/review',
                element:
                  <LazyReviewHubPage />,
              },

              {
                path:
                  '/review/:sessionId',

                element:
                  <LazyReviewPage />,
              },

              {
                path:
                  '/results/:sessionId',

                element:
                  <LazyResultsPage />,
              },

              {
                path: '*',
                element:
                  <LazyNotFoundPage />,
              },
            ],
          },
        ],
      },
    ],

    {
      future: {
        v7_relativeSplatPath:
          true,
      },
    },
  );
