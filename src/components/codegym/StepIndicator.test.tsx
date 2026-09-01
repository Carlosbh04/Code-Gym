import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { StepIndicator } from './StepIndicator';

const renderIndicator = (total: number, current: number, completed: number) =>
  render(
    <StepIndicator totalSteps={total} currentStep={current} completedSteps={completed} />,
  );

const items = () => within(screen.getByRole('list')).getAllByRole('listitem');

describe('StepIndicator (T029)', () => {
  describe('número de pasos', () => {
    it('renderiza un elemento por paso', () => {
      renderIndicator(4, 0, 0);

      expect(items()).toHaveLength(4);
    });

    it('funciona con una sesión de un solo paso', () => {
      renderIndicator(1, 0, 0);

      expect(items()).toHaveLength(1);
      expect(screen.getByText('Paso 1 de 1')).toBeInTheDocument();
    });

    it('no renderiza nada sin pasos', () => {
      const { container } = renderIndicator(0, 0, 0);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('estado inicial', () => {
    it('el primer paso está en curso y los demás pendientes', () => {
      renderIndicator(4, 0, 0);
      const [primero, ...resto] = items();

      expect(within(primero).getByText('Paso 1: en curso')).toBeInTheDocument();
      for (const [i, li] of resto.entries()) {
        expect(within(li).getByText(`Paso ${i + 2}: pendiente`)).toBeInTheDocument();
      }
    });

    it('muestra la posición legible', () => {
      renderIndicator(4, 0, 0);

      expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument();
    });
  });

  describe('los tres estados', () => {
    it('marca completados, activo y pendientes en la posición correcta', () => {
      renderIndicator(4, 2, 2);
      const li = items();

      expect(within(li[0]).getByText('Paso 1: completado')).toBeInTheDocument();
      expect(within(li[1]).getByText('Paso 2: completado')).toBeInTheDocument();
      expect(within(li[2]).getByText('Paso 3: en curso')).toBeInTheDocument();
      expect(within(li[3]).getByText('Paso 4: pendiente')).toBeInTheDocument();
    });

    it('el paso actual respondido sigue siendo el activo, no un completado más', () => {
      renderIndicator(4, 1, 2);
      const li = items();

      expect(within(li[1]).getByText('Paso 2: en curso')).toBeInTheDocument();
      expect(within(li[2]).getByText('Paso 3: pendiente')).toBeInTheDocument();
    });

    it('al final de la sesión todos menos el actual están completados', () => {
      renderIndicator(4, 3, 3);
      const li = items();

      expect(within(li[0]).getByText('Paso 1: completado')).toBeInTheDocument();
      expect(within(li[2]).getByText('Paso 3: completado')).toBeInTheDocument();
      expect(within(li[3]).getByText('Paso 4: en curso')).toBeInTheDocument();
      expect(screen.getByText('Paso 4 de 4')).toBeInTheDocument();
    });

    it('no inventa un cuarto estado', () => {
      renderIndicator(5, 2, 2);
      const etiquetas = items().map((li) => li.textContent ?? '');

      for (const etiqueta of etiquetas) {
        expect(etiqueta).toMatch(/: (completado|en curso|pendiente)$/);
      }
    });
  });

  describe('accesibilidad', () => {
    it('la lista tiene nombre accesible', () => {
      renderIndicator(3, 1, 1);

      expect(screen.getByRole('list', { name: 'Progreso de la sesión' })).toBeInTheDocument();
    });

    it('solo el paso actual lleva aria-current', () => {
      renderIndicator(4, 2, 2);
      const conCurrent = items().filter((li) => li.getAttribute('aria-current') === 'step');

      expect(conCurrent).toHaveLength(1);
      expect(within(conCurrent[0]).getByText('Paso 3: en curso')).toBeInTheDocument();
    });

    it('el estado no depende solo del color: cada paso lleva texto', () => {
      renderIndicator(3, 1, 1);

      for (const li of items()) {
        expect(li.textContent?.trim().length).toBeGreaterThan(0);
      }
    });

    it('la barra visual queda oculta a lectores de pantalla', () => {
      const { container } = renderIndicator(3, 0, 0);

      expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
    });

    it('el activo se distingue también por altura, no solo por color', () => {
      const { container } = renderIndicator(3, 1, 1);
      const barras = [...container.querySelectorAll('[aria-hidden="true"]')].map((b) => b.className);

      expect(barras[1]).toContain('h-2.5');
      expect(barras[0]).toContain('h-1.5');
      expect(barras[2]).toContain('h-1.5');
    });
  });

  describe('sin interacción no autorizada', () => {
    it('no expone botones ni enlaces: no se puede saltar de paso', () => {
      renderIndicator(4, 1, 1);

      expect(screen.queryAllByRole('button')).toEqual([]);
      expect(screen.queryAllByRole('link')).toEqual([]);
    });

    it('ningún elemento es enfocable', () => {
      const { container } = renderIndicator(4, 1, 1);

      expect(container.querySelectorAll('[tabindex], button, a, input')).toHaveLength(0);
    });
  });

  describe('responsive', () => {
    it('los pasos reparten el ancho en lugar de desbordar', () => {
      const { container } = renderIndicator(12, 5, 5);

      for (const li of container.querySelectorAll('li')) {
        expect(li.className).toContain('flex-1');
        expect(li.className).toContain('min-w-0');
      }
    });
  });
});
