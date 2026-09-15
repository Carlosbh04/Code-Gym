import { useMemo } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import { cn } from '@/lib/utils';

hljs.registerLanguage('javascript', javascript);

export interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  showLineNumbers?: boolean;
  highlightedLines?: readonly number[];
  highlightedLineLabel?: string;
}

export function CodeBlock({
  code,
  language = 'javascript',
  className,
  showLineNumbers = false,
  highlightedLines = [],
  highlightedLineLabel = 'Línea relevante del ejercicio',
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
  const renderByLine = showLineNumbers || highlightedLines.length > 0;
  const marked = useMemo(() => new Set(highlightedLines), [highlightedLines]);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-code-border bg-code',
        className,
      )}
    >
      <pre className={cn('overflow-x-auto font-mono text-sm text-code-foreground', renderByLine ? 'py-4' : 'p-4')}>
        {renderByLine ? (
          <code
            className={cn(
              'codegym-code block min-w-max',
              language ? `language-${language}` : undefined,
            )}
          >
            {code.split('\n').map((line, index) => {
              const lineNumber = index + 1;
              const isMarked = marked.has(lineNumber);
              return (
                <span
                  key={lineNumber}
                  className={cn(
                    'block min-h-5 border-l-[3px] px-4',
                    isMarked
                      ? 'border-code-accent bg-code-surface'
                      : 'border-transparent',
                  )}
                >
                  {showLineNumbers ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mr-4 inline-block w-6 select-none text-right text-code-muted',
                        isMarked && 'font-semibold text-code-foreground',
                      )}
                    >
                      {lineNumber}
                    </span>
                  ) : null}
                  {isMarked ? (
                    <span className="sr-only">{highlightedLineLabel}. </span>
                  ) : null}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: highlight(line, language),
                    }}
                  />
                </span>
              );
            })}
          </code>
        ) : (
          <code
            className={cn(
              'codegym-code',
              language ? `language-${language}` : undefined,
            )}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </pre>
    </div>
  );
}

function highlight(code: string, language: string): string {
  if (!hljs.getLanguage(language)) return escapeHtml(code);
  try {
    return hljs.highlight(code, { language, ignoreIllegals: true }).value;
  } catch {
    return escapeHtml(code);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
