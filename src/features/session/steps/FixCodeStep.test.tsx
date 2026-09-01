import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import type { ExerciseStep } from '@/types/exercise';
import { FixCodeStep } from './FixCodeStep';

const repo = new StaticContentRepository();

const fixCodeStepOf = async (sessionId: string): Promise<ExerciseStep> => {
  const session = await repo.getSessionById(sessionId);
  return session!.steps.find((s) => s.type === 'fix-code')!;
};

const MAP_VS_FOREACH = 'js-arrays-map-vs-foreach-01';
const silenceReactError = () => vi.spyOn(console, 'error').mockImplementation(() => {});
const aTextarea = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Usar editor de texto simple' }));

describe('FixCodeStep (T041)', () => {
  describe('renderiza el paso', () => {
    it('muestra el enunciado como etiqueta del grupo', async () => {
      const step = await fixCodeStepOf(MAP_VS_FOREACH);
      render(<FixCodeStep step={step} value={null} onChange={() => {}} />);

      expect(screen.getByRole('group', { name: step.prompt })).toBeInTheDocument();
    });

    it('arranca con el código del ejercicio cuando no se ha editado', async () => {
      const step = await fixCodeStepOf(MAP_VS_FOREACH);
      render(<FixCodeStep step={step} value={null} onChange={() => {}} />);

      aTextarea();

      expect(screen.getByRole('textbox')).toHaveValue(step.code);
    });

    it('monta el editor dentro del grupo del paso', async () => {
      const step = await fixCodeStepOf(MAP_VS_FOREACH);
      render(<FixCodeStep step={step} value={null} onChange={() => {}} />);

      const grupo = screen.getByRole('group', { name: step.prompt });
      expect(within(grupo).getByRole('textbox')).toBeInTheDocument();
      expect(document.querySelector('.cm-editor')).not.toBeNull();
    });

    it('no revela la explicación ni los test cases', async () => {
      const step = await fixCodeStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <FixCodeStep step={step} value={null} onChange={() => {}} />,
      );

      expect(container.textContent).not.toContain(step.explanation);
      for (const test of step.testCases!) {
        expect(container.textContent).not.toContain(test.description);
      }
    });
  });

  describe('edición controlada', () => {
    it('muestra lo editado en lugar del código original', async () => {
      const step = await fixCodeStepOf(MAP_VS_FOREACH);
      render(<FixCodeStep step={step} value="const mio = 1;" onChange={() => {}} />);

      aTextarea();

      expect(screen.getByRole('textbox')).toHaveValue('const mio = 1;');
      expect(screen.getByRole('textbox')).not.toHaveValue(step.code);
    });

    it('emite el código completo al editar', async () => {
      const step = await fixCodeStepOf(MAP_VS_FOREACH);
      const onChange = vi.fn();
      render(<FixCodeStep step={step} value={null} onChange={onChange} />);

      aTextarea();
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'nuevo();' } });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('nuevo();');
    });

    it('una cadena vacía es una edición válida, no una falta de edición', async () => {
      const step = await fixCodeStepOf(MAP_VS_FOREACH);
      render(<FixCodeStep step={step} value="" onChange={() => {}} />);

      aTextarea();

      expect(screen.getByRole('textbox')).toHaveValue('');
    });
  });

  describe('estado deshabilitado', () => {
    it('bloquea la edición', async () => {
      const step = await fixCodeStepOf(MAP_VS_FOREACH);
      render(<FixCodeStep step={step} value={null} onChange={() => {}} disabled />);

      expect(document.querySelector('.cm-content')).toHaveAttribute(
        'contenteditable',
        'false',
      );
    });

    it('no emite cambios mientras está deshabilitado', async () => {
      const step = await fixCodeStepOf(MAP_VS_FOREACH);
      const onChange = vi.fn();
      render(<FixCodeStep step={step} value={null} onChange={onChange} disabled />);

      expect(screen.getByRole('button')).toBeDisabled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('conserva visible lo que el usuario había escrito', async () => {
      const step = await fixCodeStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <FixCodeStep step={step} value="mi solución" onChange={() => {}} disabled />,
      );

      expect(container.textContent).toContain('mi solución');
    });
  });

  describe('accesibilidad', () => {
    it('el editor tiene nombre accesible dentro de un grupo etiquetado', async () => {
      const step = await fixCodeStepOf(MAP_VS_FOREACH);
      render(<FixCodeStep step={step} value={null} onChange={() => {}} />);

      expect(screen.getByRole('textbox')).toHaveAccessibleName('Editor de código');
      expect(screen.getByRole('group', { name: step.prompt })).toBeInTheDocument();
    });

    it('el editor es enfocable por teclado', async () => {
      const step = await fixCodeStepOf(MAP_VS_FOREACH);
      render(<FixCodeStep step={step} value={null} onChange={() => {}} />);

      const content = document.querySelector('.cm-content') as HTMLElement;
      content.focus();

      expect(document.activeElement).toBe(content);
    });

    it('el conmutador del editor accesible está disponible', async () => {
      const step = await fixCodeStepOf(MAP_VS_FOREACH);
      render(<FixCodeStep step={step} value={null} onChange={() => {}} />);

      const boton = screen.getByRole('button', { name: 'Usar editor de texto simple' });
      boton.focus();

      expect(document.activeElement).toBe(boton);
      expect(boton.className).toContain('min-h-11');
    });
  });

  describe('seguridad: edita, no ejecuta ni valida', () => {
    it('no ejecuta el código roto del ejercicio', async () => {
      const step = await fixCodeStepOf(MAP_VS_FOREACH);
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<FixCodeStep step={step} value={null} onChange={() => {}} />);
      aTextarea();
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: "console.log('ejecutado');" },
      });

      expect(log).not.toHaveBeenCalled();
      log.mockRestore();
    });

    it('no conoce Worker, executor ni validación', () => {
      const fuente = readFileSync('src/features/session/steps/FixCodeStep.tsx', 'utf8');
      const codigo = fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

      expect(codigo).not.toMatch(/\bWorker\b|@\/lib\/executor|ICodeExecutor/);
      expect(codigo).not.toMatch(/\beval\s*\(|new\s+Function\s*\(/);
      expect(codigo).not.toMatch(/validateFixCode|validateSelection/);
    });

    it('no compara con los testCases: eso ejecuta y es del Worker', async () => {
      const step = await fixCodeStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <FixCodeStep step={step} value={null} onChange={() => {}} />,
      );

      expect(container.textContent).not.toContain('[2,4,6]');
      expect(container.textContent).not.toContain('duplica cada número');
    });
  });

  describe('pasos que no puede renderizar', () => {
    it('lanza si el paso no es de tipo fix-code', async () => {
      const session = await repo.getSessionById(MAP_VS_FOREACH);
      const codeReading = session!.steps.find((s) => s.type === 'code-reading')!;
      const consoleError = silenceReactError();

      expect(() =>
        render(<FixCodeStep step={codeReading} value={null} onChange={() => {}} />),
      ).toThrow(/solo renderiza pasos fix-code/);

      consoleError.mockRestore();
    });

    it('lanza si el paso no declara código', async () => {
      const base = await fixCodeStepOf(MAP_VS_FOREACH);
      const sinCodigo: ExerciseStep = { ...base, code: null };
      const consoleError = silenceReactError();

      expect(() =>
        render(<FixCodeStep step={sinCodigo} value={null} onChange={() => {}} />),
      ).toThrow(/no declara código/);

      consoleError.mockRestore();
    });
  });

  describe('funciona con todo el contenido real', () => {
    it('renderiza el paso fix-code de las 6 sesiones con su código', async () => {
      const ids = [
        'js-arrays-filter-mutation-01',
        'js-arrays-map-vs-foreach-01',
        'js-arrays-reduce-accumulator-01',
        'js-functions-default-parameters-01',
        'js-functions-return-flow-01',
        'js-functions-scope-hoisting-01',
      ];

      for (const id of ids) {
        const step = await fixCodeStepOf(id);
        const { unmount } = render(
          <FixCodeStep step={step} value={null} onChange={() => {}} />,
        );

        expect(screen.getByRole('group', { name: step.prompt })).toBeInTheDocument();
        aTextarea();
        expect(screen.getByRole('textbox'), id).toHaveValue(step.code);

        unmount();
      }
    });
  });
});
