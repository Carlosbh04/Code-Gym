import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { javascriptCompletionSource } from './javascript-completions';

function complete(source: string, explicit = false) {
  const state = EditorState.create({ doc: source });
  return javascriptCompletionSource(new CompletionContext(state, source.length, explicit));
}

function labels(source: string, explicit = false) {
  return complete(source, explicit)?.options.map((option) => option.label) ?? [];
}

describe('javascriptCompletionSource', () => {
  it('sugiere keywords y APIs integradas mientras se escribe', () => {
    const suggestions = labels('con');

    expect(suggestions).toEqual(expect.arrayContaining(['const', 'continue', 'console']));
    expect(labels('fun')).toContain('function');
    expect(labels('Mat')).toContain('Math');
  });

  it('completa métodos de arrays conocidos o reconocibles por su nombre', () => {
    const declared = labels('const precios = [10, 20];\nprecios.');
    const conventional = labels('arr.');

    for (const method of ['map', 'filter', 'reduce', 'forEach', 'find', 'includes', 'push', 'slice']) {
      expect(declared).toContain(method);
      expect(conventional).toContain(method);
    }
  });

  it('distingue String, Promise y console con información disponible en el documento', () => {
    expect(labels("const texto = 'hola';\ntexto.")).toEqual(expect.arrayContaining(['includes', 'toUpperCase', 'trim', 'replaceAll']));
    expect(labels('Promise.')).toEqual(expect.arrayContaining(['resolve', 'reject', 'all', 'allSettled', 'race']));
    expect(labels('const promesa = Promise.resolve(1);\npromesa.')).toEqual(expect.arrayContaining(['then', 'catch', 'finally']));
    expect(labels('console.')).toEqual(expect.arrayContaining(['log', 'warn', 'error', 'table']));
  });

  it('incluye variables, funciones, clases y parámetros definidos por el usuario', () => {
    const suggestions = labels('const precios = [];\nfunction total(items) { return items.length; }\nclass Carrito {}\npre');

    expect(suggestions).toEqual(expect.arrayContaining(['precios', 'total', 'items', 'Carrito']));
  });

  it('no abre sugerencias implícitas sin una palabra o miembro', () => {
    expect(complete('')).toBeNull();
    expect(complete(' ', false)).toBeNull();
  });
});
