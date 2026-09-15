import type { DomainImpact } from '@/types/progress';

/**
 * Cálculo del dominio de un concepto (§22, D013).
 *
 * Lógica pura y determinista: sin React, DOM, almacenamiento, red, Worker,
 * repositorios, reloj ni aleatoriedad. Dos entradas iguales producen siempre la
 * misma salida.
 *
 * Esta tarea implementa **solo la parte inequívoca** de §22: la suma ponderada,
 * el redondeo y el recorte. Los cinco factores llegan ya calculados. §22 los
 * describe en una línea cada uno pero no da fórmula para `diffScore`, `recency`
 * ni `consistency`, ni define la ventana de "errores recientes"; además
 * `recency` y `consistency` necesitarían datos que `ConceptProgress` no guarda.
 * Derivarlos queda fuera de T025 hasta que el modelo de progreso los
 * especifique. Ver D013.
 */

/**
 * Los cinco factores de §22, todos en el rango 0..1 y **todos orientados a que
 * 1 sea el mejor valor**.
 *
 * Atención a `errorRate`: contribuye en positivo, igual que los demás. Quien
 * llame debe pasarlo ya orientado (es decir, el complemento de la tasa de
 * error). Pasar la tasa de error en bruto haría que fallar más subiera el
 * dominio.
 */
export interface DomainFactors {
  precision: number;
  errorRate: number;
  diffScore: number;
  recency: number;
  consistency: number;
}

/** Pesos de §22, ajustados por D013. Suman 1. */
const WEIGHTS = {
  precision: 0.35,
  errorRate: 0.25,
  diffScore: 0.2,
  recency: 0.1,
  consistency: 0.1,
} as const;

function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Dominio de un concepto, en la escala 0..100 que documenta
 * `ConceptProgress.domain`.
 *
 * Los factores están en 0..1, así que la suma ponderada también lo está y se
 * escala por 100 antes de redondear. El recorte protege frente a factores fuera
 * de rango.
 */
export function calculateDomain(factors: DomainFactors): number {
  const weightedScore =
    factors.precision * WEIGHTS.precision +
    factors.errorRate * WEIGHTS.errorRate +
    factors.diffScore * WEIGHTS.diffScore +
    factors.recency * WEIGHTS.recency +
    factors.consistency * WEIGHTS.consistency;

  return clamp(0, 100, Math.round(weightedScore * 100));
}

/**
 * Impacto de una sesión sobre el dominio de un concepto. Conserva los dos
 * valores tal cual y expresa la diferencia, que puede ser negativa.
 */
export function calculateDomainImpact(
  previous: number,
  next: number,
): DomainImpact {
  return {
    previousDomain: previous,
    newDomain: next,
    change: next - previous,
  };
}
