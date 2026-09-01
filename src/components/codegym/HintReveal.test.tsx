import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import { HintReveal } from './HintReveal';

const repo = new StaticContentRepository();
const TRES = ['Revisa qué devuelve el callback', 'forEach no construye nada', 'Usa map'];

const boton = () => screen.getByRole('button');

describe('HintReveal (T033)', () => {
  describe('sin pistas', () => {
    it('no renderiza nada cuando el paso no declara pistas', () => {
      const { container } = render(
        <HintReveal hints={[]} revealedCount={0} onReveal={() => {}} />,
      );

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('una sola pista', () => {
    it('ofrece pedirla y no muestra nada todavía', () => {
      render(<HintReveal hints={['única']} revealedCount={0} onReveal={() => {}} />);

      expect(boton()).toBeEnabled();
      expect(screen.queryByText('única')).toBeNull();
    });

    it('al revelarla se muestra y el botón se agota', () => {
      render(<HintReveal hints={['única']} revealedCount={1} onReveal={() => {}} />);

      expect(screen.getByText('única')).toBeInTheDocument();
      expect(screen.getByText('Pista 1 de 1')).toBeInTheDocument();
      expect(boton()).toBeDisabled();
      expect(boton()).toHaveTextContent('No quedan más pistas');
    });
  });

  describe('varias pistas: una cada vez y en orden', () => {
    it('con ninguna revelada no muestra ninguna', () => {
      render(<HintReveal hints={TRES} revealedCount={0} onReveal={() => {}} />);

      TRES.forEach((h) => expect(screen.queryByText(h)).toBeNull());
      expect(boton()).toHaveTextContent('Ver una pista (3 disponibles)');
    });

    it('muestra exactamente las reveladas, empezando por la primera', () => {
      render(<HintReveal hints={TRES} revealedCount={2} onReveal={() => {}} />);

      expect(screen.getByText(TRES[0])).toBeInTheDocument();
      expect(screen.getByText(TRES[1])).toBeInTheDocument();
      expect(screen.queryByText(TRES[2])).toBeNull();
    });

    it('respeta el orden del array', () => {
      render(<HintReveal hints={TRES} revealedCount={3} onReveal={() => {}} />);

      const textos = screen
        .getAllByRole('listitem')
        .map((li) => li.querySelectorAll('p')[1].textContent);

      expect(textos).toEqual(TRES);
    });

    it('no revela pistas posteriores antes de tiempo', () => {
      for (let revelo = 0; revelo <= TRES.length; revelo++) {
        const { unmount } = render(
          <HintReveal hints={TRES} revealedCount={revelo} onReveal={() => {}} />,
        );

        TRES.forEach((hint, i) => {
          if (i < revelo) expect(screen.getByText(hint)).toBeInTheDocument();
          else expect(screen.queryByText(hint)).toBeNull();
        });

        unmount();
      }
    });

    it('pide una sola pista por pulsación', () => {
      const onReveal = vi.fn();
      render(<HintReveal hints={TRES} revealedCount={1} onReveal={onReveal} />);

      fireEvent.click(boton());

      expect(onReveal).toHaveBeenCalledTimes(1);
      expect(onReveal).toHaveBeenCalledWith();
    });

    it('el contador de la etiqueta refleja las que quedan', () => {
      const etiquetas = [0, 1, 2].map((n) => {
        const { unmount } = render(
          <HintReveal hints={TRES} revealedCount={n} onReveal={() => {}} />,
        );
        const texto = boton().textContent;
        unmount();
        return texto;
      });

      expect(etiquetas).toEqual([
        'Ver una pista (3 disponibles)',
        'Ver otra pista (quedan 2)',
        'Ver otra pista (queda 1)',
      ]);
    });

    it('cada pista se numera sobre el total', () => {
      render(<HintReveal hints={TRES} revealedCount={3} onReveal={() => {}} />);

      expect(screen.getByText('Pista 1 de 3')).toBeInTheDocument();
      expect(screen.getByText('Pista 2 de 3')).toBeInTheDocument();
      expect(screen.getByText('Pista 3 de 3')).toBeInTheDocument();
    });
  });

  describe('nunca revela más de las que existen', () => {
    it('se deshabilita al llegar al final', () => {
      render(<HintReveal hints={TRES} revealedCount={3} onReveal={() => {}} />);

      expect(boton()).toBeDisabled();
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    it('un contador mayor que las pistas no inventa filas', () => {
      render(<HintReveal hints={TRES} revealedCount={99} onReveal={() => {}} />);

      expect(screen.getAllByRole('listitem')).toHaveLength(3);
      expect(boton()).toBeDisabled();
    });

    it('un contador negativo no rompe el render', () => {
      render(<HintReveal hints={TRES} revealedCount={-1} onReveal={() => {}} />);

      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
      expect(boton()).toBeEnabled();
    });

    it('agotadas, pulsar no avisa', () => {
      const onReveal = vi.fn();
      render(<HintReveal hints={TRES} revealedCount={3} onReveal={onReveal} />);

      boton().click();

      expect(onReveal).not.toHaveBeenCalled();
    });
  });

  describe('estado deshabilitado', () => {
    it('no deja pedir más aunque queden', () => {
      const onReveal = vi.fn();
      render(<HintReveal hints={TRES} revealedCount={1} onReveal={onReveal} disabled />);

      expect(boton()).toBeDisabled();
      boton().click();
      expect(onReveal).not.toHaveBeenCalled();
    });

    it('conserva visibles las pistas ya reveladas', () => {
      render(<HintReveal hints={TRES} revealedCount={2} onReveal={() => {}} disabled />);

      expect(screen.getByText(TRES[0])).toBeInTheDocument();
      expect(screen.getByText(TRES[1])).toBeInTheDocument();
    });
  });

  describe('accesibilidad', () => {
    it('el botón tiene un nombre accesible que dice qué hace', () => {
      render(<HintReveal hints={TRES} revealedCount={0} onReveal={() => {}} />);

      expect(boton()).toHaveAccessibleName(/Ver una pista/);
    });

    it('la región de pistas está etiquetada y existe desde el principio', () => {
      render(<HintReveal hints={TRES} revealedCount={0} onReveal={() => {}} />);

      const region = screen.getByRole('region', { name: 'Pistas' });
      expect(within(region).getByRole('list')).toBeInTheDocument();
    });

    it('la lista de pistas es una región viva y educada', () => {
      const { container } = render(
        <HintReveal hints={TRES} revealedCount={1} onReveal={() => {}} />,
      );

      expect(container.querySelector('ol')).toHaveAttribute('aria-live', 'polite');
    });

    it('el orden no depende solo del color: cada pista lleva su número', () => {
      render(<HintReveal hints={TRES} revealedCount={2} onReveal={() => {}} />);

      screen.getAllByRole('listitem').forEach((li, i) => {
        expect(li.textContent).toContain(`Pista ${i + 1} de 3`);
      });
    });

    it('el estado final se comunica con texto, no solo deshabilitando', () => {
      render(<HintReveal hints={TRES} revealedCount={3} onReveal={() => {}} />);

      expect(boton()).toHaveAccessibleName('No quedan más pistas');
    });

    it('el botón es enfocable y se activa con teclado', () => {
      const onReveal = vi.fn();
      render(<HintReveal hints={TRES} revealedCount={0} onReveal={onReveal} />);

      boton().focus();
      expect(document.activeElement).toBe(boton());

      fireEvent.keyDown(boton(), { key: 'Enter' });
      fireEvent.click(boton());
      expect(onReveal).toHaveBeenCalled();
    });

    it('el botón cumple el área mínima de 44px', () => {
      render(<HintReveal hints={TRES} revealedCount={0} onReveal={() => {}} />);

      expect(boton().className).toContain('min-h-11');
    });

    it('el foco es visible', () => {
      render(<HintReveal hints={TRES} revealedCount={0} onReveal={() => {}} />);

      expect(boton().className).toContain('focus-visible:ring-2');
    });
  });

  describe('funciona con el contenido real de T017 y T018', () => {
    it('renderiza las pistas de los 24 pasos, sean las que sean', async () => {
      const ids = [
        'js-arrays-filter-mutation-01',
        'js-arrays-map-vs-foreach-01',
        'js-arrays-reduce-accumulator-01',
        'js-functions-default-parameters-01',
        'js-functions-return-flow-01',
        'js-functions-scope-hoisting-01',
      ];
      let pasos = 0;

      for (const id of ids) {
        const session = await repo.getSessionById(id);

        for (const step of session!.steps) {
          const { unmount } = render(
            <HintReveal
              hints={step.hints}
              revealedCount={step.hints.length}
              onReveal={() => {}}
            />,
          );

          expect(screen.getAllByRole('listitem'), `${id}/${step.id}`).toHaveLength(
            step.hints.length,
          );
          step.hints.forEach((hint) => expect(screen.getByText(hint)).toBeInTheDocument());
          expect(boton()).toBeDisabled();

          pasos += 1;
          unmount();
        }
      }

      expect(pasos).toBe(24);
    });

    it('el número de pistas varía entre pasos y el componente no lo asume', async () => {
      const session = await repo.getSessionById('js-arrays-map-vs-foreach-01');
      const cuentas = new Set(session!.steps.map((s) => s.hints.length));

      expect(cuentas.size).toBeGreaterThan(1);
    });
  });
});
