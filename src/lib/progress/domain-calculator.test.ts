import { describe, expect, it } from 'vitest';
import type { DomainImpact } from '@/types/progress';
import {
  calculateDomain,
  calculateDomainImpact,
  type DomainFactors,
} from './domain-calculator';

const factors = (
  precision: number,
  errorRate: number,
  diffScore: number,
  recency: number,
  consistency: number,
): DomainFactors => ({ precision, errorRate, diffScore, recency, consistency });

const all = (v: number): DomainFactors => factors(v, v, v, v, v);

/** Segunda implementación literal de §22/D013, para detectar transposiciones. */
const referencia = (f: DomainFactors): number =>
  Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (f.precision * 0.35 +
          f.errorRate * 0.25 +
          f.diffScore * 0.2 +
          f.recency * 0.1 +
          f.consistency * 0.1) *
          100,
      ),
    ),
  );

describe('calculateDomain (T025)', () => {
  describe('extremos', () => {
    it('todos los factores a 0 → 0', () => {
      expect(calculateDomain(all(0))).toBe(0);
    });

    it('todos los factores a 1 → 100', () => {
      expect(calculateDomain(all(1))).toBe(100);
    });

    it('todos los factores a 0.5 → 50', () => {
      expect(calculateDomain(all(0.5))).toBe(50);
    });
  });

  describe('peso exacto de cada factor', () => {
    it('precision aporta 35', () => {
      expect(calculateDomain(factors(1, 0, 0, 0, 0))).toBe(35);
    });

    it('errorRate aporta 25', () => {
      expect(calculateDomain(factors(0, 1, 0, 0, 0))).toBe(25);
    });

    it('diffScore aporta 20', () => {
      expect(calculateDomain(factors(0, 0, 1, 0, 0))).toBe(20);
    });

    it('recency aporta 10', () => {
      expect(calculateDomain(factors(0, 0, 0, 1, 0))).toBe(10);
    });

    it('consistency aporta 10', () => {
      expect(calculateDomain(factors(0, 0, 0, 0, 1))).toBe(10);
    });

    it('los cinco aportes suman exactamente 100', () => {
      const aportes = [
        calculateDomain(factors(1, 0, 0, 0, 0)),
        calculateDomain(factors(0, 1, 0, 0, 0)),
        calculateDomain(factors(0, 0, 1, 0, 0)),
        calculateDomain(factors(0, 0, 0, 1, 0)),
        calculateDomain(factors(0, 0, 0, 0, 1)),
      ];

      expect(aportes).toEqual([35, 25, 20, 10, 10]);
      expect(aportes.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it('los pesos no están transpuestos: precision pesa más que errorRate, y este más que diffScore', () => {
      expect(calculateDomain(factors(1, 0, 0, 0, 0))).toBeGreaterThan(
        calculateDomain(factors(0, 1, 0, 0, 0)),
      );
      expect(calculateDomain(factors(0, 1, 0, 0, 0))).toBeGreaterThan(
        calculateDomain(factors(0, 0, 1, 0, 0)),
      );
      expect(calculateDomain(factors(0, 0, 1, 0, 0))).toBeGreaterThan(
        calculateDomain(factors(0, 0, 0, 1, 0)),
      );
      expect(calculateDomain(factors(0, 0, 0, 1, 0))).toBe(
        calculateDomain(factors(0, 0, 0, 0, 1)),
      );
    });
  });

  describe('valores intermedios', () => {
    it('0.8 / 0.6 / 0.4 / 0.2 / 0 → 53', () => {
      // 0.28 + 0.15 + 0.08 + 0.02 + 0 = 0.53
      expect(calculateDomain(factors(0.8, 0.6, 0.4, 0.2, 0))).toBe(53);
    });

    it('solo precision alta con el resto a cero → 35', () => {
      expect(calculateDomain(factors(0.99, 0, 0, 0, 0))).toBe(35);
    });

    it('un usuario realista: 0.9 / 0.85 / 0.5 / 0.7 / 0.4 → 73', () => {
      // 0.315 + 0.2125 + 0.10 + 0.07 + 0.04 = 0.7375 → 73.75 → 74
      expect(calculateDomain(factors(0.9, 0.85, 0.5, 0.7, 0.4))).toBe(74);
    });
  });

  describe('redondeo', () => {
    it('redondea 42.5 hacia arriba', () => {
      // 1*0.35 + 0.75*0.10 = 0.425 → 42.5 → 43
      expect(calculateDomain(factors(1, 0, 0, 0.75, 0))).toBe(43);
    });

    it('redondea 42.4 hacia abajo', () => {
      // 1*0.35 + 0.74*0.10 = 0.424 → 42.4 → 42
      expect(calculateDomain(factors(1, 0, 0, 0.74, 0))).toBe(42);
    });

    it('devuelve siempre un entero', () => {
      for (const v of [0.111, 0.333, 0.777, 0.999]) {
        expect(Number.isInteger(calculateDomain(all(v)))).toBe(true);
      }
    });
  });

  describe('clamp', () => {
    it('recorta por arriba con factores fuera de rango', () => {
      expect(calculateDomain(all(2))).toBe(100);
      expect(calculateDomain(factors(10, 10, 10, 10, 10))).toBe(100);
    });

    it('recorta por abajo con factores negativos', () => {
      expect(calculateDomain(all(-1))).toBe(0);
      expect(calculateDomain(factors(-5, 0, 0, 0, 0))).toBe(0);
    });

    it('un factor negativo compensado sigue dentro de rango', () => {
      // 1*0.35 + (-1)*0.25 = 0.10 → 10
      expect(calculateDomain(factors(1, -1, 0, 0, 0))).toBe(10);
    });
  });

  describe('barrido contra una implementación de referencia', () => {
    it('coincide en 3125 combinaciones de los cinco factores', () => {
      const valores = [0, 0.25, 0.5, 0.75, 1];
      let comprobadas = 0;

      for (const p of valores)
        for (const e of valores)
          for (const d of valores)
            for (const r of valores)
              for (const c of valores) {
                const f = factors(p, e, d, r, c);
                expect(calculateDomain(f), JSON.stringify(f)).toBe(referencia(f));
                comprobadas += 1;
              }

      expect(comprobadas).toBe(3125);
    });

    it('el resultado nunca sale de 0..100 en el barrido', () => {
      for (const v of [-1, 0, 0.5, 1, 2]) {
        const d = calculateDomain(all(v));
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('pureza', () => {
    it('no muta los factores recibidos', () => {
      const f = factors(0.8, 0.6, 0.4, 0.2, 0.1);
      const antes = JSON.stringify(f);

      calculateDomain(f);

      expect(JSON.stringify(f)).toBe(antes);
    });

    it('es determinista', () => {
      const f = factors(0.42, 0.13, 0.99, 0.5, 0.77);

      expect(calculateDomain(f)).toBe(calculateDomain(f));
      expect(calculateDomain(f)).toBe(calculateDomain({ ...f }));
    });
  });
});

describe('calculateDomainImpact (T025)', () => {
  it('construye el objeto con los tres campos de DomainImpact', () => {
    const impact = calculateDomainImpact(40, 55);

    expect(Object.keys(impact).sort()).toEqual([
      'change',
      'newDomain',
      'previousDomain',
    ]);
    expect(impact).toEqual({ previousDomain: 40, newDomain: 55, change: 15 });
  });

  it('conserva previous y next exactamente', () => {
    const impact: DomainImpact = calculateDomainImpact(37, 91);

    expect(impact.previousDomain).toBe(37);
    expect(impact.newDomain).toBe(91);
  });

  it('el cambio es negativo cuando el dominio baja', () => {
    expect(calculateDomainImpact(70, 62).change).toBe(-8);
  });

  it('el cambio es cero cuando no varía', () => {
    expect(calculateDomainImpact(50, 50).change).toBe(0);
  });

  it('funciona en los extremos de la escala', () => {
    expect(calculateDomainImpact(0, 100)).toEqual({
      previousDomain: 0,
      newDomain: 100,
      change: 100,
    });
    expect(calculateDomainImpact(100, 0)).toEqual({
      previousDomain: 100,
      newDomain: 0,
      change: -100,
    });
  });

  it('encadena con calculateDomain', () => {
    const previo = calculateDomain(all(0.5));
    const nuevo = calculateDomain(all(0.75));

    expect(calculateDomainImpact(previo, nuevo)).toEqual({
      previousDomain: 50,
      newDomain: 75,
      change: 25,
    });
  });

  it('devuelve un objeto nuevo en cada llamada y es determinista', () => {
    expect(calculateDomainImpact(10, 20)).not.toBe(calculateDomainImpact(10, 20));
    expect(calculateDomainImpact(10, 20)).toEqual(calculateDomainImpact(10, 20));
  });
});
