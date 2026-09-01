import { readFileSync } from 'node:fs';
import { createElement, forwardRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CodeEditor } from './CodeEditor';

/**
 * Interruptor para simular que CodeMirror no está disponible. Fuera de ese
 * caso el componente real se monta y se ejercita de verdad.
 */
const romperCodeMirror = { activo: false };

vi.mock('@uiw/react-codemirror', async (importOriginal) => {
  const real = await importOriginal<typeof import('@uiw/react-codemirror')>();

  return {
    ...real,
    default: forwardRef<unknown, Record<string, unknown>>((props, ref) => {
      if (romperCodeMirror.activo) {
        throw new Error('CodeMirror no disponible');
      }
      return createElement(real.default, { ...props, ref } as never);
    }),
  };
});

const CODIGO = 'function dobles(nums) {\n  return nums.map((n) => n * 2);\n}';

const editor = () => document.querySelector('.cm-content');
const alternar = () => screen.getByRole('button');

describe('CodeEditor (T040)', () => {
  beforeEach(() => {
    romperCodeMirror.activo = false;
  });

  describe('edición controlada con CodeMirror', () => {
    it('monta CodeMirror y muestra el contenido inicial', () => {
      const { container } = render(<CodeEditor value={CODIGO} onChange={() => {}} />);

      expect(container.querySelector('.cm-editor')).not.toBeNull();
      expect(container.querySelectorAll('.cm-line')).toHaveLength(3);
      expect(container.textContent).toContain('return nums.map');
      expect(container.querySelector('textarea')).toBeNull();
    });

    it('refleja el valor que recibe, no un estado propio', () => {
      const { container, rerender } = render(
        <CodeEditor value="const a = 1;" onChange={() => {}} />,
      );
      expect(container.textContent).toContain('const a = 1;');

      rerender(<CodeEditor value="const b = 2;" onChange={() => {}} />);

      expect(container.textContent).toContain('const b = 2;');
      expect(container.textContent).not.toContain('const a = 1;');
    });

    it('resalta con el modo JavaScript', () => {
      const { container } = render(<CodeEditor value={CODIGO} onChange={() => {}} />);

      const spans = container.querySelectorAll('.cm-line span');
      expect(spans.length).toBeGreaterThan(0);
      // CodeMirror genera una clase por tipo de token: sin lenguaje no habría.
      expect(new Set([...spans].map((s) => s.className)).size).toBeGreaterThan(1);
    });

    it('un valor vacío no rompe el montaje', () => {
      const { container } = render(<CodeEditor value="" onChange={() => {}} />);

      expect(container.querySelector('.cm-editor')).not.toBeNull();
    });
  });

  describe('estado deshabilitado', () => {
    it('deja de ser editable', () => {
      render(<CodeEditor value={CODIGO} onChange={() => {}} disabled />);

      expect(editor()).toHaveAttribute('contenteditable', 'false');
    });

    it('es editable cuando no está deshabilitado', () => {
      render(<CodeEditor value={CODIGO} onChange={() => {}} />);

      expect(editor()).toHaveAttribute('contenteditable', 'true');
    });

    it('sigue mostrando el código', () => {
      const { container } = render(
        <CodeEditor value={CODIGO} onChange={() => {}} disabled />,
      );

      expect(container.textContent).toContain('return nums.map');
    });

    it('el textarea también se deshabilita', () => {
      render(<CodeEditor value={CODIGO} onChange={() => {}} disabled />);
      fireEvent.click(alternar());

      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  describe('accesibilidad', () => {
    it('el editor tiene nombre accesible', () => {
      render(<CodeEditor value={CODIGO} onChange={() => {}} />);

      expect(screen.getByRole('textbox')).toHaveAccessibleName('Editor de código');
    });

    it('el editor se anuncia como campo de texto', () => {
      render(<CodeEditor value={CODIGO} onChange={() => {}} />);

      expect(editor()).toHaveAttribute('role', 'textbox');
    });

    it('el editor recibe el foco', () => {
      render(<CodeEditor value={CODIGO} onChange={() => {}} />);
      const content = editor() as HTMLElement;

      content.focus();

      expect(document.activeElement).toBe(content);
    });

    it('el conmutador es un botón real, con nombre claro y área de 44px', () => {
      render(<CodeEditor value={CODIGO} onChange={() => {}} />);

      expect(alternar()).toHaveAccessibleName('Usar editor de texto simple');
      expect(alternar()).toHaveAttribute('type', 'button');
      expect(alternar().className).toContain('min-h-11');
      expect(alternar().className).toContain('focus-visible:ring-2');
    });

    it('el conmutador se alcanza y se activa con teclado', () => {
      render(<CodeEditor value={CODIGO} onChange={() => {}} />);

      alternar().focus();
      expect(document.activeElement).toBe(alternar());

      fireEvent.click(alternar());
      expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA');
    });
  });

  describe('alternativa accesible en textarea (§14)', () => {
    it('cambia a textarea conservando el código', () => {
      render(<CodeEditor value={CODIGO} onChange={() => {}} />);

      fireEvent.click(alternar());

      const area = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(area.tagName).toBe('TEXTAREA');
      expect(area.value).toBe(CODIGO);
      expect(document.querySelector('.cm-editor')).toBeNull();
    });

    it('el textarea tiene el mismo nombre accesible', () => {
      render(<CodeEditor value={CODIGO} onChange={() => {}} />);
      fireEvent.click(alternar());

      expect(screen.getByRole('textbox')).toHaveAccessibleName('Editor de código');
    });

    it('editar en el textarea emite el valor completo', () => {
      const onChange = vi.fn();
      render(<CodeEditor value={CODIGO} onChange={onChange} />);
      fireEvent.click(alternar());

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'const x = 1;' } });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('const x = 1;');
    });

    it('conserva la indentación y los saltos de línea', () => {
      render(<CodeEditor value={CODIGO} onChange={() => {}} />);
      fireEvent.click(alternar());

      const area = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(area.value.split('\n')).toHaveLength(3);
      expect(area.value).toContain('  return');
      expect(area.className).toContain('whitespace-pre');
    });

    it('se puede volver al editor con resaltado', () => {
      render(<CodeEditor value={CODIGO} onChange={() => {}} />);

      fireEvent.click(alternar());
      expect(alternar()).toHaveAccessibleName('Volver al editor con resaltado');

      fireEvent.click(alternar());
      expect(document.querySelector('.cm-editor')).not.toBeNull();
    });

    it('no corrige ni autocompleta lo que se escribe', () => {
      render(<CodeEditor value={CODIGO} onChange={() => {}} />);
      fireEvent.click(alternar());

      const area = screen.getByRole('textbox');
      expect(area).toHaveAttribute('spellcheck', 'false');
      expect(area).toHaveAttribute('autocorrect', 'off');
      expect(area).toHaveAttribute('autocapitalize', 'off');
    });
  });

  describe('cuando CodeMirror no está disponible', () => {
    it('cae al textarea en lugar de romper la página', () => {
      romperCodeMirror.activo = true;
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<CodeEditor value={CODIGO} onChange={() => {}} />);

      const area = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(area.tagName).toBe('TEXTAREA');
      expect(area.value).toBe(CODIGO);
      consoleError.mockRestore();
    });

    it('el textarea de emergencia sigue siendo editable', () => {
      romperCodeMirror.activo = true;
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onChange = vi.fn();

      render(<CodeEditor value={CODIGO} onChange={onChange} />);
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ok' } });

      expect(onChange).toHaveBeenCalledWith('ok');
      consoleError.mockRestore();
    });
  });

  describe('seguridad: edita código, no lo ejecuta', () => {
    it('no ejecuta el código que muestra', () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<CodeEditor value="console.log('ejecutado');" onChange={() => {}} />);
      fireEvent.click(alternar());

      expect(log).not.toHaveBeenCalled();
      log.mockRestore();
    });

    it('no evalúa ni conoce Worker, engine, executor ni almacenamiento', () => {
      const fuente = readFileSync('src/components/codegym/CodeEditor.tsx', 'utf8');
      const codigo = fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

      expect(codigo).not.toMatch(/\beval\s*\(|new\s+Function\s*\(/);
      expect(codigo).not.toMatch(/\bWorker\b|@\/lib\/executor|@\/lib\/engine/);
      expect(codigo).not.toMatch(/localStorage|sessionStorage|indexedDB|fetch\s*\(/);
      expect(codigo).not.toMatch(/repositor/i);
    });

    it('no conoce el dominio: nada de ExerciseStep', () => {
      const fuente = readFileSync('src/components/codegym/CodeEditor.tsx', 'utf8');

      expect(fuente).not.toMatch(/ExerciseStep|ExerciseSession|@\/types\/exercise/);
    });
  });
});
