import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ExerciseEngine } from '@/lib/engine/exercise-engine';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import type { TestCase } from '@/types/exercise';
import type { ICodeExecutor } from './ICodeExecutor';
import type { ExecutionResult, TestCaseResult } from './types';

/**
 * T038 entrega un contrato, no una implementación: `WorkerExecutor` es T039 y
 * sus tests de timeout, cola y destroy son T044.
 *
 * Lo que sí se puede demostrar hoy, y es lo que hace este fichero: que el
 * contrato es conforme y transportable por `postMessage`, y que la ejecución
 * de código no vive en ninguna capa que D001 y §15 prohíben.
 *
 * El ejecutor de prueba no sustituye lógica real: a esta altura del roadmap no
 * existe ninguna. Es el testigo de conformidad de una interfaz de TypeScript,
 * que en tiempo de ejecución no deja rastro.
 */

/** Ficheros de código bajo src/, sin tests. */
const sourceFiles = (dir = 'src'): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) return [];
    return [path];
  });

const read = (path: string) => readFileSync(path, 'utf8');

/** Único sitio donde §26 pone `new Function`: el script del worker (T039). */
const WORKER_SCRIPT = 'src/lib/executor/worker-script.ts';

const TEST_CASES: TestCase[] = [
  { input: [1, 2], expected: [2, 4], call: 'dobles(input)', description: 'dobla' },
];

/** Testigo de conformidad: lo mínimo que satisface ICodeExecutor. */
class StubExecutor implements ICodeExecutor {
  destroyed = false;
  lastCode: string | null = null;

  execute(code: string, testCases: TestCase[]): Promise<ExecutionResult> {
    this.lastCode = code;
    const results: TestCaseResult[] = testCases.map((test) => ({
      input: test.input,
      expected: test.expected,
      actual: test.expected,
      pass: true,
    }));
    return Promise.resolve({ pass: results.every((r) => r.pass), results });
  }

  destroy(): void {
    this.destroyed = true;
  }
}

describe('ICodeExecutor (T038)', () => {
  describe('el contrato que fija §26', () => {
    it('execute recibe código y test cases, y devuelve una promesa', async () => {
      const executor = new StubExecutor();

      const promesa = executor.execute('function dobles(a) { return a; }', TEST_CASES);

      expect(promesa).toBeInstanceOf(Promise);
      await expect(promesa).resolves.toMatchObject({ pass: true });
      expect(executor.lastCode).toContain('dobles');
    });

    it('devuelve un resultado por cada test case, en el mismo orden', async () => {
      const casos: TestCase[] = [
        { input: 1, expected: 2, call: 'f(input)', description: 'uno' },
        { input: 2, expected: 4, call: 'f(input)', description: 'dos' },
        { input: 3, expected: 6, call: 'f(input)', description: 'tres' },
      ];

      const { results } = await new StubExecutor().execute('x', casos);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.input)).toEqual([1, 2, 3]);
      expect(results.map((r) => r.expected)).toEqual([2, 4, 6]);
    });

    it('sin test cases resuelve con una lista vacía', async () => {
      const result = await new StubExecutor().execute('x', []);

      expect(result.results).toEqual([]);
      expect(result.pass).toBe(true);
    });

    it('destroy no devuelve nada y es idempotente para quien lo llama', () => {
      const executor = new StubExecutor();

      expect(executor.destroy()).toBeUndefined();
      executor.destroy();

      expect(executor.destroyed).toBe(true);
    });
  });

  describe('el resultado cruza la frontera del worker', () => {
    const conError: ExecutionResult = {
      pass: false,
      results: [
        { input: [1], expected: [2], actual: [2], pass: true },
        {
          input: [3],
          expected: [6],
          actual: null,
          pass: false,
          error: 'dobles is not defined',
        },
      ],
    };

    it('sobrevive al clonado estructurado, que es lo que hace postMessage', () => {
      const copia = structuredClone(conError);

      expect(copia).toEqual(conError);
      expect(copia).not.toBe(conError);
    });

    it('el fallo viaja como mensaje, no como excepción', () => {
      const fallido = conError.results[1];

      expect(typeof fallido.error).toBe('string');
      expect(fallido.error).not.toBeInstanceOf(Error);
      expect(fallido.actual).toBeNull();
      expect(fallido.pass).toBe(false);
    });

    it('el caso que va bien no lleva campo de error', () => {
      expect(conError.results[0].error).toBeUndefined();
    });

    it('pass agrega el veredicto de todos los casos', async () => {
      const { pass, results } = await new StubExecutor().execute('x', TEST_CASES);

      expect(pass).toBe(results.every((r) => r.pass));
      expect(conError.pass).toBe(conError.results.every((r) => r.pass));
    });

    it('un resultado con valores no clonables no es representable por el tipo', () => {
      // El tipo declara `unknown`, así que la garantía es de tiempo de
      // ejecución: lo que el worker no pueda clonar, no llega.
      const noClonable = { pass: true, results: [{ input: () => {}, expected: 1, actual: 1, pass: true }] };

      expect(() => structuredClone(noClonable)).toThrow();
    });
  });

  describe('seguridad: la ejecución no vive donde D001 la prohíbe', () => {
    it('ExerciseEngine no expone ninguna vía para ejecutar código', () => {
      const engine = new ExerciseEngine(new StaticContentRepository());
      const comoRegistro = engine as unknown as Record<string, unknown>;

      // validateFixCode es la única operación del engine que ejecuta, y §41 la
      // asigna a T042. Mientras no exista, el engine no puede ejecutar nada.
      expect(typeof comoRegistro.validateFixCode).toBe('undefined');
      expect(typeof comoRegistro.execute).toBe('undefined');
    });

    it('la capa engine no contiene evaluación dinámica ni crea workers', () => {
      for (const path of sourceFiles('src/lib/engine')) {
        const source = read(path);

        expect(source, path).not.toMatch(/\beval\s*\(/);
        expect(source, path).not.toMatch(/new\s+Function\s*\(/);
        expect(source, path).not.toMatch(/new\s+Worker\s*\(/);
      }
    });

    it('ninguna capa fuera del script del worker evalúa código', () => {
      const infractores = sourceFiles().filter(
        (path) =>
          path !== WORKER_SCRIPT &&
          /\beval\s*\(|new\s+Function\s*\(/.test(read(path)),
      );

      expect(infractores).toEqual([]);
    });

    it('el código del usuario no puede ejecutarse en el hilo de React', () => {
      const ui = [
        ...sourceFiles('src/components'),
        ...sourceFiles('src/features'),
        ...sourceFiles('src/hooks'),
        ...sourceFiles('src/contexts'),
      ];

      for (const path of ui) {
        const source = read(path);

        expect(source, path).not.toMatch(/\beval\s*\(/);
        expect(source, path).not.toMatch(/new\s+Function\s*\(/);
        expect(source, path).not.toMatch(/new\s+Worker\s*\(/);
      }
    });

    it('el ejecutor no conoce React, la interfaz ni el almacenamiento', () => {
      for (const path of sourceFiles('src/lib/executor')) {
        const source = read(path);

        expect(source, path).not.toMatch(/from\s+'react'|from\s+"react"/);
        expect(source, path).not.toMatch(/@\/components|@\/features|@\/hooks|@\/contexts/);
        expect(source, path).not.toMatch(/localStorage|sessionStorage|indexedDB/);
        expect(source, path).not.toMatch(/\bdocument\./);
      }
    });

    it('§15 se respeta: el executor solo depende de tipos del dominio', () => {
      const imports = sourceFiles('src/lib/executor')
        .flatMap((path) => read(path).match(/^import .*$/gm) ?? [])
        .filter((line) => !line.includes("'./"));

      expect(imports).toEqual(["import type { TestCase } from '@/types/exercise';"]);
    });
  });

  describe('ubicación y alcance de T038', () => {
    it('crea exactamente los dos ficheros que §41 marca como suyos', () => {
      const ficheros = readdirSync('src/lib/executor').sort();

      expect(ficheros).toEqual(['ICodeExecutor.test.ts', 'ICodeExecutor.ts', 'types.ts']);
    });

    it('no adelanta WorkerExecutor ni worker-script, que son T039', () => {
      const ficheros = readdirSync('src/lib/executor');

      expect(ficheros).not.toContain('WorkerExecutor.ts');
      expect(ficheros).not.toContain('worker-script.ts');
    });
  });
});
