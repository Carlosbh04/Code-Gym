import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import type { ExerciseStep } from '@/types/exercise';
import { PredictOutputStep } from './PredictOutputStep';

const repo = new StaticContentRepository();

const predictOutputStepOf = async (sessionId: string): Promise<ExerciseStep> => {
  const session = await repo.getSessionById(sessionId);
  return session!.steps.find((s) => s.type === 'predict-output')!;
};

const MAP_VS_FOREACH = 'js-arrays-map-vs-foreach-01';
const silenceReactError = () => vi.spyOn(console, 'error').mockImplementation(() => {});

describe('PredictOutputStep (T031)', () => {
  describe('renderiza el contenido del paso', () => {
    it('muestra el enunciado como etiqueta del grupo de respuestas', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      render(<PredictOutputStep step={step} value={null} onChange={() => {}} />);

      expect(screen.getByRole('group', { name: step.prompt })).toBeInTheDocument();
    });

    it('muestra el código cuya salida hay que predecir', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <PredictOutputStep step={step} value={null} onChange={() => {}} />,
      );

      expect(container.querySelector('pre code')?.textContent).toBe(step.code);
    });

    it('renderiza una opción por cada salida candidata, con su texto', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      render(<PredictOutputStep step={step} value={null} onChange={() => {}} />);

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(step.options!.length);
      step.options!.forEach((option) => {
        expect(screen.getByText(option.text)).toBeInTheDocument();
      });
    });

    it('compone las salidas en monoespaciada y conserva sus espacios', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      render(<PredictOutputStep step={step} value={null} onChange={() => {}} />);

      const texto = screen.getByText(step.options![0].text);
      expect(texto.className).toContain('font-mono');
      expect(texto.className).toContain('whitespace-pre-wrap');
    });

    it('omite el bloque de código cuando el paso no lo trae', async () => {
      const base = await predictOutputStepOf(MAP_VS_FOREACH);
      const sinCodigo: ExerciseStep = { ...base, code: null };
      const { container } = render(
        <PredictOutputStep step={sinCodigo} value={null} onChange={() => {}} />,
      );

      expect(container.querySelector('pre')).toBeNull();
      expect(screen.getAllByRole('radio')).toHaveLength(base.options!.length);
    });

    it('no revela cuál es la salida correcta', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <PredictOutputStep step={step} value={null} onChange={() => {}} />,
      );

      expect(container.innerHTML).not.toContain('correct');
      expect(container.textContent).not.toContain(step.explanation);
    });
  });

  describe('selección controlada', () => {
    it('ninguna opción está marcada cuando value es null', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      render(<PredictOutputStep step={step} value={null} onChange={() => {}} />);

      screen.getAllByRole('radio').forEach((radio) => expect(radio).not.toBeChecked());
    });

    it('marca exactamente la opción que indica value', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      const elegida = step.options![2];
      render(<PredictOutputStep step={step} value={elegida.id} onChange={() => {}} />);

      const radios = screen.getAllByRole('radio');
      expect(radios.filter((r) => (r as HTMLInputElement).checked)).toHaveLength(1);
      expect(screen.getByRole('radio', { name: elegida.text })).toBeChecked();
    });

    it('avisa con el id de la opción elegida', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      const onChange = vi.fn();
      render(<PredictOutputStep step={step} value={null} onChange={onChange} />);

      fireEvent.click(screen.getByRole('radio', { name: step.options![1].text }));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(step.options![1].id);
    });

    it('permite cambiar de opción', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      const onChange = vi.fn();
      render(
        <PredictOutputStep step={step} value={step.options![0].id} onChange={onChange} />,
      );

      fireEvent.click(screen.getByRole('radio', { name: step.options![3].text }));

      expect(onChange).toHaveBeenCalledWith(step.options![3].id);
    });

    it('los radios de un mismo paso comparten grupo, y dos pasos no se mezclan', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <>
          <PredictOutputStep step={step} value={null} onChange={() => {}} />
          <PredictOutputStep step={step} value={null} onChange={() => {}} />
        </>,
      );

      const grupos = [...container.querySelectorAll('fieldset')].map((f) =>
        [...f.querySelectorAll('input')].map((i) => i.name),
      );

      expect(new Set(grupos[0]).size).toBe(1);
      expect(new Set(grupos[1]).size).toBe(1);
      expect(grupos[0][0]).not.toBe(grupos[1][0]);
    });
  });

  describe('estado deshabilitado', () => {
    it('deshabilita todas las opciones', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      render(<PredictOutputStep step={step} value={null} onChange={() => {}} disabled />);

      screen.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
    });

    it('no avisa de cambios mientras está deshabilitado', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      const onChange = vi.fn();
      render(<PredictOutputStep step={step} value={null} onChange={onChange} disabled />);

      screen.getAllByRole('radio')[0].click();

      expect(onChange).not.toHaveBeenCalled();
    });

    it('conserva visible la respuesta ya elegida', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      const elegida = step.options![1];
      render(
        <PredictOutputStep step={step} value={elegida.id} onChange={() => {}} disabled />,
      );

      expect(screen.getByRole('radio', { name: elegida.text })).toBeChecked();
    });
  });

  describe('accesibilidad', () => {
    it('agrupa las respuestas con nombre accesible', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      render(<PredictOutputStep step={step} value={null} onChange={() => {}} />);

      const grupo = screen.getByRole('group', { name: step.prompt });
      expect(within(grupo).getAllByRole('radio')).toHaveLength(step.options!.length);
    });

    it('cada radio tiene su salida como nombre accesible', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      render(<PredictOutputStep step={step} value={null} onChange={() => {}} />);

      step.options!.forEach((option, i) => {
        expect(screen.getAllByRole('radio')[i]).toHaveAccessibleName(option.text);
      });
    });

    it('los radios son enfocables por teclado', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      render(<PredictOutputStep step={step} value={null} onChange={() => {}} />);

      const primero = screen.getAllByRole('radio')[0];
      primero.focus();

      expect(document.activeElement).toBe(primero);
    });

    it('el área pulsable de cada opción cumple el mínimo de 44px', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <PredictOutputStep step={step} value={null} onChange={() => {}} />,
      );

      for (const label of container.querySelectorAll('label')) {
        expect(label.className).toContain('min-h-11');
      }
    });
  });

  describe('seguridad: el código se muestra, no se ejecuta', () => {
    it('no ejecuta el código del ejercicio al renderizarlo', async () => {
      const step = await predictOutputStepOf(MAP_VS_FOREACH);
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<PredictOutputStep step={step} value={null} onChange={() => {}} />);

      expect(step.code).toContain('console.log');
      expect(log).not.toHaveBeenCalled();
      log.mockRestore();
    });

    it('escapa el marcado que venga dentro del código', async () => {
      const base = await predictOutputStepOf(MAP_VS_FOREACH);
      const conHtml: ExerciseStep = {
        ...base,
        code: 'const x = "<img src=x onerror=alert(1)>";',
      };
      const { container } = render(
        <PredictOutputStep step={conHtml} value={null} onChange={() => {}} />,
      );

      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('pre code')?.textContent).toBe(conHtml.code);
    });

    it('escapa el marcado que venga dentro de una salida', async () => {
      const base = await predictOutputStepOf(MAP_VS_FOREACH);
      const conHtml: ExerciseStep = {
        ...base,
        options: base.options!.map((o, i) =>
          i === 0 ? { ...o, text: '<img src=x onerror=alert(1)>' } : o,
        ),
      };
      const { container } = render(
        <PredictOutputStep step={conHtml} value={null} onChange={() => {}} />,
      );

      expect(container.querySelector('img')).toBeNull();
      expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    });
  });

  describe('pasos que no puede renderizar', () => {
    it('lanza si el paso no es de tipo predict-output', async () => {
      const session = await repo.getSessionById(MAP_VS_FOREACH);
      const codeReading = session!.steps.find((s) => s.type === 'code-reading')!;
      const consoleError = silenceReactError();

      expect(() =>
        render(<PredictOutputStep step={codeReading} value={null} onChange={() => {}} />),
      ).toThrow(/solo renderiza pasos predict-output/);

      consoleError.mockRestore();
    });

    it('lanza si el paso no declara opciones', async () => {
      const base = await predictOutputStepOf(MAP_VS_FOREACH);
      const sinOpciones: ExerciseStep = { ...base, options: null };
      const consoleError = silenceReactError();

      expect(() =>
        render(<PredictOutputStep step={sinOpciones} value={null} onChange={() => {}} />),
      ).toThrow(/no declara opciones/);

      consoleError.mockRestore();
    });
  });

  describe('funciona con todo el contenido real', () => {
    it('renderiza el paso predict-output de las 6 sesiones', async () => {
      const ids = [
        'js-arrays-filter-mutation-01',
        'js-arrays-map-vs-foreach-01',
        'js-arrays-reduce-accumulator-01',
        'js-functions-default-parameters-01',
        'js-functions-return-flow-01',
        'js-functions-scope-hoisting-01',
      ];

      for (const id of ids) {
        const step = await predictOutputStepOf(id);
        const { unmount } = render(
          <PredictOutputStep step={step} value={null} onChange={() => {}} />,
        );

        expect(screen.getByRole('group', { name: step.prompt })).toBeInTheDocument();
        expect(screen.getAllByRole('radio')).toHaveLength(step.options!.length);

        unmount();
      }
    });
  });
});
