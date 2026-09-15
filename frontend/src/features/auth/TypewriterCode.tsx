import { Terminal } from 'lucide-react';
import { AUTH_CODE_SNIPPETS, useTypewriterCode } from './useTypewriterCode';

export function TypewriterCode() {
  const { text, isTyping, reducedMotion } = useTypewriterCode();

  return (
    <section aria-label="Código de práctica" className="auth-code-window">
      <div className="flex h-11 items-center justify-between border-b border-code-border px-4">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-code-error/80" />
          <span className="size-2.5 rounded-full bg-code-warning/80" />
          <span className="size-2.5 rounded-full bg-code-success/80" />
        </div>
        <span className="flex items-center gap-2 font-mono text-[0.68rem] text-code-muted">
          <Terminal className="size-3.5" aria-hidden="true" />
          practice.js
        </span>
      </div>

      <p className="sr-only">{`Ejemplo de código: ${AUTH_CODE_SNIPPETS[0]}`}</p>
      <pre aria-hidden="true" className="min-h-[11.5rem] overflow-hidden whitespace-pre-wrap p-4 font-mono text-[0.78rem] leading-6 text-code-foreground sm:p-5 sm:text-sm">
        <code>{text}</code>
        <span
          className="auth-typewriter-cursor"
          data-active={isTyping ? 'true' : 'false'}
          data-reduced-motion={reducedMotion ? 'true' : 'false'}
        />
      </pre>
    </section>
  );
}
