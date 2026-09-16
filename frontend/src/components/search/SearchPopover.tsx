import {
  BookOpen,
  Braces,
  Clock3,
  Dumbbell,
  FileCode2,
  Layers3,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TechnologyIcon } from '@/components/codegym/TechnologyIcon';
import type { ContentContextValue } from '@/types/content';
import { cn } from '@/lib/utils';
import {
  addSearchHistory,
  clearSearchHistory,
  readSearchHistory,
} from './search-history';
import {
  buildSearchIndex,
  getCatalogSuggestions,
  searchCatalog,
  SEARCH_RESULT_LABEL,
  type SearchResult,
  type SearchResultType,
} from './search-model';

import { Skeleton } from '@/components/codegym/Skeleton';
const INPUT_LABEL = 'Buscar temas, ejercicios o tecnologías';
const INPUT_PLACEHOLDER = 'Buscar temas, ejercicios o tecnologías...';

interface SearchPopoverProps {
  content: ContentContextValue | null;
}

const RESULT_ICONS: Record<SearchResultType, typeof Search> = {
  technology: Layers3,
  topic: BookOpen,
  concept: Braces,
  session: Dumbbell,
  exercise: FileCode2,
};

export function SearchPopover({ content }: SearchPopoverProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [isOpenRequested, setIsOpenRequested] = useState(false);
  const [openLocationKey, setOpenLocationKey] = useState(location.key);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchResult[]>([]);
  const [indexedContent, setIndexedContent] = useState<ContentContextValue | null>(null);
  const [history, setHistory] = useState<string[]>(() => readSearchHistory());
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (content === null || content.isLoading) return;

    let active = true;
    void buildSearchIndex(content)
      .then((nextIndex) => {
        if (active) setIndex(nextIndex);
      })
      .catch(() => {
        if (active) setIndex([]);
      })
      .finally(() => {
        if (active) setIndexedContent(content);
      });

    return () => {
      active = false;
    };
  }, [content]);

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpenRequested(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, []);

  useEffect(() => {
    const openFromShortcut = (event: globalThis.KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || (!event.metaKey && !event.ctrlKey)) return;

      const target = event.target;
      const isEditable = target instanceof HTMLElement
        && (target.matches('input, textarea') || target.isContentEditable);
      if (isEditable && !rootRef.current?.contains(target)) return;

      event.preventDefault();
      setOpenLocationKey(location.key);
      setIsOpenRequested(true);
      window.setTimeout(() => {
        const useDesktopInput = typeof window.matchMedia !== 'function'
          || window.matchMedia('(min-width: 768px)').matches;
        (useDesktopInput ? desktopInputRef.current : mobileInputRef.current)?.focus();
      }, 0);
    };

    document.addEventListener('keydown', openFromShortcut);
    return () => document.removeEventListener('keydown', openFromShortcut);
  }, [location.key]);

  useEffect(() => {
    if (!isOpenRequested || activeIndex < 0) return;
    rootRef.current
      ?.querySelector(`#topbar-search-option-${activeIndex}`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, isOpenRequested]);

  const results = useMemo(() => searchCatalog(index, query), [index, query]);
  const suggestions = useMemo(() => getCatalogSuggestions(index), [index]);
  const selectableResults = query.trim() === '' ? suggestions : results;
  const isOpen = isOpenRequested && openLocationKey === location.key;
  const isIndexLoading =
    content?.isLoading === true || (content !== null && indexedContent !== content);

  function openSearch() {
    setOpenLocationKey(location.key);
    setIsOpenRequested(true);
  }

  function selectResult(result: SearchResult) {
    const historyTerm = query.trim() || result.title;
    setHistory(addSearchHistory(historyTerm));
    setIsOpenRequested(false);
    navigate(result.route);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpenRequested(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openSearch();
      if (selectableResults.length === 0) return;

      setActiveIndex((current) => {
        if (event.key === 'ArrowDown') {
          return current < selectableResults.length - 1 ? current + 1 : 0;
        }
        return current > 0 ? current - 1 : selectableResults.length - 1;
      });
      return;
    }

    if (event.key === 'Enter' && selectableResults.length > 0) {
      event.preventDefault();
      selectResult(selectableResults[activeIndex < 0 ? 0 : activeIndex]);
    }
  }

  function openFromMobile() {
    openSearch();
    window.setTimeout(() => mobileInputRef.current?.focus(), 0);
  }

  const comboboxProps = {
    'aria-autocomplete': 'list' as const,
    'aria-controls': 'topbar-search-results',
    'aria-expanded': isOpen,
    'aria-keyshortcuts': 'Meta+K Control+K',
    'aria-label': INPUT_LABEL,
    'aria-activedescendant':
      isOpen && activeIndex >= 0 ? `topbar-search-option-${activeIndex}` : undefined,
    autoComplete: 'off',
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
      setActiveIndex(-1);
      openSearch();
    },
    onClick: openSearch,
    onFocus: openSearch,
    onKeyDown: handleKeyDown,
    placeholder: INPUT_PLACEHOLDER,
    role: 'combobox',
    type: 'search' as const,
    value: query,
  };

  const shortcutLabel = typeof navigator !== 'undefined'
    && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    ? '⌘ K'
    : 'Ctrl K';

  return (
    <div ref={rootRef} role="search" aria-label="Búsqueda de contenido" className="relative md:w-80 lg:w-[28rem] xl:w-[30rem]">
      <button
        type="button"
        aria-label="Abrir búsqueda"
        aria-expanded={isOpen}
        className="flex size-11 items-center justify-center rounded-xl border border-border bg-card/70 text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 md:hidden"
        onClick={openFromMobile}
      >
        <Search className="size-[1.125rem]" aria-hidden="true" />
      </button>

      <label className="relative hidden md:block">
        <span className="sr-only">{INPUT_LABEL}</span>
        <input
          {...comboboxProps}
          ref={desktopInputRef}
          className="peer h-12 w-full rounded-xl border border-primary/40 bg-card/80 pl-11 pr-20 text-sm text-foreground shadow-sm shadow-primary/10 outline-none transition duration-fast placeholder:text-muted-foreground hover:border-primary/55 focus:border-primary/70 focus:bg-card focus:ring-2 focus:ring-primary/20"
        />
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[1.125rem] -translate-y-1/2 text-muted-foreground transition-colors peer-focus:text-primary" aria-hidden="true" />
        <kbd aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 flex h-6 min-w-11 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-background/70 px-1.5 font-mono text-[0.65rem] font-medium text-muted-foreground shadow-sm">
          {shortcutLabel}
        </kbd>
      </label>

      {isOpen ? (
        <section
          aria-label="Panel de búsqueda"
          className="fixed left-4 right-4 top-[3.75rem] z-50 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/35 md:absolute md:left-0 md:right-auto md:top-[calc(100%+0.5rem)] md:w-[min(32rem,calc(100vw-2rem))]"
        >
          <label className="relative block border-b border-border p-3 md:hidden">
            <span className="sr-only">{INPUT_LABEL}</span>
            <Search className="pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              {...comboboxProps}
              ref={mobileInputRef}
              className="h-11 w-full rounded-xl border border-primary/45 bg-background/70 pl-10 pr-3 text-sm text-foreground outline-none ring-2 ring-primary/10 placeholder:text-muted-foreground"
            />
          </label>

          <div className="max-h-[min(32rem,calc(100vh-5rem))] overflow-y-auto overflow-x-hidden p-2.5 sm:p-3">
            {query.trim() === '' ? (
              <EmptyQueryContent
                history={history}
                suggestions={suggestions}
                isLoading={isIndexLoading}
                activeIndex={activeIndex}
                onClear={() => {
                  clearSearchHistory();
                  setHistory([]);
                }}
                onRecent={(term) => {
                  setHistory(addSearchHistory(term));
                  setQuery(term);
                  setActiveIndex(-1);
                }}
                onResultPointerDown={(event) => event.preventDefault()}
                onResultHover={setActiveIndex}
                onSelect={selectResult}
              />
            ) : (
              <QueryContent
                query={query}
                results={results}
                isLoading={isIndexLoading}
                activeIndex={activeIndex}
                onResultPointerDown={(event) => event.preventDefault()}
                onResultHover={setActiveIndex}
                onSelect={selectResult}
              />
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

interface ResultListProps {
  results: readonly SearchResult[];
  activeIndex: number;
  onResultPointerDown: (event: ReactPointerEvent) => void;
  onResultHover: (index: number) => void;
  onSelect: (result: SearchResult) => void;
}

function SearchResultList({
  results,
  activeIndex,
  onResultPointerDown,
  onResultHover,
  onSelect,
}: ResultListProps) {
  return (
    <div id="topbar-search-results" role="listbox" aria-label="Resultados de búsqueda" className="space-y-1">
      {results.map((result, index) => {
        const Icon = RESULT_ICONS[result.type];
        return (
          <button
            key={result.id}
            id={`topbar-search-option-${index}`}
            type="button"
            role="option"
            aria-selected={activeIndex === index}
            className={cn(
              'flex min-h-14 w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition-colors hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
              activeIndex === index && 'border-primary/25 bg-primary/10',
            )}
            onMouseEnter={() => onResultHover(index)}
            onPointerDown={onResultPointerDown}
            onClick={() => onSelect(result)}
          >
            {result.type === 'technology' ? (
              <TechnologyIcon
                technologyId={result.technologyId}
                technologyName={result.technologyName}
                fallback={result.technologyIcon || result.title.slice(0, 2)}
                className="size-9"
              />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <Icon className="size-4" aria-hidden="true" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">{result.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {SEARCH_RESULT_LABEL[result.type]} · {result.technologyName}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EmptyQueryContent({
  history,
  suggestions,
  isLoading,
  activeIndex,
  onClear,
  onRecent,
  onResultPointerDown,
  onResultHover,
  onSelect,
}: Omit<ResultListProps, 'results'> & {
  history: readonly string[];
  suggestions: readonly SearchResult[];
  isLoading: boolean;
  onClear: () => void;
  onRecent: (term: string) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-2 py-1.5">
        <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Búsquedas recientes</h2>
        {history.length > 0 ? (
          <button type="button" className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35" onClick={onClear}>Limpiar</button>
        ) : null}
      </div>
      {history.length > 0 ? (
        <div className="space-y-0.5 pb-2">
          {history.map((term) => (
            <button key={term} type="button" className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-foreground hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35" onClick={() => onRecent(term)}>
              <Clock3 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{term}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="px-3 pb-3 pt-1 text-sm text-muted-foreground">Aún no hay búsquedas recientes.</p>
      )}

      <div className="my-1 border-t border-border" />
      <div className="flex items-center gap-2 px-2 py-2">
        <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
        <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sugeridos para ti</h2>
      </div>
      {isLoading ? <SearchLoading /> : <SearchResultList results={suggestions} activeIndex={activeIndex} onResultPointerDown={onResultPointerDown} onResultHover={onResultHover} onSelect={onSelect} />}
    </>
  );
}

function QueryContent({
  query,
  results,
  isLoading,
  ...resultListProps
}: ResultListProps & { query: string; isLoading: boolean }) {
  if (isLoading) return <SearchLoading />;
  if (results.length === 0) {
    return (
      <div className="px-3 py-6 text-center">
        <p className="text-sm font-medium text-foreground">No encontramos resultados para “{query.trim()}”.</p>
        <p className="mt-1 text-sm text-muted-foreground">Prueba con otra palabra.</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="px-2 pb-2 pt-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Resultados</h2>
      <SearchResultList results={results} {...resultListProps} />
    </>
  );
}

function SearchLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="space-y-2 p-2"
    >
      <span className="sr-only">
        Cargando resultados de búsqueda…
      </span>

      <div aria-hidden="true" className="space-y-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="flex min-h-12 items-center gap-3 rounded-lg px-3 py-2"
          >
            <Skeleton className="size-8 shrink-0 rounded-lg" />

            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="mt-2 h-3 w-2/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
