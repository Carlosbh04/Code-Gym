import { Outlet } from 'react-router-dom';
import { MobileNav } from '@/components/layout/MobileNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

/**
 * Layout raíz de la aplicación.
 *
 * CONVENCIÓN: este layout es el propietario único del landmark `main`.
 * Las páginas que se renderizan en el `<Outlet />` NO deben incluir su
 * propio `<main>`: anidarlo produce HTML inválido y dos landmarks
 * principales, lo que incumple el requisito de HTML semántico del
 * Master Plan §14. Una página usa `<section>` o un fragmento y aporta
 * su propio `<h1>`.
 */
export function AppLayout() {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Saltar al contenido principal
      </a>
      <Sidebar />
      <div className="min-w-0 flex-1 lg:flex lg:justify-center">
        <div className="flex w-full flex-col lg:max-w-[900px]">
          <TopBar />
          <main id="main-content" className="flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pb-6 lg:px-8 lg:pt-8">
            <Outlet />
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
