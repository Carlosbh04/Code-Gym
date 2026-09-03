import { describe, expect, it } from 'vitest';
import { NAV_ITEMS } from './navigation';

describe('NAV_ITEMS', () => {
  it('solo publica destinos globales que pueden resolverse sin una sesión', () => {
    expect(NAV_ITEMS.map(({ label, to }) => ({ label, to }))).toEqual([
      { label: 'Inicio', to: '/' },
      { label: 'Progreso', to: '/dashboard' },
      { label: 'Entrenar', to: '/tech/javascript' },
    ]);
    expect(NAV_ITEMS.some(({ to }) => to === '/review')).toBe(false);
  });
});
