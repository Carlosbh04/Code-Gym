import { describe, expect, it } from 'vitest';
import { getTechnologyIcon, technologyIcons } from './technology-icons';

describe('technology icons', () => {
  it('mapea los seis assets reales incorporados', () => {
    expect(Object.keys(technologyIcons).sort()).toEqual([
      'css',
      'html',
      'javascript',
      'nodejs',
      'react',
      'sql',
    ]);
    expect(getTechnologyIcon('javascript')).toMatch(/javascript\.png$/);
    expect(getTechnologyIcon('HTML')).toMatch(/html\.png$/);
    expect(getTechnologyIcon(' css ')).toMatch(/css\.png$/);
    expect(getTechnologyIcon('react')).toMatch(/icons8-reaccionar-96\.png$/);
    expect(getTechnologyIcon('nodejs')).toMatch(/icons8-nodejs-96\.png$/);
    expect(getTechnologyIcon('sql')).toMatch(/icons8-sql-96\.png$/);
  });

  it('deja que las tecnologías sin asset usen el fallback', () => {
    expect(getTechnologyIcon('python')).toBeUndefined();
    expect(getTechnologyIcon('typescript')).toBeUndefined();
  });
});
