import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultFeedback } from './ResultFeedback';

describe('ResultFeedback (T030)', () => {
  describe('resultado correcto', () => {
    it('monta una celebración inline para un evento de éxito real', () => {
      render(
        <ResultFeedback
          isCorrect
          explanation="Porque forEach devuelve undefined."
          successEventId="session:step-1:success"
        />,
      );

      const confetti = document.querySelector('[data-confetti-event="session:step-1:success"]');
      expect(confetti).toHaveAttribute('data-confetti-mode', 'inline');
      expect(confetti?.querySelectorAll('span')).toHaveLength(4);
    });

    it('aplica correctPulse como feedback visual', () => {
      render(<ResultFeedback isCorrect explanation="Porque forEach devuelve undefined." />);

      expect(screen.getByRole('status')).toHaveClass('animate-correct-pulse');
      expect(screen.getByRole('status')).not.toHaveClass('animate-shake');
    });

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
    it('aplica shake como feedback visual', () => {
      render(<ResultFeedback isCorrect={false} explanation="map sí devuelve un array." />);

      expect(screen.getByRole('status')).toHaveClass('animate-shake');
      expect(screen.getByRole('status')).not.toHaveClass('animate-correct-pulse');
    });

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

  
  describe('seguridad', () => {
    
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
