import { useContext } from 'react';
import { ContentContext } from '@/contexts/content-context';
import { SearchPopover } from '@/components/search/SearchPopover';
import { ThemeMenu } from '@/components/theme/ThemeMenu';
import { UserMenu } from '@/components/layout/UserMenu';

/** Utilidades e identidad local; la navegación vive en Sidebar/MobileNav. */
export function TopBar() {
  const content = useContext(ContentContext);

  return (
    <header aria-label="Barra de usuario" className="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center border-b border-border bg-background/95 px-4 backdrop-blur sm:h-16 sm:px-6 lg:px-8">
      <span className="text-sm font-bold tracking-tight text-primary sm:hidden">CodeGym</span>

      <div className="ml-auto flex min-w-0 items-center gap-2.5 sm:gap-3 md:ml-0 md:w-full">
        <SearchPopover content={content} />

        <span aria-hidden="true" className="hidden h-8 w-px bg-border md:ml-auto md:block" />

        <ThemeMenu />

        <UserMenu />
      </div>
    </header>
  );
}
