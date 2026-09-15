import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import type { ThemePreference } from '@/types/theme';

interface ThemeOption {
  value: ThemePreference;
  label: string;
  description: string;
  icon: LucideIcon;
}

const OPTIONS: ThemeOption[] = [
  {
    value: 'system',
    label: 'Sistema',
    description: 'Sigue la configuración del dispositivo',
    icon: Monitor,
  },
  {
    value: 'light',
    label: 'Claro',
    description: 'Usa siempre la apariencia clara',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Oscuro',
    description: 'Usa siempre la apariencia oscura',
    icon: Moon,
  },
];

export function ThemeMenu() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const TriggerIcon = preference === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  useEffect(() => {
    if (!open) return;
    optionRefs.current[OPTIONS.findIndex(({ value }) => value === preference)]?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, preference]);

  const chooseTheme = (value: ThemePreference) => {
    setPreference(value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = optionRefs.current.findIndex((option) => option === document.activeElement);
    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % OPTIONS.length;
    if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + OPTIONS.length) % OPTIONS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = OPTIONS.length - 1;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (nextIndex !== null) {
      event.preventDefault();
      optionRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Tema: ${labelFor(preference)}. Apariencia ${resolvedTheme === 'dark' ? 'oscura' : 'clara'}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <TriggerIcon aria-hidden="true" className="size-5" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Seleccionar tema"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-64 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
        >
          {OPTIONS.map(({ value, label, description, icon: Icon }, index) => {
            const selected = value === preference;
            return (
              <button
                key={value}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => chooseTheme(value)}
                className={cn(
                  'flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  selected ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                <Icon aria-hidden="true" className={cn('size-5 shrink-0', selected && 'text-primary')} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">{description}</span>
                </span>
                <Check aria-hidden="true" className={cn('size-4 shrink-0 text-primary', !selected && 'invisible')} />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function labelFor(preference: ThemePreference): string {
  if (preference === 'light') return 'Claro';
  if (preference === 'dark') return 'Oscuro';
  return 'Sistema';
}
