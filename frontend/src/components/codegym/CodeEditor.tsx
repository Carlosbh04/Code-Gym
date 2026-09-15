import { useEffect, useId, useRef, useState } from 'react';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { bracketMatching, syntaxHighlighting } from '@codemirror/language';
import { Annotation, Compartment, EditorState } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view';

import { ErrorBoundary } from '@/lib/errors/ErrorBoundary';
import { cn } from '@/lib/utils';
import { javascriptCompletionSource } from './javascript-completions';

/**
 * Editor de código controlado. No conoce dominio, ejecución ni persistencia.
 *
 * La configuración evita el `basicSetup` del wrapper anterior: incluye solo la
 * edición JavaScript, historial, tabulación, resaltado y autocompletado que usa
 * el workspace, sin cargar búsqueda ni lint en el chunk lazy del editor.
 */
export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const ACCESSIBLE_NAME = 'Editor de código';
const externalChange = Annotation.define<boolean>();
const baseExtensions = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  drawSelection(),
  syntaxHighlighting(oneDarkHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion({
    activateOnTyping: true,
    override: [javascriptCompletionSource],
  }),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...historyKeymap,
    indentWithTab,
  ]),
  javascriptLanguage,
  EditorView.lineWrapping,
];

const TOGGLE =
  'inline-flex min-h-11 items-center rounded-md px-3 py-2 text-xs font-medium text-muted-foreground underline-offset-4 ring-offset-background transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

function editableExtensions(disabled: boolean) {
  return [
    EditorView.editable.of(!disabled),
    EditorState.readOnly.of(disabled),
    disabled ? [] : highlightActiveLine(),
  ];
}

function CodeMirrorSurface({ value, onChange, disabled, labelId, editorId }: Omit<CodeEditorProps, 'className' | 'disabled'> & { disabled: boolean; labelId: string; editorId: string }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const editable = useRef(new Compartment());
  const currentDisabled = useRef(disabled);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const parent = host.current;
    if (parent === null) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        ...baseExtensions,
        editable.current.of(editableExtensions(disabled)),
        EditorView.contentAttributes.of({ 'aria-label': ACCESSIBLE_NAME, 'aria-labelledby': labelId }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !update.transactions.some((transaction) => transaction.annotation(externalChange))) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });
    const editor = new EditorView({ state, parent });
    view.current = editor;

    return () => {
      editor.destroy();
      view.current = null;
    };
    // El editor se crea una vez; value, callback y disabled se sincronizan aparte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelId]);

  useEffect(() => {
    const editor = view.current;
    if (editor === null || editor.state.doc.toString() === value) return;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
      annotations: externalChange.of(true),
    });
  }, [value]);

  useEffect(() => {
    const editor = view.current;
    if (editor === null || currentDisabled.current === disabled) return;
    currentDisabled.current = disabled;
    editor.dispatch({ effects: editable.current.reconfigure(editableExtensions(disabled)) });
  }, [disabled]);

  return <div id={editorId} ref={host} className="codegym-editor min-h-64 overflow-hidden rounded-md border border-code-border bg-code lg:min-h-[26rem]" />;
}

export function CodeEditor({ value, onChange, disabled = false, className }: CodeEditorProps) {
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
        'block min-h-64 w-full resize-y whitespace-pre rounded-md border border-code-border bg-code p-4 font-mono text-sm text-code-foreground',
        'overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:min-h-[26rem]',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    />
  );

  return (
    <div className={cn('min-w-0', className)}>
      <span id={labelId} className="sr-only">{ACCESSIBLE_NAME}</span>
      {plainText ? textarea : (
        <ErrorBoundary fallback={() => textarea}>
          <CodeMirrorSurface value={value} onChange={onChange} disabled={disabled} labelId={labelId} editorId={editorId} />
        </ErrorBoundary>
      )}
      <button type="button" onClick={() => setPlainText((previous) => !previous)} aria-controls={editorId} aria-pressed={plainText} className={TOGGLE}>
        {plainText ? 'Volver al editor con resaltado' : 'Usar editor de texto simple'}
      </button>
    </div>
  );
}
