import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeContext } from '@/contexts/theme-context';
import { ThemeMenu } from './ThemeMenu';

describe('ThemeMenu', () => {
  it('expone las tres preferencias como opciones radio accesibles', () => {
    const setPreference = vi.fn();
    render(
      <ThemeContext.Provider value={{ preference: 'system', resolvedTheme: 'dark', setPreference }}>
        <ThemeMenu />
      </ThemeContext.Provider>,
    );

    const trigger = screen.getByRole('button', { name: 'Tema: Sistema. Apariencia oscura' });
    fireEvent.click(trigger);
    expect(screen.getByRole('menu', { name: 'Seleccionar tema' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: /Sistema/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: /Claro/ })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('menuitemradio', { name: /Oscuro/ })).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(screen.getByRole('menuitemradio', { name: /Claro/ }));
    expect(setPreference).toHaveBeenCalledWith('light');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('permite recorrer opciones con teclado y cerrar con Escape', () => {
    render(
      <ThemeContext.Provider value={{ preference: 'system', resolvedTheme: 'light', setPreference: vi.fn() }}>
        <ThemeMenu />
      </ThemeContext.Provider>,
    );

    const trigger = screen.getByRole('button', { name: 'Tema: Sistema. Apariencia clara' });
    fireEvent.click(trigger);
    const system = screen.getByRole('menuitemradio', { name: /Sistema/ });
    const light = screen.getByRole('menuitemradio', { name: /Claro/ });
    expect(system).toHaveFocus();

    fireEvent.keyDown(system, { key: 'ArrowDown' });
    expect(light).toHaveFocus();
    fireEvent.keyDown(light, { key: 'Escape' });
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
