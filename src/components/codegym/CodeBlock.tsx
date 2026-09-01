import { useMemo } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import { cn } from '@/lib/utils';

hljs.registerLanguage('javascript', javascript);

export interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({
  code,
  language = 'javascript',
  className,
}: CodeBlockProps) {
  const html = useMemo(() => {
    if (!hljs.getLanguage(language)) {
      return escapeHtml(code);
    }
    try {
      return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    } catch {
      return escapeHtml(code);
    }
  }, [code, language]);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-code-border bg-code',
        className,
      )}
    >
      <pre className="overflow-x-auto p-4 font-mono text-sm text-foreground">
        <code
          className={cn('codegym-code', language ? `language-${language}` : undefined)}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
