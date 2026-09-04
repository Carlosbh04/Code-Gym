import { lazy, Suspense } from 'react';
import type { CodeEditorProps } from '@/components/codegym/CodeEditor';
import { cn } from '@/lib/utils';

const CodeEditor = lazy(async () => {
  const module = await import('@/components/codegym/CodeEditor');
  return { default: module.CodeEditor };
});

function CodeEditorLoading({ value, onChange, disabled, className }: CodeEditorProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <textarea
        aria-label="Editor de código"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        spellCheck={false}
        rows={Math.max(6, value.split('\n').length + 1)}
        className="block w-full resize-y whitespace-pre rounded-md border border-code-border bg-code p-4 font-mono text-sm text-foreground"
      />
      <p role="status" className="mt-2 text-sm text-muted-foreground">
        Cargando editor…
      </p>
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
