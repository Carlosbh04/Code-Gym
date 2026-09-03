import { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExerciseCard } from './ExerciseCard';

describe('ExerciseCard (T059)', () => {
  it('envuelve su contenido con la estructura base y el estado default', () => {
    render(
      <main>
        <ExerciseCard className="mt-6">
          <p>Lee el código antes de responder.</p>
        </ExerciseCard>
      </main>,
    );

    const card = screen.getByRole('article', { name: 'Ejercicio actual' });
    expect(card).toHaveAttribute('data-state', 'default');
    expect(card).toHaveClass(
      'min-w-0',
      'animate-fade-in-up',
      'rounded-lg',
      'bg-card',
      'p-4',
      'sm:p-6',
      'mt-6',
    );
    expect(card).toHaveTextContent('Lee el código antes de responder.');
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('comunica el estado respondido sin determinar corrección', () => {
    render(
      <ExerciseCard state="answered">
        <p>Respuesta enviada.</p>
      </ExerciseCard>,
    );

    const card = screen.getByRole('article', { name: 'Ejercicio respondido' });
    expect(card).toHaveAttribute('data-state', 'answered');
    expect(card).not.toHaveTextContent(/correcta|incorrecta/i);
  });

  it('preserva los eventos y el foco de los controles que compone', () => {
    function InteractiveExercise() {
      const [clicks, setClicks] = useState(0);
      const buttonRef = useRef<HTMLButtonElement>(null);

      return (
        <ExerciseCard>
          <button ref={buttonRef} type="button" onClick={() => setClicks((value) => value + 1)}>
            Responder
          </button>
          <button type="button" onClick={() => buttonRef.current?.focus()}>
            Enfocar respuesta
          </button>
          <p>Respuestas: {clicks}</p>
        </ExerciseCard>
      );
    }

    render(<InteractiveExercise />);

    const responder = screen.getByRole('button', { name: 'Responder' });
    fireEvent.click(screen.getByRole('button', { name: 'Enfocar respuesta' }));
    expect(responder).toHaveFocus();
    fireEvent.click(responder);
    expect(screen.getByText('Respuestas: 1')).toBeInTheDocument();
  });
});
