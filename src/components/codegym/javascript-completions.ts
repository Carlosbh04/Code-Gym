import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from '@codemirror/autocomplete';

const KEYWORDS = [
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
  'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'of',
  'return', 'static', 'super', 'switch', 'this', 'throw', 'try', 'typeof',
  'var', 'void', 'while', 'yield',
] as const;

const BUILT_INS = [
  'Array', 'Boolean', 'Date', 'JSON', 'Map', 'Math', 'Number', 'Object',
  'Promise', 'RegExp', 'Set', 'String', 'console',
] as const;

const ARRAY_METHODS = [
  'map', 'filter', 'reduce', 'forEach', 'find', 'findIndex', 'some', 'every',
  'includes', 'push', 'pop', 'shift', 'unshift', 'slice', 'splice', 'sort',
  'reverse', 'join', 'flat', 'flatMap',
] as const;

const STRING_METHODS = [
  'includes', 'startsWith', 'endsWith', 'slice', 'substring', 'toUpperCase',
  'toLowerCase', 'trim', 'split', 'replace', 'replaceAll',
] as const;

const PROMISE_STATIC_METHODS = ['resolve', 'reject', 'all', 'allSettled', 'race'] as const;
const PROMISE_METHODS = ['then', 'catch', 'finally'] as const;
const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'table', 'group', 'groupEnd'] as const;

const keywordCompletions: Completion[] = KEYWORDS.map((label) => ({
  label,
  type: 'keyword',
  detail: 'JavaScript',
}));

const builtInCompletions: Completion[] = BUILT_INS.map((label) => ({
  label,
  type: label === 'console' ? 'variable' : 'class',
  detail: 'API integrada',
}));

function propertyCompletions(labels: readonly string[], detail: string): Completion[] {
  return labels.map((label) => ({ label, type: 'property', detail }));
}

const arrayCompletions = propertyCompletions(ARRAY_METHODS, 'Array');
const stringCompletions = propertyCompletions(STRING_METHODS, 'String');
const promiseStaticCompletions = propertyCompletions(PROMISE_STATIC_METHODS, 'Promise');
const promiseCompletions = propertyCompletions(PROMISE_METHODS, 'Promise');
const consoleCompletions = propertyCompletions(CONSOLE_METHODS, 'Console');

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasAssignment(source: string, name: string, expression: string): boolean {
  return new RegExp(`\\b(?:const|let|var)\\s+${escapeRegExp(name)}\\s*=\\s*${expression}`).test(source);
}

function memberCompletions(source: string, objectName: string): Completion[] {
  if (objectName === 'Promise') return promiseStaticCompletions;
  if (objectName === 'console') return consoleCompletions;

  const looksLikeArray =
    hasAssignment(source, objectName, '\\[') ||
    new RegExp(`\\b${escapeRegExp(objectName)}\\s*=\\s*(?:Array\\.|new\\s+Array\\b)`).test(source) ||
    /(?:arr|array|items|list|values|numbers|numeros|precios)$/i.test(objectName);
  if (looksLikeArray) return arrayCompletions;

  const looksLikeString =
    hasAssignment(source, objectName, "['\"`]") ||
    /(?:str|string|text|texto|name|nombre)$/i.test(objectName);
  if (looksLikeString) return stringCompletions;

  const looksLikePromise =
    hasAssignment(source, objectName, '(?:new\\s+Promise\\b|Promise\\.)') ||
    /(?:promise|promesa)$/i.test(objectName);
  return looksLikePromise ? promiseCompletions : [];
}

function definedSymbolCompletions(source: string): Completion[] {
  const symbols = new Map<string, Completion>();
  const declaration = /\b(const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
  let match: RegExpExecArray | null;

  while ((match = declaration.exec(source)) !== null) {
    const declarationType = match[1];
    const label = match[2];
    if (label === undefined || declarationType === undefined) continue;
    const type = declarationType === 'function' ? 'function' : declarationType === 'class' ? 'class' : 'variable';
    symbols.set(label, { label, type, detail: 'Símbolo local', boost: 20 });
  }

  const functionParameters = /\bfunction(?:\s+[A-Za-z_$][\w$]*)?\s*\(([^)]*)\)/g;
  while ((match = functionParameters.exec(source)) !== null) {
    for (const parameter of (match[1] ?? '').split(',')) {
      const label = parameter.trim().match(/^[A-Za-z_$][\w$]*/)?.[0];
      if (label !== undefined) symbols.set(label, { label, type: 'variable', detail: 'Parámetro local', boost: 20 });
    }
  }

  return [...symbols.values()];
}

function uniqueCompletions(groups: Completion[][]): Completion[] {
  const completions = new Map<string, Completion>();
  for (const option of groups.flat()) {
    if (!completions.has(option.label)) completions.set(option.label, option);
  }
  return [...completions.values()];
}

/** Fuente local y determinista: inspecciona el documento, pero nunca lo ejecuta. */
export function javascriptCompletionSource(context: CompletionContext): CompletionResult | null {
  const source = context.state.doc.toString();
  const member = context.matchBefore(/[A-Za-z_$][\w$]*\.[\w$]*/);

  if (member !== null) {
    const dotIndex = member.text.lastIndexOf('.');
    const objectName = member.text.slice(0, dotIndex);
    const options = memberCompletions(source, objectName);
    if (options.length === 0) return null;
    return {
      from: member.from + dotIndex + 1,
      options,
      validFor: /^[\w$]*$/,
    };
  }

  const word = context.matchBefore(/[A-Za-z_$][\w$]*/);
  if (word === null || (word.from === word.to && !context.explicit)) return null;

  return {
    from: word.from,
    options: uniqueCompletions([
      definedSymbolCompletions(source),
      keywordCompletions,
      builtInCompletions,
    ]),
    validFor: /^[\w$]*$/,
  };
}
