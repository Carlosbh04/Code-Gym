import { Outlet } from 'react-router-dom';
import { MobileNav } from '@/components/layout/MobileNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1 lg:flex lg:justify-center">
        <div className="flex w-full flex-col lg:max-w-[900px]">
          <TopBar />
          <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pb-6 lg:px-8 lg:pt-8">
            <Outlet />
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
