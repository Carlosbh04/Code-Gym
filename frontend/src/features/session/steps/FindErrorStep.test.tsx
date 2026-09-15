import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import type { FindErrorSelection } from '@/features/session/session-types';
import type { ExerciseStep } from '@/types/exercise';
import { FindErrorStep } from './FindErrorStep';

const repo = new StaticContentRepository();

const findErrorStepOf = async (sessionId: string): Promise<ExerciseStep> => {
  const session = await repo.getSessionById(sessionId);
  return session!.steps.find((s) => s.type === 'find-error')!;
};

const MAP_VS_FOREACH = 'js-arrays-map-vs-foreach-01';
const NADA: FindErrorSelection = { line: null, errorType: null };
const silenceReactError = () => vi.spyOn(console, 'error').mockImplementation(() => {});

const lineGroup = () => screen.getByRole('group', { name: 'Línea del error' });
const typeGroup = () => screen.getByRole('group', { name: 'Tipo de error' });
const lineRadio = (line: number) =>
  within(lineGroup()).getByRole('radio', { name: new RegExp(`^Línea ${line}\\b`) });

describe('FindErrorStep (T032)', () => {
  describe('renderiza el contenido del paso', () => {
    it('muestra el enunciado como etiqueta del paso', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      render(<FindErrorStep step={step} value={NADA} onChange={() => {}} />);

      expect(screen.getByRole('group', { name: step.prompt })).toBeInTheDocument();
    });

    it('separa las dos mitades de la respuesta en dos grupos', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      render(<FindErrorStep step={step} value={NADA} onChange={() => {}} />);

      expect(lineGroup()).toBeInTheDocument();
      expect(typeGroup()).toBeInTheDocument();
    });

    it('ofrece una línea seleccionable por cada línea real del código', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      render(<FindErrorStep step={step} value={NADA} onChange={() => {}} />);

      const lineas = step.code!.split('\n');
      expect(within(lineGroup()).getAllByRole('radio')).toHaveLength(lineas.length);
    });

    it('muestra el texto de cada línea en su fila, numeradas desde 1', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      render(<FindErrorStep step={step} value={NADA} onChange={() => {}} />);

      step.code!.split('\n').forEach((texto, i) => {
        const radio = lineRadio(i + 1);
        if (texto.trim() !== '') {
          expect(radio).toHaveAccessibleName(new RegExp(`^Línea ${i + 1} `));
          expect(radio.closest('label')!.textContent).toContain(texto.trim());
        }
      });
    });

    it('renderiza una opción por cada tipo de error, con su texto', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      render(<FindErrorStep step={step} value={NADA} onChange={() => {}} />);

      const radios = within(typeGroup()).getAllByRole('radio');
      expect(radios).toHaveLength(step.options!.length);
      step.options!.forEach((option) => {
        expect(within(typeGroup()).getByRole('radio', { name: option.text })).toBeInTheDocument();
      });
    });

    it('conserva la indentación del código', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <FindErrorStep step={step} value={NADA} onChange={() => {}} />,
      );

      const indentada = step.code!.split('\n').findIndex((l) => l.startsWith('  '));
      expect(indentada).toBeGreaterThanOrEqual(0);

      const fila = container.querySelectorAll('li')[indentada];
      const texto = fila.querySelector('span:last-child')!;
      expect(texto.textContent).toBe(step.code!.split('\n')[indentada]);
      expect(texto.className).toContain('whitespace-pre-wrap');
    });
  });

  describe('selección de la línea', () => {
    it('ninguna línea está marcada cuando value.line es null', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      render(<FindErrorStep step={step} value={NADA} onChange={() => {}} />);

      within(lineGroup())
        .getAllByRole('radio')
        .forEach((radio) => expect(radio).not.toBeChecked());
    });

    it('marca exactamente la línea que indica value', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      render(
        <FindErrorStep step={step} value={{ line: 3, errorType: null }} onChange={() => {}} />,
      );

      const radios = within(lineGroup()).getAllByRole('radio');
      expect(radios.filter((r) => (r as HTMLInputElement).checked)).toHaveLength(1);
      expect(lineRadio(3)).toBeChecked();
    });

    it('avisa con la línea elegida y conserva el tipo ya elegido', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const onChange = vi.fn();
      render(
        <FindErrorStep
          step={step}
          value={{ line: null, errorType: 'logico' }}
          onChange={onChange}
        />,
      );

      fireEvent.click(lineRadio(2));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ line: 2, errorType: 'logico' });
    });

    it('permite cambiar de línea', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const onChange = vi.fn();
      render(
        <FindErrorStep step={step} value={{ line: 1, errorType: null }} onChange={onChange} />,
      );

      fireEvent.click(lineRadio(4));

      expect(onChange).toHaveBeenCalledWith({ line: 4, errorType: null });
    });
  });

  describe('selección del tipo de error', () => {
    it('ningún tipo está marcado cuando value.errorType es null', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      render(<FindErrorStep step={step} value={NADA} onChange={() => {}} />);

      within(typeGroup())
        .getAllByRole('radio')
        .forEach((radio) => expect(radio).not.toBeChecked());
    });

    it('marca exactamente el tipo que indica value', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const elegido = step.options![2];
      render(
        <FindErrorStep
          step={step}
          value={{ line: null, errorType: elegido.id }}
          onChange={() => {}}
        />,
      );

      const radios = within(typeGroup()).getAllByRole('radio');
      expect(radios.filter((r) => (r as HTMLInputElement).checked)).toHaveLength(1);
      expect(within(typeGroup()).getByRole('radio', { name: elegido.text })).toBeChecked();
    });

    it('avisa con el tipo elegido y conserva la línea ya elegida', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const onChange = vi.fn();
      render(
        <FindErrorStep step={step} value={{ line: 5, errorType: null }} onChange={onChange} />,
      );

      fireEvent.click(within(typeGroup()).getByRole('radio', { name: step.options![1].text }));

      expect(onChange).toHaveBeenCalledWith({ line: 5, errorType: step.options![1].id });
    });
  });

  describe('respuesta compuesta (D014)', () => {
    it('las dos mitades son independientes: elegir una no borra la otra', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const onChange = vi.fn();
      const { rerender } = render(
        <FindErrorStep step={step} value={NADA} onChange={onChange} />,
      );

      fireEvent.click(lineRadio(2));
      const trasLinea = onChange.mock.calls[0][0] as FindErrorSelection;
      expect(trasLinea).toEqual({ line: 2, errorType: null });

      rerender(<FindErrorStep step={step} value={trasLinea} onChange={onChange} />);
      fireEvent.click(within(typeGroup()).getByRole('radio', { name: step.options![0].text }));

      expect(onChange.mock.calls[1][0]).toEqual({
        line: 2,
        errorType: step.options![0].id,
      });
    });

    it('emite la respuesta completa cuando las dos mitades están puestas', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const onChange = vi.fn();
      const completa: FindErrorSelection = {
        line: 2,
        errorType: step.options![0].id,
      };
      render(
        <FindErrorStep
          step={step}
          value={{ line: completa.line, errorType: null }}
          onChange={onChange}
        />,
      );

      fireEvent.click(
        within(typeGroup()).getByRole('radio', {
          name: step.options![0].text,
        }),
      );

      expect(onChange).toHaveBeenCalledWith(completa);
    });

    it('el componente no depende de datos privados de corrección', async () => {
      // Los nombres de grupo salen de useId y cambian entre renders: se
      // normalizan para comparar solo lo que depende del contenido.
      const normaliza = (html: string) => html.replace(/name="[^"]*"/g, 'name="grupo"');

      const base = await findErrorStepOf(MAP_VS_FOREACH);
      const una = render(<FindErrorStep step={base} value={NADA} onChange={() => {}} />);
      const htmlUna = normaliza(una.container.innerHTML);
      una.unmount();

      const varias: ExerciseStep = { ...base, requirements: ['dato público ajeno'] };
      const muchas = render(<FindErrorStep step={varias} value={NADA} onChange={() => {}} />);

      expect(normaliza(muchas.container.innerHTML)).toBe(htmlUna);
    });
  });

  describe('estado deshabilitado', () => {
    it('deshabilita las líneas y los tipos', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      render(<FindErrorStep step={step} value={NADA} onChange={() => {}} disabled />);

      screen.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
    });

    it('no avisa de cambios mientras está deshabilitado', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const onChange = vi.fn();
      render(<FindErrorStep step={step} value={NADA} onChange={onChange} disabled />);

      screen.getAllByRole('radio').forEach((radio) => radio.click());

      expect(onChange).not.toHaveBeenCalled();
    });

    it('conserva visible la respuesta ya elegida', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const elegido = step.options![1];
      render(
        <FindErrorStep
          step={step}
          value={{ line: 2, errorType: elegido.id }}
          onChange={() => {}}
          disabled
        />,
      );

      expect(lineRadio(2)).toBeChecked();
      expect(within(typeGroup()).getByRole('radio', { name: elegido.text })).toBeChecked();
    });
  });

  describe('accesibilidad', () => {
    it('cada grupo tiene nombre accesible y agrupa solo sus radios', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      render(<FindErrorStep step={step} value={NADA} onChange={() => {}} />);

      expect(within(lineGroup()).getAllByRole('radio')).toHaveLength(
        step.code!.split('\n').length,
      );
      expect(within(typeGroup()).getAllByRole('radio')).toHaveLength(step.options!.length);
    });

    it('cada línea se anuncia con su número, no solo con su código', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      render(<FindErrorStep step={step} value={NADA} onChange={() => {}} />);

      step.code!.split('\n').forEach((_, i) => {
        expect(lineRadio(i + 1)).toHaveAccessibleName(new RegExp(`^Línea ${i + 1}\\b`));
      });
    });

    it('el número visible no se duplica para el lector de pantalla', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <FindErrorStep step={step} value={NADA} onChange={() => {}} />,
      );

      const ocultos = container.querySelectorAll('[aria-hidden="true"]');
      expect(ocultos).toHaveLength(step.code!.split('\n').length);
    });

    it('las líneas y los tipos son grupos de radio distintos', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <FindErrorStep step={step} value={NADA} onChange={() => {}} />,
      );

      const nombres = [...container.querySelectorAll('input')].map((i) => i.name);
      expect(new Set(nombres).size).toBe(2);
    });

    it('dos pasos en pantalla no comparten grupos', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <>
          <FindErrorStep step={step} value={NADA} onChange={() => {}} />
          <FindErrorStep step={step} value={NADA} onChange={() => {}} />
        </>,
      );

      const nombres = [...container.querySelectorAll('input')].map((i) => i.name);
      expect(new Set(nombres).size).toBe(4);
    });

    it('los radios son enfocables por teclado', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      render(<FindErrorStep step={step} value={NADA} onChange={() => {}} />);

      const linea = lineRadio(1);
      linea.focus();
      expect(document.activeElement).toBe(linea);

      const tipo = within(typeGroup()).getAllByRole('radio')[0];
      tipo.focus();
      expect(document.activeElement).toBe(tipo);
    });

    it('ninguna fila queda fuera del orden de tabulación', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <FindErrorStep step={step} value={NADA} onChange={() => {}} />,
      );

      for (const input of container.querySelectorAll('input')) {
        expect(input.getAttribute('tabindex')).not.toBe('-1');
      }
    });

    it('el área pulsable de cada fila y cada opción cumple el mínimo de 44px', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <FindErrorStep step={step} value={NADA} onChange={() => {}} />,
      );

      const labels = container.querySelectorAll('label');
      expect(labels.length).toBe(step.code!.split('\n').length + step.options!.length);
      for (const label of labels) {
        expect(label.className).toContain('min-h-11');
      }
    });
  });

  describe('no revela la respuesta correcta', () => {
    it('ni el flag correct ni la explicación llegan al DOM', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <FindErrorStep step={step} value={NADA} onChange={() => {}} />,
      );

      const atributos = [...container.querySelectorAll('*')].flatMap((el) =>
        [...el.attributes].map((a) => `${a.name}=${a.value}`),
      );
      expect(atributos.filter((a) => a.includes('correct'))).toEqual([]);
      expect(atributos.filter((a) => a.startsWith('data-'))).toEqual([]);
      expect(container.textContent).not.toContain('La explicación canónica');
    });

    it('todas las líneas se pintan igual mientras no haya selección', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const { container } = render(
        <FindErrorStep step={step} value={NADA} onChange={() => {}} />,
      );

      const clases = [...within(lineGroup()).getAllByRole('radio')].map(
        (r) => r.closest('label')!.className,
      );
      expect(new Set(clases).size).toBe(1);
      void container;
    });

    it('todos los tipos se pintan igual mientras no haya selección', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      render(<FindErrorStep step={step} value={NADA} onChange={() => {}} />);

      const clases = [...within(typeGroup()).getAllByRole('radio')].map(
        (r) => r.closest('label')!.className,
      );
      expect(new Set(clases).size).toBe(1);
    });
  });

  describe('seguridad: el código se muestra, no se ejecuta', () => {
    it('no ejecuta el código del ejercicio al renderizarlo', async () => {
      const step = await findErrorStepOf(MAP_VS_FOREACH);
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<FindErrorStep step={step} value={NADA} onChange={() => {}} />);

      expect(step.code).toContain('console.log');
      expect(log).not.toHaveBeenCalled();
      log.mockRestore();
    });

    it('escapa el marcado que venga dentro del código', async () => {
      const base = await findErrorStepOf(MAP_VS_FOREACH);
      const conHtml: ExerciseStep = {
        ...base,
        code: 'const x = "<img src=x onerror=alert(1)>";\nconst y = 1;',
      };
      const { container } = render(
        <FindErrorStep step={conHtml} value={NADA} onChange={() => {}} />,
      );

      expect(container.querySelector('img')).toBeNull();
      expect(screen.getByText('const x = "<img src=x onerror=alert(1)>";')).toBeInTheDocument();
    });
  });

  describe('pasos que no puede renderizar', () => {
    it('lanza si el paso no es de tipo find-error', async () => {
      const session = await repo.getSessionById(MAP_VS_FOREACH);
      const codeReading = session!.steps.find((s) => s.type === 'code-reading')!;
      const consoleError = silenceReactError();

      expect(() =>
        render(<FindErrorStep step={codeReading} value={NADA} onChange={() => {}} />),
      ).toThrow(/solo renderiza pasos find-error/);

      consoleError.mockRestore();
    });

    it('lanza si el paso no declara código', async () => {
      const base = await findErrorStepOf(MAP_VS_FOREACH);
      const sinCodigo: ExerciseStep = { ...base, code: null };
      const consoleError = silenceReactError();

      expect(() =>
        render(<FindErrorStep step={sinCodigo} value={NADA} onChange={() => {}} />),
      ).toThrow(/no declara código/);

      consoleError.mockRestore();
    });

    it('lanza si el paso no declara opciones', async () => {
      const base = await findErrorStepOf(MAP_VS_FOREACH);
      const sinOpciones: ExerciseStep = { ...base, options: null };
      const consoleError = silenceReactError();

      expect(() =>
        render(<FindErrorStep step={sinOpciones} value={NADA} onChange={() => {}} />),
      ).toThrow(/no declara opciones/);

      consoleError.mockRestore();
    });
  });

  describe('funciona con todo el contenido real', () => {
    it('renderiza el paso find-error de las 6 sesiones', async () => {
      const ids = [
        'js-arrays-filter-mutation-01',
        'js-arrays-map-vs-foreach-01',
        'js-arrays-reduce-accumulator-01',
        'js-functions-default-parameters-01',
        'js-functions-return-flow-01',
        'js-functions-scope-hoisting-01',
      ];

      for (const id of ids) {
        const step = await findErrorStepOf(id);
        const { unmount } = render(
          <FindErrorStep step={step} value={NADA} onChange={() => {}} />,
        );

        expect(screen.getByRole('group', { name: step.prompt })).toBeInTheDocument();
        expect(within(lineGroup()).getAllByRole('radio')).toHaveLength(
          step.code!.split('\n').length,
        );
        expect(within(typeGroup()).getAllByRole('radio')).toHaveLength(step.options!.length);

        expect(lineRadio(1), `${id}/línea 1`).toBeInTheDocument();

        unmount();
      }
    });
  });
});
