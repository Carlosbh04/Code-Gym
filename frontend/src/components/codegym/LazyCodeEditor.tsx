import { lazy, Suspense } from 'react';
import type { CodeEditorProps } from '@/components/codegym/CodeEditor';
import { Skeleton } from '@/components/codegym/Skeleton';

const CodeEditor = lazy(async () => {
  const module = await import('@/components/codegym/CodeEditor');
  return { default: module.CodeEditor };
});

function CodeEditorLoading({
  value,
  onChange,
  disabled,
  className,
}: CodeEditorProps) {
  void value;
  void onChange;
  void disabled;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={className}
    >
      <span className="sr-only">
        Cargando editor…
      </span>

      <div
        aria-hidden="true"
        className="overflow-hidden rounded-xl border border-border bg-background"
      >
        <div className="flex min-h-10 items-center gap-2 border-b border-border px-3">
          <Skeleton className="size-2.5 rounded-full" />
          <Skeleton className="size-2.5 rounded-full" />
          <Skeleton className="size-2.5 rounded-full" />
          <Skeleton className="ml-2 h-3 w-24" />
        </div>

        <div className="space-y-3 p-4">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function LazyCodeEditor(props: CodeEditorProps) {
  return (
    <Suspense fallback={<CodeEditorLoading {...props} />}>
      <CodeEditor {...props} />
    </Suspense>
  );
}
