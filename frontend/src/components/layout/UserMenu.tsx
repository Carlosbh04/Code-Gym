import {
  ChevronRight,
  CircleHelp,
  LogOut,
  Settings,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/AuthContext';

interface SecondaryMenuItem {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly to?: string;
}

const SECONDARY_MENU_ITEMS: readonly SecondaryMenuItem[] = [
  {
    label: 'Configuración',
    icon: Settings,
    to: '/settings/security',
  },
  {
    label: 'Ayuda',
    icon: CircleHelp,
  },
];

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const logoutPendingRef = useRef(false);
  const popoverId = useId();

  const email = user?.email.trim() ?? '';
  const displayName = getDisplayName(user?.displayName, email);
  const initial = displayName.slice(0, 1).toLocaleUpperCase('es');

  const closeAndRestoreFocus = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => {
      menuItemRefs.current[0]?.focus();
    }, 0);

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeAndRestoreFocus();
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [closeAndRestoreFocus, open]);

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = menuItemRefs.current.filter(
      (item): item is HTMLButtonElement => item !== null && !item.disabled,
    );
    const currentIndex = items.findIndex((item) => item === document.activeElement);
    let nextIndex: number | null = null;

    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
    if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      items[nextIndex]?.focus();
    }
  }

  async function handleLogout() {
    if (logoutPendingRef.current) return;

    logoutPendingRef.current = true;
    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      setOpen(false);
      navigate('/login', { replace: true });
    }
  }

  function openProfile() {
    setOpen(false);
    navigate('/profile');
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Usuario actual: ${displayName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        className="flex min-h-11 items-center gap-2.5 rounded-xl px-0.5 text-sm text-foreground transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-1"
        onClick={() => setOpen((current) => !current)}
      >
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary font-bold text-primary-foreground shadow-sm shadow-primary/20"
        >
          {initial}
        </span>
        <span className="hidden max-w-32 truncate font-medium sm:inline">
          {displayName}
        </span>
      </button>

      {open ? (
        <section
          id={popoverId}
          aria-label="Perfil de usuario"
          className="absolute right-0 top-[calc(100%+0.625rem)] z-[70] w-[min(22rem,calc(100vw-2rem))] animate-in rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl shadow-black/35 fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none before:absolute before:right-5 before:top-0 before:size-3 before:-translate-y-1/2 before:rotate-45 before:border-l before:border-t before:border-border before:bg-popover"
        >
          <div className="relative flex items-center gap-3.5 px-5 pb-4 pt-5">
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary font-bold text-primary-foreground shadow-sm shadow-primary/20"
            >
              {initial}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold text-foreground">
                {displayName}
              </span>
              {email !== '' ? (
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                  {email}
                </span>
              ) : null}
            </span>

            <button
              type="button"
              aria-label="Cerrar menú de usuario"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={closeAndRestoreFocus}
            >
              <X aria-hidden="true" className="size-[1.125rem]" />
            </button>
          </div>

          <div
            role="menu"
            aria-label="Opciones de usuario"
            className="px-2.5 pb-2.5"
            onKeyDown={handleMenuKeyDown}
          >
            <button
              ref={(node) => {
                menuItemRefs.current[0] = node;
              }}
              type="button"
              role="menuitem"
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={openProfile}
            >
              <User aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">Mi perfil</span>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </button>

            {SECONDARY_MENU_ITEMS.map(({ label, icon: Icon, to }, index) => (
              <button
                key={label}
                ref={(node) => {
                  menuItemRefs.current[index + 1] = node;
                }}
                type="button"
                role="menuitem"
                aria-disabled={to === undefined ? 'true' : undefined}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={(event) => {
                  if (to === undefined) {
                    event.preventDefault();
                    return;
                  }

                  setOpen(false);
                  navigate(to);
                }}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">{label}</span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}

            <div aria-hidden="true" className="my-2 h-px bg-border" />

            <button
              ref={(node) => {
                menuItemRefs.current[SECONDARY_MENU_ITEMS.length + 1] = node;
              }}
              type="button"
              role="menuitem"
              disabled={isLoggingOut}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-400/70 disabled:cursor-wait disabled:opacity-70"
              onClick={() => void handleLogout()}
            >
              <LogOut aria-hidden="true" className="size-5 shrink-0" />
              <span>{isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</span>
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function getDisplayName(displayName: string | null | undefined, email: string): string {
  const normalizedName = displayName?.trim();

  if (normalizedName) return normalizedName;

  const emailName = email.split('@')[0]?.trim();
  return emailName || 'Usuario';
}
