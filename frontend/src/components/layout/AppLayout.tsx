import {
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import {
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { MobileNav } from '@/components/layout/MobileNav';
import { PostLoginIntro } from '@/components/layout/PostLoginIntro';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

/**
 * Layout raíz de la aplicación.
 *
 * CONVENCIÓN:
 * Este layout es el propietario único del landmark `main`.
 *
 * Las páginas renderizadas dentro de <Outlet /> NO deben incluir
 * su propio <main>.
 */
export function AppLayout() {
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const locationState =
    location.state as {
      postLoginIntro?: boolean;
    } | null;

  const [
    showPostLoginIntro,
    setShowPostLoginIntro,
  ] = useState(
    locationState?.postLoginIntro === true,
  );

  useLayoutEffect(() => {
    if (
      locationState?.postLoginIntro
        === true
    ) {
      navigate(
        location.pathname
          + location.search
          + location.hash,
        {
          replace: true,
          state: null,
        },
      );
    }
  }, [
    location.hash,
    location.pathname,
    location.search,
    locationState?.postLoginIntro,
    navigate,
  ]);

  useLayoutEffect(() => {
    const main = mainRef.current;
    const scrollingElement = document.scrollingElement ?? document.documentElement;
    scrollingElement.scrollTop = 0;
    scrollingElement.scrollLeft = 0;
    let frameId: number | undefined;

    if (location.hash !== '') {
      const targetId = decodeURIComponent(location.hash.slice(1));
      frameId = window.requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
      });
    }

    main?.focus({ preventScroll: true });

    return () => {
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
    };
  }, [location.hash, location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="
          sr-only
          rounded-md
          bg-primary
          px-4
          py-2
          font-medium
          text-primary-foreground

          focus:absolute
          focus:left-4
          focus:top-4
          focus:z-50
          focus:not-sr-only
          focus:outline-none
          focus:ring-2
          focus:ring-ring
          focus:ring-offset-2
          focus:ring-offset-background
        "
      >
        Saltar al contenido principal
      </a>

      <div className="min-h-screen sm:flex">
        <Sidebar />

        <div className="min-w-0 flex-1">
          <div
            className="
              mx-auto
              flex
              min-h-screen
              w-full
              max-w-[1440px]
              flex-col
            "
          >
            <TopBar />

            <main
              ref={mainRef}
              id="main-content"
              tabIndex={-1}
              className="
                flex-1
                outline-none

                px-4
                pb-28
                pt-5

                sm:px-6
                sm:pb-8
                sm:pt-6

                md:px-7

                lg:px-10
                lg:pb-10
                lg:pt-8

                xl:px-12
              "
            >
              <Outlet />
            </main>
          </div>
        </div>
      </div>

      <MobileNav />

      {showPostLoginIntro ? (
        <PostLoginIntro
          onComplete={() => {
            setShowPostLoginIntro(false);
          }}
        />
      ) : null}
    </div>
  );
}
