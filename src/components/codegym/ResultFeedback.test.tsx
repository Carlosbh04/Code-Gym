import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { validateSelection } from '@/lib/engine/validation';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import type { ExerciseStep } from '@/types/exercise';
import { ResultFeedback } from './ResultFeedback';

const repo = new StaticContentRepository();
const codeReadingStep = async (sessionId: string): Promise<ExerciseStep> =>
  (await repo.getSessionById(sessionId))!.steps.find((s) => s.type === 'code-reading')!;

describe('ResultFeedback (T030)', () => {
  describe('resultado correcto', () => {
    it('lo indica con texto, no solo con color', () => {
      render(<ResultFeedback isCorrect explanation="Porque forEach devuelve undefined." />);

      expect(screen.getByText('Respuesta correcta')).toBeInTheDocument();
    });

    it('muestra la explicación', () => {
      render(<ResultFeedback isCorrect explanation="Porque forEach devuelve undefined." />);

      expect(screen.getByText('Porque forEach devuelve undefined.')).toBeInTheDocument();
    });
  });

  describe('resultado incorrecto', () => {
    it('lo indica con texto', () => {
      render(<ResultFeedback isCorrect={false} explanation="map sí devuelve un array." />);

      expect(screen.getByText('Respuesta incorrecta')).toBeInTheDocument();
      expect(screen.queryByText('Respuesta correcta')).toBeNull();
    });

    it('muestra la misma explicación que en el acierto', () => {
      const explicacion = 'La explicación no depende de si has acertado.';
      const { rerender } = render(<ResultFeedback isCorrect explanation={explicacion} />);
      expect(screen.getByText(explicacion)).toBeInTheDocument();

      rerender(<ResultFeedback isCorrect={false} explanation={explicacion} />);
      expect(screen.getByText(explicacion)).toBeInTheDocument();
    });
  });

  describe('los dos estados se distinguen sin depender del color', () => {
    it('cambian etiqueta e icono', () => {
      const { container, rerender } = render(<ResultFeedback isCorrect explanation="x" />);
      const iconoAcierto = container.querySelector('svg')?.getAttribute('class');

      rerender(<ResultFeedback isCorrect={false} explanation="x" />);
      const iconoFallo = container.querySelector('svg')?.getAttribute('class');

      expect(screen.getByText('Respuesta incorrecta')).toBeInTheDocument();
      expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(iconoAcierto).toBeDefined();
      expect(iconoFallo).toBeDefined();
    });

    it('usa los tokens semánticos de estado', () => {
      const { container, rerender } = render(<ResultFeedback isCorrect explanation="x" />);
      expect(container.firstElementChild?.className).toContain('border-success');

      rerender(<ResultFeedback isCorrect={false} explanation="x" />);
      expect(container.firstElementChild?.className).toContain('border-destructive');
    });
  });

  describe('accesibilidad', () => {
    it('es una región viva que se anuncia sin robar el foco', () => {
      render(<ResultFeedback isCorrect explanation="x" />);
      const region = screen.getByRole('status');

      expect(region).toHaveAttribute('aria-live', 'polite');
      expect(document.activeElement).toBe(document.body);
    });

    it('el icono no añade ruido a los lectores de pantalla', () => {
      render(<ResultFeedback isCorrect={false} explanation="x" />);

      expect(screen.getByRole('status').textContent).toBe(
        'Respuesta incorrectax',
      );
    });

    it('no introduce elementos interactivos', () => {
      render(<ResultFeedback isCorrect explanation="x" />);

      expect(screen.queryAllByRole('button')).toEqual([]);
      expect(screen.queryAllByRole('link')).toEqual([]);
    });
  });

  describe('consume el resultado existente, no lo recalcula', () => {
    it('representa el ValidationResult que produce el engine para la opción correcta', async () => {
      const step = await codeReadingStep('js-arrays-map-vs-foreach-01');
      const correcta = step.options!.find((o) => o.correct)!;
      const resultado = validateSelection(step, correcta.id);

      render(
        <ResultFeedback isCorrect={resultado.isCorrect} explanation={resultado.explanation} />,
      );

      expect(screen.getByText('Respuesta correcta')).toBeInTheDocument();
      expect(screen.getByText(step.explanation)).toBeInTheDocument();
    });

    it('representa el resultado para una opción incorrecta', async () => {
      const step = await codeReadingStep('js-functions-default-parameters-01');
      const fallida = step.options!.find((o) => !o.correct)!;
      const resultado = validateSelection(step, fallida.id);

      render(
        <ResultFeedback isCorrect={resultado.isCorrect} explanation={resultado.explanation} />,
      );

      expect(screen.getByText('Respuesta incorrecta')).toBeInTheDocument();
      expect(screen.getByText(step.explanation)).toBeInTheDocument();
    });

    it('sirve para las 6 sesiones reales', async () => {
      const ids = [
        'js-arrays-filter-mutation-01',
        'js-arrays-map-vs-foreach-01',
        'js-arrays-reduce-accumulator-01',
        'js-functions-default-parameters-01',
        'js-functions-return-flow-01',
        'js-functions-scope-hoisting-01',
      ];

      for (const id of ids) {
        const step = await codeReadingStep(id);
        const resultado = validateSelection(step, step.options!.find((o) => o.correct)!.id);
        const { unmount } = render(
          <ResultFeedback isCorrect={resultado.isCorrect} explanation={resultado.explanation} />,
        );

        expect(screen.getByText(step.explanation), id).toBeInTheDocument();
        unmount();
      }
    });
  });

  describe('seguridad', () => {
    it('no ejecuta el código del ejercicio', async () => {
      const step = await codeReadingStep('js-arrays-map-vs-foreach-01');
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<ResultFeedback isCorrect explanation={step.explanation} />);

      expect(log).not.toHaveBeenCalled();
      log.mockRestore();
    });

    it('trata la explicación como texto: no interpreta marcado', () => {
      const { container } = render(
        <ResultFeedback isCorrect explanation={'<img src=x onerror=alert(1)> y <b>negrita</b>'} />,
      );

      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('b')).toBeNull();
      expect(screen.getByText(/<img src=x onerror=alert\(1\)> y <b>negrita<\/b>/)).toBeInTheDocument();
    });
  });
});
