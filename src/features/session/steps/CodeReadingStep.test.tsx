import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import type { ExerciseStep } from '@/types/exercise';
import { CodeReadingStep } from './CodeReadingStep';

const repo = new StaticContentRepository();

const codeReadingStepOf = async (sessionId: string): Promise<ExerciseStep> => {
  const session = await repo.getSessionById(sessionId);
  return session!.steps.find((s) => s.type === 'code-reading')!;
};

const MAP_VS_FOREACH = 'js-arrays-map-vs-foreach-01';
const silenceReactError = () => vi.spyOn(console, 'error').mockImplementation(() => {});

describe('CodeReadingStep (T026)', () => {
  describe('renderiza el contenido del paso', () => {
    it('muestra el enunciado como etiqueta del grupo de respuestas', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      render(<CodeReadingStep step={step} value={null} onChange={() => {}} />);

      const group = screen.getByRole('group', { name: step.prompt });

      expect(group).toBeInTheDocument();
      expect(group).toHaveClass('animate-fade-in-up');
      expect(within(group).getByRole('list')).toHaveClass('stagger-fade-in-up');
    });

    it('muestra el código del ejercicio', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <CodeReadingStep step={step} value={null} onChange={() => {}} />,
      );

      const code = container.querySelector('pre code');
      expect(code).not.toBeNull();
      expect(code?.textContent).toBe(step.code);
    });

    it('renderiza una opción por cada respuesta, con su texto', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      render(<CodeReadingStep step={step} value={null} onChange={() => {}} />);

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(step.options!.length);

      for (const option of step.options!) {
        expect(screen.getByRole('radio', { name: option.text })).toBeInTheDocument();
      }
    });

    it('omite el bloque de código cuando el paso no lo trae', async () => {
      const base = await codeReadingStepOf(MAP_VS_FOREACH);
      const sinCodigo: ExerciseStep = { ...base, code: null, language: null };
      const { container } = render(
        <CodeReadingStep step={sinCodigo} value={null} onChange={() => {}} />,
      );

      expect(container.querySelector('pre')).toBeNull();
      expect(screen.getAllByRole('radio')).toHaveLength(base.options!.length);
    });

    it('no revela cuál es la respuesta correcta', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <CodeReadingStep step={step} value={null} onChange={() => {}} />,
      );

      expect(container.innerHTML).not.toContain('correct');
      expect(container.textContent).not.toContain(step.explanation);
    });
  });

  describe('selección controlada', () => {
    it('ninguna opción está marcada cuando value es null', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      render(<CodeReadingStep step={step} value={null} onChange={() => {}} />);

      expect(screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked)).toEqual([]);
    });

    it('marca exactamente la opción que indica value', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      const segunda = step.options![1];
      render(<CodeReadingStep step={step} value={segunda.id} onChange={() => {}} />);

      const marcadas = screen
        .getAllByRole('radio')
        .filter((r) => (r as HTMLInputElement).checked);

      expect(marcadas).toHaveLength(1);
      expect(marcadas[0]).toHaveAccessibleName(segunda.text);
    });

    it('avisa con el id de la opción elegida', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      const onChange = vi.fn();
      render(<CodeReadingStep step={step} value={null} onChange={onChange} />);

      fireEvent.click(screen.getByRole('radio', { name: step.options![2].text }));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(step.options![2].id);
    });

    it('permite cambiar de opción', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      const onChange = vi.fn();
      render(
        <CodeReadingStep step={step} value={step.options![0].id} onChange={onChange} />,
      );

      fireEvent.click(screen.getByRole('radio', { name: step.options![3].text }));

      expect(onChange).toHaveBeenCalledWith(step.options![3].id);
    });

    it('los radios de un mismo paso comparten grupo, y dos pasos no se mezclan', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <div>
          <CodeReadingStep step={step} value={null} onChange={() => {}} />
          <CodeReadingStep step={step} value={null} onChange={() => {}} />
        </div>,
      );

      const grupos = [...container.querySelectorAll('fieldset')].map((f) =>
        new Set([...f.querySelectorAll('input')].map((i) => i.name)),
      );

      expect(grupos[0].size).toBe(1);
      expect(grupos[1].size).toBe(1);
      expect([...grupos[0]][0]).not.toBe([...grupos[1]][0]);
    });
  });

  describe('estado deshabilitado', () => {
    it('deshabilita todas las opciones', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      render(<CodeReadingStep step={step} value={null} onChange={() => {}} disabled />);

      for (const radio of screen.getAllByRole('radio')) {
        expect(radio).toBeDisabled();
      }
    });

    it('no avisa de cambios mientras está deshabilitado', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      const onChange = vi.fn();
      render(
        <CodeReadingStep step={step} value={null} onChange={onChange} disabled />,
      );

      // click() nativo, no fireEvent: fireEvent despacha el evento aunque el
      // control esté deshabilitado, cosa que ningún navegador hace.
      (screen.getByRole('radio', { name: step.options![0].text }) as HTMLInputElement).click();

      expect(onChange).not.toHaveBeenCalled();
    });

    it('conserva visible la respuesta ya elegida', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      const elegida = step.options![1];
      render(
        <CodeReadingStep step={step} value={elegida.id} onChange={() => {}} disabled />,
      );

      expect(screen.getByRole('radio', { name: elegida.text })).toBeChecked();
    });
  });

  describe('accesibilidad', () => {
    it('agrupa las respuestas con nombre accesible', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      render(<CodeReadingStep step={step} value={null} onChange={() => {}} />);

      const grupo = screen.getByRole('group', { name: step.prompt });
      expect(within(grupo).getAllByRole('radio')).toHaveLength(step.options!.length);
    });

    it('cada radio tiene su texto como nombre accesible', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      render(<CodeReadingStep step={step} value={null} onChange={() => {}} />);

      step.options!.forEach((option, i) => {
        expect(screen.getAllByRole('radio')[i]).toHaveAccessibleName(option.text);
      });
    });

    it('los radios son enfocables por teclado', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      render(<CodeReadingStep step={step} value={null} onChange={() => {}} />);

      const primero = screen.getAllByRole('radio')[0];
      primero.focus();

      expect(document.activeElement).toBe(primero);
    });

    it('el área pulsable de cada opción cumple el mínimo de 44px', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <CodeReadingStep step={step} value={null} onChange={() => {}} />,
      );

      for (const label of container.querySelectorAll('label')) {
        expect(label.className).toContain('min-h-11');
      }
    });
  });

  describe('seguridad: el código se muestra, no se ejecuta', () => {
    it('no ejecuta el código del ejercicio al renderizarlo', async () => {
      const step = await codeReadingStepOf(MAP_VS_FOREACH);
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<CodeReadingStep step={step} value={null} onChange={() => {}} />);

      expect(step.code).toContain('console.log');
      expect(log).not.toHaveBeenCalled();
      log.mockRestore();
    });

    it('escapa el marcado que venga dentro del código', async () => {
      const base = await codeReadingStepOf(MAP_VS_FOREACH);
      const conHtml: ExerciseStep = {
        ...base,
        code: 'const x = "<img src=x onerror=alert(1)>";',
      };
      const { container } = render(
        <CodeReadingStep step={conHtml} value={null} onChange={() => {}} />,
      );

      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('pre code')?.textContent).toBe(conHtml.code);
    });
  });

  describe('pasos que no puede renderizar', () => {
    it('lanza si el paso no es de tipo code-reading', async () => {
      const session = await repo.getSessionById(MAP_VS_FOREACH);
      const fixCode = session!.steps.find((s) => s.type === 'fix-code')!;
      const consoleError = silenceReactError();

      expect(() =>
        render(<CodeReadingStep step={fixCode} value={null} onChange={() => {}} />),
      ).toThrow(/solo renderiza pasos code-reading/);

      consoleError.mockRestore();
    });

    it('lanza si el paso no declara opciones', async () => {
      const base = await codeReadingStepOf(MAP_VS_FOREACH);
      const sinOpciones: ExerciseStep = { ...base, options: null };
      const consoleError = silenceReactError();

      expect(() =>
        render(<CodeReadingStep step={sinOpciones} value={null} onChange={() => {}} />),
      ).toThrow(/no declara opciones/);

      consoleError.mockRestore();
    });
  });

  describe('funciona con todo el contenido real', () => {
    it('renderiza el paso code-reading de las 6 sesiones', async () => {
      const ids = [
        'js-arrays-filter-mutation-01',
        'js-arrays-map-vs-foreach-01',
        'js-arrays-reduce-accumulator-01',
        'js-functions-default-parameters-01',
        'js-functions-return-flow-01',
        'js-functions-scope-hoisting-01',
      ];

      for (const id of ids) {
        const step = await codeReadingStepOf(id);
        const { unmount } = render(
          <CodeReadingStep step={step} value={null} onChange={() => {}} />,
        );

        expect(screen.getByRole('group', { name: step.prompt }), id).toBeInTheDocument();
        expect(screen.getAllByRole('radio')).toHaveLength(step.options!.length);
        unmount();
      }
    });
  });
});
