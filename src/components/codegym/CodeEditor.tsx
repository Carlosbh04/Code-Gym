import { useId, useState } from 'react';
import CodeMirror, { oneDark } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView } from '@codemirror/view';
import { ErrorBoundary } from '@/lib/errors/ErrorBoundary';
import { cn } from '@/lib/utils';

/**
 * Editor de código (§12: «CodeMirror wrapper (edición)»).
 *
 * Componente genérico y controlado: recibe texto y devuelve texto. §15 le
 * dedica una prohibición propia —«CodeEditor → NO puede usar: Worker, Engine,
 * repositories»— así que aquí no se ejecuta, no se valida y no se conoce el
 * dominio: quien sabe qué es un ejercicio es FixCodeStep (T041), y quien
 * ejecuta es el Worker (T039), a partir de T042.
 *
 * Sobre el textarea: §14 pide «CodeMirror: modo accesible o fallback
 * textarea». CodeMirror 6 edita sobre un `contenteditable`, que no todos los
 * lectores de pantalla manejan como un campo de texto. Por eso el textarea no
 * es código muerto de emergencia sino una alternativa que el usuario puede
 * elegir en cualquier momento, y a la que además se cae sola si CodeMirror no
 * llega a montar. Las dos vías comparten `value` y `onChange`.
 *
 * La carga diferida de CodeMirror es T092, no se adelanta aquí.
 */
export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Bloquea la edición, por ejemplo una vez validada la respuesta. */
  disabled?: boolean;
  className?: string;
}

const ACCESSIBLE_NAME = 'Editor de código';

/**
 * Cromado de CodeMirror con los tokens del sistema (§12).
 *
 * Viaja en la prop `theme` y detrás de `oneDark`, no en `extensions`: lo que
 * entra por esa prop se inyecta después y ganaba a los tokens. De `oneDark`
 * se aprovecha el resaltado, pensado para fondo oscuro; el fondo, el cursor
 * y la selección salen de aquí.
 */
const codegymTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'hsl(var(--code-bg))',
      color: 'hsl(var(--text-primary))',
      fontSize: '0.875rem',
    },
    '.cm-content': {
      fontFamily: 'var(--font-mono)',
      caretColor: 'hsl(var(--accent-text))',
    },
    '.cm-gutters': {
      backgroundColor: 'hsl(var(--code-bg))',
      color: 'hsl(var(--text-muted))',
      border: 'none',
    },
    '.cm-activeLine, .cm-activeLineGutter': {
      backgroundColor: 'hsl(var(--bg-tertiary))',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-cursor': { borderLeftColor: 'hsl(var(--accent-text))' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'hsl(var(--accent) / 0.25)',
    },
    '.cm-scroller': { overflow: 'auto' },
  },
  { dark: true },
);

const TOGGLE =
  'inline-flex min-h-11 items-center rounded-md px-3 py-2 text-xs font-medium text-muted-foreground underline-offset-4 ring-offset-background transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

export function CodeEditor({
  value,
  onChange,
  disabled = false,
  className,
}: CodeEditorProps) {
  const [plainText, setPlainText] = useState(false);
  const labelId = useId();
  const editorId = useId();

  const textarea = (
    <textarea
      id={editorId}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      spellCheck={false}
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      rows={Math.max(6, value.split('\n').length + 1)}
      aria-labelledby={labelId}
      className={cn(
        'block min-h-64 w-full resize-y whitespace-pre rounded-md border border-code-border bg-code p-4 font-mono text-sm text-foreground',
        'overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    />
  );

  return (
    <div className={cn('min-w-0', className)}>
      <span id={labelId} className="sr-only">
        {ACCESSIBLE_NAME}
      </span>

      {plainText ? (
        textarea
      ) : (
        // Si CodeMirror no llega a montar, el textarea toma el relevo sin
        // perder lo escrito: comparten `value`.
        <ErrorBoundary fallback={() => textarea}>
          <div
            id={editorId}
            className="codegym-editor min-h-64 overflow-hidden rounded-md border border-code-border bg-code"
          >
            <CodeMirror
              value={value}
              onChange={onChange}
              editable={!disabled}
              readOnly={disabled}
              theme={[oneDark, codegymTheme]}
              basicSetup={{ highlightActiveLine: !disabled, foldGutter: false }}
              extensions={[
                javascript(),
                EditorView.lineWrapping,
                EditorView.contentAttributes.of({ 'aria-label': ACCESSIBLE_NAME }),
              ]}
              className={cn('text-sm', disabled && 'opacity-60')}
            />
          </div>
        </ErrorBoundary>
      )}

      <button
        type="button"
        onClick={() => setPlainText((previous) => !previous)}
        aria-controls={editorId}
        aria-pressed={plainText}
        className={TOGGLE}
      >
        {plainText ? 'Volver al editor con resaltado' : 'Usar editor de texto simple'}
      </button>
    </div>
  );
}
