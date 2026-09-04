import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TestCase } from '@/types/exercise';
import { EXECUTION_TIMEOUT_MS, WorkerExecutor } from './WorkerExecutor';
import { WORKER_SCRIPT } from './worker-script';

/**
 * jsdom no implementa Worker ni `URL.createObjectURL`, así que aquí se aportan
 * las dos piezas de plataforma que faltan. Lo que NO se sustituye es la lógica:
 * `FakeWorker` evalúa el `WORKER_SCRIPT` real y habla el protocolo de §26, de
 * modo que estos tests ejercitan el script de verdad.
 *
 * La entrega de mensajes es manual (`FakeWorker.flush()`) porque un Worker real
 * responde de forma asíncrona, y sin ese control no se podrían observar ni la
 * cola FIFO ni el watchdog.
 *
 * El aislamiento auténtico —Worker real, blob URL real, bucle infinito y hilo
 * principal libre— se comprueba en navegador, no aquí.
 */

interface WorkerScope {
  onmessage: ((event: { data: unknown }) => void) | null;
  postMessage: (data: unknown) => void;
}

class FakeWorker {
  static instances: FakeWorker[] = [];
  static deliveries: Array<() => void> = [];

  static reset(): void {
    FakeWorker.instances = [];
    FakeWorker.deliveries = [];
  }

  /** Entrega los mensajes en vuelo, como haría el hilo del worker. */
  static flush(): void {
    const pendientes = FakeWorker.deliveries;
    FakeWorker.deliveries = [];
    for (const deliver of pendientes) deliver();
  }

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  private readonly scope: WorkerScope;

  constructor(readonly url: string) {
    FakeWorker.instances.push(this);

    this.scope = {
      onmessage: null,
      postMessage: (data: unknown) => {
        if (this.terminated) return;
        this.onmessage?.({ data } as MessageEvent);
      },
    };

    // Ejecuta el script real del worker en su propio ámbito.
    new Function('self', WORKER_SCRIPT)(this.scope);
  }

  postMessage(data: unknown): void {
    if (this.terminated) return;

    FakeWorker.deliveries.push(() => {
      if (this.terminated) return;
      try {
        this.scope.onmessage?.({ data });
      } catch (error) {
        this.onerror?.({
          message: error instanceof Error ? error.message : String(error),
        } as ErrorEvent);
      }
    });
  }

  terminate(): void {
    this.terminated = true;
  }
}

const creadas: string[] = [];
const revocadas: string[] = [];
const blobs: Blob[] = [];
const partesDeBlob: unknown[][] = [];
const BlobReal = globalThis.Blob;

/** Blob que recuerda con qué se construyó: jsdom no ofrece Blob.text(). */
class BlobEspia extends BlobReal {
  constructor(parts: BlobPart[], options?: BlobPropertyBag) {
    super(parts, options);
    partesDeBlob.push(parts);
  }
}

const caso = (input: unknown, expected: unknown, call: string): TestCase => ({
  input,
  expected,
  call,
  description: `${call} con ${JSON.stringify(input)}`,
});

const DOBLES = 'function dobles(nums) { return nums.map(function (n) { return n * 2; }); }';

/** Resuelve la ejecución en curso y deja avanzar las promesas. */
const tick = async () => {
  FakeWorker.flush();
  await Promise.resolve();
  await Promise.resolve();
};

describe('WorkerExecutor (T039)', () => {
  let executor: WorkerExecutor;

  beforeEach(() => {
    FakeWorker.reset();
    creadas.length = 0;
    revocadas.length = 0;
    blobs.length = 0;
    partesDeBlob.length = 0;

    vi.stubGlobal('Blob', BlobEspia);
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: (blob: Blob) => {
        blobs.push(blob);
        const url = `blob:fake/${blobs.length}`;
        creadas.push(url);
        return url;
      },
      revokeObjectURL: (url: string) => {
        revocadas.push(url);
      },
    });

    executor = new WorkerExecutor();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('creación del worker', () => {
    it('crea un worker desde una blob URL al construirse', () => {
      expect(FakeWorker.instances).toHaveLength(1);
      expect(creadas).toHaveLength(1);
      expect(FakeWorker.instances[0].url).toBe(creadas[0]);
    });

    it('el blob contiene exactamente el script del worker', () => {
      expect(blobs).toHaveLength(1);
      expect(blobs[0].type).toBe('application/javascript');
      expect(partesDeBlob).toEqual([[WORKER_SCRIPT]]);
    });

    it('el script que se envía al worker es el mismo que se evalúa dentro', () => {
      expect(partesDeBlob[0][0]).toContain('self.onmessage');
      expect(partesDeBlob[0][0]).toContain("data.type !== 'execute'");
      expect(partesDeBlob[0][0]).toContain("type: 'result'");
    });
  });

  describe('ejecución', () => {
    it('resuelve un caso correcto con pass true', async () => {
      const promesa = executor.execute(DOBLES, [caso([1, 2], [2, 4], 'dobles(input)')]);
      await tick();
      const result = await promesa;

      expect(result.pass).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        input: [1, 2],
        expected: [2, 4],
        actual: [2, 4],
        pass: true,
      });
    });

    it('devuelve un resultado por caso y conserva el orden', async () => {
      const casos = [
        caso([1], [2], 'dobles(input)'),
        caso([2], [4], 'dobles(input)'),
        caso([3], [6], 'dobles(input)'),
      ];

      const promesa = executor.execute(DOBLES, casos);
      await tick();
      const { results, pass } = await promesa;

      expect(pass).toBe(true);
      expect(results.map((r) => r.input)).toEqual([[1], [2], [3]]);
      expect(results.map((r) => r.expected)).toEqual([[2], [4], [6]]);
      expect(results.map((r) => r.actual)).toEqual([[2], [4], [6]]);
    });

    it('pass agrega: basta un caso fallido para que sea false', async () => {
      const promesa = executor.execute(DOBLES, [
        caso([1], [2], 'dobles(input)'),
        caso([2], [999], 'dobles(input)'),
      ]);
      await tick();
      const { pass, results } = await promesa;

      expect(pass).toBe(false);
      expect(results.map((r) => r.pass)).toEqual([true, false]);
    });

    it('sin test cases resuelve con lista vacía y pass true', async () => {
      const promesa = executor.execute(DOBLES, []);
      await tick();

      await expect(promesa).resolves.toEqual({ pass: true, results: [] });
    });

    it('espera una Promise devuelta por el ejercicio antes de comparar', async () => {
      const promesa = executor.execute(
        'async function saludar(usuario) { return `Hola, ${usuario.nombre}`; }',
        [caso({ nombre: 'Ada' }, 'Hola, Ada', 'saludar(input)')],
      );
      await tick();

      await expect(promesa).resolves.toMatchObject({
        pass: true,
        results: [{ actual: 'Hola, Ada', pass: true }],
      });
    });
  });

  describe('errores del código del usuario: son resultados, no fallos', () => {
    it('un caso que no coincide falla sin campo error', async () => {
      const promesa = executor.execute(DOBLES, [caso([1], [99], 'dobles(input)')]);
      await tick();
      const { results } = await promesa;

      expect(results[0].pass).toBe(false);
      expect(results[0].actual).toEqual([2]);
      expect(results[0].error).toBeUndefined();
    });

    it('un error de sintaxis llega como error en cada caso', async () => {
      const promesa = executor.execute('function roto( {', [caso([1], [2], 'roto(input)')]);
      await tick();
      const { pass, results } = await promesa;

      expect(pass).toBe(false);
      expect(results[0].pass).toBe(false);
      expect(results[0].actual).toBeNull();
      expect(typeof results[0].error).toBe('string');
      expect(results[0].error).not.toBe('');
    });

    it('un error en ejecución llega como error, con su mensaje', async () => {
      const promesa = executor.execute(
        'function estalla() { throw new Error("boom"); }',
        [caso(null, 1, 'estalla()')],
      );
      await tick();
      const { results } = await promesa;

      expect(results[0].error).toBe('boom');
      expect(results[0].actual).toBeNull();
      expect(results[0].pass).toBe(false);
    });

    it('un caso que falla no impide que los demás se evalúen', async () => {
      const promesa = executor.execute(
        'function medio(n) { if (n === 2) { throw new Error("no"); } return n * 2; }',
        [caso(1, 2, 'medio(input)'), caso(2, 4, 'medio(input)'), caso(3, 6, 'medio(input)')],
      );
      await tick();
      const { results } = await promesa;

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.pass)).toEqual([true, false, true]);
      expect(results[1].error).toBe('no');
    });
  });

  describe('timeout de §25', () => {
    it('corta exactamente a los 3000 ms', async () => {
      vi.useFakeTimers();
      const promesa = executor.execute('function f() { return 1; }', [caso(1, 1, 'f()')]);
      const capturada = promesa.catch((e: Error) => e);

      vi.advanceTimersByTime(EXECUTION_TIMEOUT_MS - 1);
      await Promise.resolve();
      expect(FakeWorker.instances[0].terminated).toBe(false);

      vi.advanceTimersByTime(1);
      const error = await capturada;

      expect(EXECUTION_TIMEOUT_MS).toBe(3000);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/superó el límite de 3000 ms/);
    });

    it('termina el worker, revoca su URL y crea uno nuevo', async () => {
      vi.useFakeTimers();
      const promesa = executor.execute('x', [caso(1, 1, 'f()')]);
      const capturada = promesa.catch(() => null);

      vi.advanceTimersByTime(EXECUTION_TIMEOUT_MS);
      await capturada;

      expect(FakeWorker.instances[0].terminated).toBe(true);
      expect(revocadas).toEqual([creadas[0]]);
      expect(FakeWorker.instances).toHaveLength(2);
      expect(FakeWorker.instances[1].terminated).toBe(false);
    });

    it('no deja trabajo colgado: la siguiente ejecución funciona', async () => {
      vi.useFakeTimers();
      const primera = executor.execute('x', [caso(1, 1, 'f()')]).catch(() => 'timeout');
      vi.advanceTimersByTime(EXECUTION_TIMEOUT_MS);
      expect(await primera).toBe('timeout');

      vi.useRealTimers();
      const segunda = executor.execute(DOBLES, [caso([1], [2], 'dobles(input)')]);
      await tick();

      await expect(segunda).resolves.toMatchObject({ pass: true });
    });

    it('el resultado tardío del worker abandonado no resuelve nada', async () => {
      vi.useFakeTimers();
      const promesa = executor.execute(DOBLES, [caso([1], [2], 'dobles(input)')]);
      const capturada = promesa.catch((e: Error) => e.message);

      vi.advanceTimersByTime(EXECUTION_TIMEOUT_MS);
      expect(await capturada).toMatch(/superó el límite/);

      // El worker viejo intenta responder después de que lo hayan terminado.
      FakeWorker.flush();
      await Promise.resolve();

      await expect(promesa).rejects.toThrow(/superó el límite/);
    });
  });

  describe('cola FIFO de §25', () => {
    it('con dos ejecuciones, la segunda espera a la primera', async () => {
      const orden: string[] = [];
      const p1 = executor.execute(DOBLES, [caso([1], [2], 'dobles(input)')]).then(() => orden.push('a'));
      const p2 = executor.execute(DOBLES, [caso([2], [4], 'dobles(input)')]).then(() => orden.push('b'));

      // Solo hay una ejecución en vuelo: la segunda ni siquiera se ha enviado.
      expect(FakeWorker.deliveries).toHaveLength(1);

      await tick();
      await tick();
      await Promise.all([p1, p2]);

      expect(orden).toEqual(['a', 'b']);
    });

    it('con tres ejecuciones respeta el orden estricto de llegada', async () => {
      const orden: number[] = [];
      const promesas = [0, 1, 2].map((i) =>
        executor
          .execute(DOBLES, [caso([i], [i * 2], 'dobles(input)')])
          .then((r) => {
            orden.push((r.results[0].input as number[])[0]);
            return r;
          }),
      );

      for (let i = 0; i < 3; i++) await tick();
      await Promise.all(promesas);

      expect(orden).toEqual([0, 1, 2]);
    });

    it('nunca hay dos ejecuciones en vuelo a la vez', async () => {
      const enVuelo: number[] = [];
      const promesas = [0, 1, 2].map((i) =>
        executor.execute(DOBLES, [caso([i], [i * 2], 'dobles(input)')]),
      );

      for (let i = 0; i < 3; i++) {
        enVuelo.push(FakeWorker.deliveries.length);
        await tick();
      }
      await Promise.all(promesas);

      expect(enVuelo).toEqual([1, 1, 1]);
    });

    it('una ejecución fallida no bloquea las siguientes', async () => {
      const rota = executor.execute('function roto( {', [caso(1, 1, 'roto(input)')]);
      const buena = executor.execute(DOBLES, [caso([1], [2], 'dobles(input)')]);

      await tick();
      await tick();

      expect((await rota).pass).toBe(false);
      expect((await buena).pass).toBe(true);
    });

    it('un timeout no bloquea la cola: la encolada se ejecuta después', async () => {
      vi.useFakeTimers();
      const primera = executor.execute('x', [caso(1, 1, 'f()')]).catch(() => 'timeout');
      const segunda = executor.execute(DOBLES, [caso([1], [2], 'dobles(input)')]);

      vi.advanceTimersByTime(EXECUTION_TIMEOUT_MS);
      expect(await primera).toBe('timeout');

      vi.useRealTimers();
      await tick();

      await expect(segunda).resolves.toMatchObject({ pass: true });
    });
  });

  describe('destroy', () => {
    it('termina el worker y revoca la blob URL', () => {
      executor.destroy();

      expect(FakeWorker.instances[0].terminated).toBe(true);
      expect(revocadas).toEqual([creadas[0]]);
    });

    it('rechaza la ejecución en curso', async () => {
      const promesa = executor.execute(DOBLES, [caso([1], [2], 'dobles(input)')]);
      executor.destroy();

      await expect(promesa).rejects.toThrow(/se ha destruido/);
    });

    it('rechaza también las que esperaban en la cola', async () => {
      const enCurso = executor.execute(DOBLES, [caso([1], [2], 'dobles(input)')]);
      const encolada = executor.execute(DOBLES, [caso([2], [4], 'dobles(input)')]);

      executor.destroy();

      await expect(enCurso).rejects.toThrow(/se ha destruido/);
      await expect(encolada).rejects.toThrow(/se ha destruido/);
    });

    it('no deja llegar resultados tardíos', async () => {
      const promesa = executor.execute(DOBLES, [caso([1], [2], 'dobles(input)')]);
      const capturada = promesa.catch((e: Error) => e.message);
      executor.destroy();

      FakeWorker.flush();
      await Promise.resolve();

      expect(await capturada).toMatch(/se ha destruido/);
    });

    it('cancela el watchdog al destruir', async () => {
      vi.useFakeTimers();
      const promesa = executor.execute(DOBLES, [caso([1], [2], 'dobles(input)')]);
      const capturada = promesa.catch((e: Error) => e.message);

      executor.destroy();
      vi.advanceTimersByTime(EXECUTION_TIMEOUT_MS * 2);

      expect(await capturada).toMatch(/se ha destruido/);
    });

    it('ejecutar después de destruir se rechaza sin crear worker', async () => {
      executor.destroy();

      await expect(executor.execute(DOBLES, [])).rejects.toThrow(/ya se ha destruido/);
      expect(FakeWorker.instances).toHaveLength(1);
    });

    it('destruir dos veces no rompe ni revoca de más', () => {
      executor.destroy();
      executor.destroy();

      expect(revocadas).toHaveLength(1);
    });
  });

  describe('fallo del worker', () => {
    it('rechaza la ejecución y recrea el worker', async () => {
      const promesa = executor.execute(DOBLES, [caso([1], [2], 'dobles(input)')]);
      const capturada = promesa.catch((e: Error) => e.message);

      FakeWorker.instances[0].onerror?.({ message: 'worker roto' } as ErrorEvent);

      expect(await capturada).toBe('worker roto');
      expect(FakeWorker.instances).toHaveLength(2);
      expect(revocadas).toEqual([creadas[0]]);
    });

    it('tras el fallo, la siguiente ejecución funciona', async () => {
      const rota = executor.execute(DOBLES, [caso([1], [2], 'dobles(input)')]);
      const capturada = rota.catch(() => 'fallo');
      FakeWorker.instances[0].onerror?.({ message: 'x' } as ErrorEvent);
      expect(await capturada).toBe('fallo');

      const buena = executor.execute(DOBLES, [caso([1], [2], 'dobles(input)')]);
      await tick();

      await expect(buena).resolves.toMatchObject({ pass: true });
    });
  });

  describe('validación de mensajes (§26)', () => {
    const enviarAlMain = (data: unknown) => {
      FakeWorker.instances[0].onmessage?.({ data } as MessageEvent);
    };

    it.each([
      ['sin datos', null],
      ['datos no objeto', 'result'],
      ['tipo distinto de result', { type: 'otro', id: '0', results: [] }],
      ['id que no es cadena', { type: 'result', id: 0, results: [] }],
      ['results que no es array', { type: 'result', id: '0', results: 'nada' }],
      ['id que nadie espera', { type: 'result', id: 'desconocido', results: [] }],
    ])('ignora un mensaje %s', async (_nombre, data) => {
      vi.useFakeTimers();
      const promesa = executor.execute(DOBLES, [caso([1], [2], 'dobles(input)')]);
      const capturada = promesa.catch((e: Error) => e.message);

      enviarAlMain(data);
      await Promise.resolve();

      // No resolvió: la ejecución sigue viva hasta que la corta el watchdog.
      vi.advanceTimersByTime(EXECUTION_TIMEOUT_MS);
      expect(await capturada).toMatch(/superó el límite/);
    });
  });

  describe('serialización a través de postMessage', () => {
    it.each([
      ['primitivas', 'function f(n) { return n + 1; }', 1, 2, 'f(input)'],
      ['cadenas', 'function f(s) { return s.toUpperCase(); }', 'ab', 'AB', 'f(input)'],
      ['null', 'function f() { return null; }', 0, null, 'f()'],
      ['arrays', 'function f(a) { return a.concat([3]); }', [1, 2], [1, 2, 3], 'f(input)'],
      ['objetos', 'function f(o) { return { n: o.n * 2 }; }', { n: 2 }, { n: 4 }, 'f(input)'],
      ['booleanos', 'function f() { return true; }', 0, true, 'f()'],
    ])('el resultado con %s cruza y es clonable', async (_n, code, input, expected, call) => {
      const promesa = executor.execute(code, [caso(input, expected, call)]);
      await tick();
      const result = await promesa;

      expect(result.results[0].actual).toEqual(expected);
      expect(result.pass).toBe(true);
      expect(() => structuredClone(result)).not.toThrow();
    });

    it('undefined se compara como el script de §26 define', async () => {
      const promesa = executor.execute('function f() { return undefined; }', [
        caso(0, undefined, 'f()'),
      ]);
      await tick();
      const { results } = await promesa;

      // JSON.stringify(undefined) === JSON.stringify(undefined)
      expect(results[0].pass).toBe(true);
    });

    it('el error viaja como cadena, nunca como Error crudo', async () => {
      const promesa = executor.execute('function f() { throw new TypeError("mal"); }', [
        caso(0, 1, 'f()'),
      ]);
      await tick();
      const { results } = await promesa;

      expect(typeof results[0].error).toBe('string');
      expect(results[0].error).toBe('mal');
      expect(() => structuredClone(results[0])).not.toThrow();
    });

    it('el resultado no lleva más campos que los de D016', async () => {
      const promesa = executor.execute(DOBLES, [caso([1], [2], 'dobles(input)')]);
      await tick();
      const result = await promesa;

      expect(Object.keys(result).sort()).toEqual(['pass', 'results']);
      expect(Object.keys(result.results[0]).sort()).toEqual([
        'actual',
        'expected',
        'input',
        'pass',
      ]);
    });
  });
});
