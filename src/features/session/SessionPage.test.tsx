import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ContentProvider } from '@/contexts/ContentContext';
import { ExecutionProvider } from '@/contexts/ExecutionContext';
import { SessionCompletionContext } from '@/contexts/session-completion-context';
import { SessionRecoveryContext } from '@/contexts/session-recovery-context';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import { FakeExecution } from '@/test/fake-execution';
import { FakeSessionCompletion } from '@/test/fake-session-completion';
import { FakeSessionRecoveryStore } from '@/test/fake-session-recovery';
import type { Concept, Technology, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { IContentRepository } from '@/types/repository';
import type { SessionRecoverySnapshot } from '@/lib/recovery/ISessionRecoveryStore';
import SessionPage from './SessionPage';

const SESSION_ID = 'js-arrays-map-vs-foreach-01';
const repo = new StaticContentRepository();
const completion = new FakeSessionCompletion();

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

const renderAt = (
  sessionId: string,
  repository: IContentRepository = repo,
  execution: FakeExecution = new FakeExecution(),
  recovery: FakeSessionRecoveryStore = new FakeSessionRecoveryStore(),
) =>
  render(
    <SessionRecoveryContext.Provider value={recovery}>
      <SessionCompletionContext.Provider value={completion.value}>
        <ContentProvider repository={repository}>
          <ExecutionProvider engine={execution.value}>
            <MemoryRouter initialEntries={[`/practice/${sessionId}`]}>
              <LocationProbe />
              <Routes>
                <Route path="/practice/:sessionId" element={<SessionPage />} />
                <Route path="/" element={<p>inicio</p>} />
              </Routes>
            </MemoryRouter>
          </ExecutionProvider>
        </ContentProvider>
      </SessionCompletionContext.Provider>
    </SessionRecoveryContext.Provider>,
  );

const loaded = async (
  sessionId = SESSION_ID,
  repository: IContentRepository = repo,
  execution: FakeExecution = new FakeExecution(),
  recovery: FakeSessionRecoveryStore = new FakeSessionRecoveryStore(),
) => {
  const view = renderAt(sessionId, repository, execution, recovery);
  await waitFor(() => expect(screen.queryByText(/Cargando la sesión/)).toBeNull());
  return view;
};

const session = async (): Promise<ExerciseSession> =>
  (await repo.getSessionById(SESSION_ID))!;

const recoveryOf = (sessionId = SESSION_ID): SessionRecoverySnapshot => ({
  sessionId,
  currentStep: 0,
  answers: [],
  elapsedMs: 4_000,
  hintsRevealed: [],
  startTime: 1_000,
});

/** Envía la respuesta ya elegida del paso visible y avanza al siguiente. */
const submitAndAdvance = async () => {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Siguiente paso' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));
};

/** Responde el paso find-error visible con la línea y el tipo indicados. */
const chooseError = (line: number, errorTypeText: string) => {
  fireEvent.click(screen.getByRole('radio', { name: new RegExp('^Línea ' + line + '\\b') }));
  fireEvent.click(screen.getByRole('radio', { name: errorTypeText }));
};

/** Responde el paso visible con la opción indicada y avanza al siguiente. */
const answerAndAdvance = async (optionText: string) => {
  fireEvent.click(screen.getByRole('radio', { name: optionText }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Siguiente paso' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));
};

/** Repositorio que falla al leer la sesión, sin ocultar el error. */
const failingRepo: IContentRepository = {
  getTechnologies: () => Promise.resolve([] as Technology[]),
  getTopicsByTechnology: () => Promise.resolve([] as Topic[]),
  getConceptsByTopic: () => Promise.resolve([] as Concept[]),
  getConceptById: () => Promise.resolve(null as Concept | null),
  getSessionsByConcept: () => Promise.resolve([]),
  getSessionById: () => Promise.reject(new Error('el contenido no se pudo leer')),
};

describe('SessionPage (T027)', () => {
  describe('carga', () => {
    it('muestra un estado de carga antes de tener la sesión', async () => {
      renderAt(SESSION_ID);

      expect(screen.getByRole('status')).toHaveTextContent(/Cargando la sesión/);
      await screen.findByRole('heading', { name: /forEach no devuelve/i });
    });

    it('carga una sesión real y muestra su título y posición', async () => {
      await loaded();
      const real = await session();

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(real.title);
      expect(screen.getByText(`Concepto: ${real.conceptId}`)).toBeInTheDocument();
      expect(screen.getByText('Principiante')).toBeInTheDocument();
      expect(screen.getByText(`Paso 1 de ${real.steps.length}`)).toBeInTheDocument();
    });

    it('renderiza el CodeReadingStep del primer paso', async () => {
      await loaded();
      const real = await session();
      const primero = real.steps[0];

      expect(primero.type).toBe('code-reading');
      expect(screen.getByRole('group', { name: primero.prompt })).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(primero.options!.length);
      expect(screen.getByRole('article', { name: 'Ejercicio actual' })).toHaveAttribute(
        'data-state',
        'default',
      );
    });
  });

  describe('errores', () => {
    it('una sesión inexistente muestra el estado vacío con vuelta al inicio', async () => {
      await loaded('js-no-existe-99');

      expect(screen.getByText('No hemos encontrado esta sesión')).toBeInTheDocument();
      expect(screen.getByText(/Sesión no encontrada: js-no-existe-99/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
    });

    it('un fallo del repositorio no se oculta: se muestra su mensaje', async () => {
      await loaded(SESSION_ID, failingRepo);

      expect(screen.getByText('el contenido no se pudo leer')).toBeInTheDocument();
    });

    it('con error no se renderiza ningún paso', async () => {
      await loaded('js-no-existe-99');

      expect(screen.queryByRole('radio')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Comprobar' })).toBeNull();
    });
  });

  describe('flujo de respuesta', () => {
    it('Comprobar está deshabilitado hasta elegir una opción', async () => {
      await loaded();

      expect(screen.getByRole('button', { name: 'Comprobar' })).toBeDisabled();
    });

    it('al elegir una opción se habilita Comprobar', async () => {
      await loaded();
      const real = await session();

      fireEvent.click(screen.getByRole('radio', { name: real.steps[0].options![0].text }));

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled(),
      );
    });

    it('valida con la regla real del engine y bloquea el paso ya respondido', async () => {
      await loaded();
      const real = await session();
      const correcta = real.steps[0].options!.find((o) => o.correct)!;

      fireEvent.click(screen.getByRole('radio', { name: correcta.text }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));

      await waitFor(() => {
        for (const radio of screen.getAllByRole('radio')) {
          expect(radio).toBeDisabled();
        }
      });
      expect(screen.getByRole('button', { name: 'Siguiente paso' })).toBeEnabled();
      expect(screen.getByRole('article', { name: 'Ejercicio respondido' })).toHaveAttribute(
        'data-state',
        'answered',
      );
    });

    it('Siguiente está deshabilitado mientras no se haya respondido', async () => {
      await loaded();

      expect(screen.getByRole('button', { name: 'Siguiente paso' })).toBeDisabled();
    });

    it('avanza al paso siguiente tras responder', async () => {
      await loaded();
      const real = await session();

      fireEvent.click(screen.getByRole('radio', { name: real.steps[0].options![0].text }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Siguiente paso' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

      await waitFor(() =>
        expect(screen.getByText(`Paso 2 de ${real.steps.length}`)).toBeInTheDocument(),
      );
    });

    it('el paso predict-output se responde como cualquier otro (T031)', async () => {
      await loaded();
      const real = await session();
      const predictOutput = real.steps[1];

      await answerAndAdvance(real.steps[0].options![0].text);

      await waitFor(() =>
        expect(screen.getByRole('group', { name: predictOutput.prompt })).toBeInTheDocument(),
      );
      expect(predictOutput.type).toBe('predict-output');
      expect(screen.getAllByRole('radio')).toHaveLength(predictOutput.options!.length);
      expect(screen.getByRole('button', { name: 'Comprobar' })).toBeDisabled();

      fireEvent.click(screen.getByRole('radio', { name: predictOutput.options![0].text }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled(),
      );
    });

    it('el paso find-error exige línea y tipo antes de poder comprobar (T032)', async () => {
      await loaded();
      const real = await session();
      const findError = real.steps[2];

      await answerAndAdvance(real.steps[0].options![0].text);
      await answerAndAdvance(real.steps[1].options![0].text);

      await waitFor(() =>
        expect(screen.getByRole('group', { name: findError.prompt })).toBeInTheDocument(),
      );
      expect(findError.type).toBe('find-error');

      const comprobar = () => screen.getByRole('button', { name: 'Comprobar' });
      expect(comprobar()).toBeDisabled();

      // Solo la línea: sigue sin haber respuesta que enviar.
      fireEvent.click(screen.getByRole('radio', { name: /^Línea 1\b/ }));
      expect(comprobar()).toBeDisabled();

      // Línea + tipo: la respuesta ya está completa.
      fireEvent.click(screen.getByRole('radio', { name: findError.options![0].text }));
      await waitFor(() => expect(comprobar()).toBeEnabled());
    });

    it('find-error acierta solo con la línea y el tipo correctos (T032)', async () => {
      await loaded();
      const real = await session();
      const findError = real.steps[2];
      const correcta = findError.options!.find((o) => o.correct)!;

      await answerAndAdvance(real.steps[0].options![0].text);
      await answerAndAdvance(real.steps[1].options![0].text);
      await waitFor(() =>
        expect(screen.getByRole('group', { name: findError.prompt })).toBeInTheDocument(),
      );

      chooseError(findError.errorLines![0], correcta.text);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled(),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));

      await waitFor(() =>
        expect(screen.getByText('Respuesta correcta')).toBeInTheDocument(),
      );
    });

    it('find-error falla si la línea es correcta pero el tipo no (T032)', async () => {
      await loaded();
      const real = await session();
      const findError = real.steps[2];
      const incorrecta = findError.options!.find((o) => !o.correct)!;

      await answerAndAdvance(real.steps[0].options![0].text);
      await answerAndAdvance(real.steps[1].options![0].text);
      await waitFor(() =>
        expect(screen.getByRole('group', { name: findError.prompt })).toBeInTheDocument(),
      );

      chooseError(findError.errorLines![0], incorrecta.text);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled(),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));

      await waitFor(() =>
        expect(screen.getByText('Respuesta incorrecta')).toBeInTheDocument(),
      );
    });

    /** Avanza hasta el cuarto paso, que es el de fix-code. Requiere `loaded()`. */
    const llegarAFixCode = async () => {
      const real = await session();
      const findError = real.steps[2];

      await answerAndAdvance(real.steps[0].options![0].text);
      await answerAndAdvance(real.steps[1].options![0].text);
      await waitFor(() =>
        expect(screen.getByRole('group', { name: findError.prompt })).toBeInTheDocument(),
      );
      chooseError(findError.errorLines![0], findError.options!.find((o) => o.correct)!.text);
      await submitAndAdvance();

      const fixCode = real.steps[3];
      await waitFor(() =>
        expect(screen.getByRole('group', { name: fixCode.prompt })).toBeInTheDocument(),
      );
      return fixCode;
    };

    /** Pone el editor en modo texto y escribe la solución dada. */
    const escribirCodigo = async (codigo: string) => {
      fireEvent.click(
        await screen.findByRole('button', { name: 'Usar editor de texto simple' }),
      );
      fireEvent.change(screen.getByRole('textbox'), { target: { value: codigo } });
    };

    const SOLUCION = 'function dobles(numeros) {\n  return numeros.map((n) => n * 2);\n}';

    it('el paso fix-code muestra el editor con el código del ejercicio (T041)', async () => {
      await loaded();
      const fixCode = await llegarAFixCode();

      expect(fixCode.type).toBe('fix-code');
      await waitFor(() => expect(document.querySelector('.cm-editor')).not.toBeNull());
      expect(screen.getByRole('textbox')).toHaveAccessibleName('Editor de código');
      expect(document.body.textContent).toContain('numeros.forEach');
    });

    it('ya no queda ningún tipo de paso sin implementar', async () => {
      await loaded();
      await llegarAFixCode();

      expect(screen.queryByText(/todavía no están disponibles/)).toBeNull();
    });

    it('en fix-code Comprobar ejecuta el código y muestra el veredicto del engine (T045.1)', async () => {
      const execution = new FakeExecution();
      execution.resuelve(true);
      await loaded(SESSION_ID, repo, execution);
      await llegarAFixCode();

      await escribirCodigo(SOLUCION);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));

      await waitFor(() => expect(screen.getByText('Respuesta correcta')).toBeInTheDocument());
      expect(execution.llamadas).toHaveLength(1);
      expect(execution.llamadas[0].userCode).toBe(SOLUCION);
      expect(execution.llamadas[0].step.id).toBe('step-4');
    });

    it('Ejecutar tests muestra el resultado real sin completar el paso', async () => {
      const execution = new FakeExecution();
      execution.resuelve(true);
      await loaded(SESSION_ID, repo, execution);
      await llegarAFixCode();

      await escribirCodigo(SOLUCION);
      fireEvent.click(screen.getByRole('button', { name: 'Ejecutar tests' }));

      await waitFor(() => expect(screen.getByText('Todos los tests han pasado.')).toBeInTheDocument());
      expect(screen.queryByText('Respuesta correcta')).toBeNull();
      expect(screen.getByRole('button', { name: 'Terminar sesión' })).toBeDisabled();
      expect(execution.llamadas).toHaveLength(1);
    });

    it('un código que no pasa los test cases muestra resultados y permite corregir', async () => {
      const execution = new FakeExecution();
      execution.resuelve(false);
      await loaded(SESSION_ID, repo, execution);
      await llegarAFixCode();

      await escribirCodigo(SOLUCION);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));

      await waitFor(() => expect(screen.getByText('Resultados de tests')).toBeInTheDocument());
      expect(screen.getByText('Expected')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Editor de código' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Terminar sesión' })).toBeDisabled();
    });

    it('mientras ejecuta muestra «Ejecutando…», lo bloquea y no admite doble envío', async () => {
      const execution = new FakeExecution();
      execution.diferir();
      await loaded(SESSION_ID, repo, execution);
      await llegarAFixCode();

      await escribirCodigo(SOLUCION);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));

      const ejecutando = await screen.findByRole('button', { name: 'Ejecutando…' });
      expect(ejecutando).toBeDisabled();
      expect(ejecutando).toHaveAttribute('aria-busy', 'true');
      expect(execution.llamadas).toHaveLength(1);

      // Un segundo clic no reenvía: la validación en curso lo impide.
      fireEvent.click(ejecutando);
      expect(execution.llamadas).toHaveLength(1);

      act(() => execution.resolverDiferido(true));
      await waitFor(() => expect(screen.getByText('Respuesta correcta')).toBeInTheDocument());
    });

    it('un fallo de ejecución es recuperable: aviso con Reintentar y sin contar como respuesta', async () => {
      const execution = new FakeExecution();
      execution.rechaza('La ejecución superó el límite de 3000 ms');
      await loaded(SESSION_ID, repo, execution);
      await llegarAFixCode();

      await escribirCodigo(SOLUCION);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));

      // §27: el timeout no es una respuesta incorrecta, es un error reintentable.
      const aviso = await screen.findByRole('alert');
      expect(aviso).toHaveTextContent('No se pudo ejecutar: La ejecución superó el límite de 3000 ms');
      expect(screen.queryByText('Respuesta incorrecta')).toBeNull();
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();

      // El reintento sí llega a veredicto y limpia el aviso.
      execution.resuelve(true);
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

      await waitFor(() => expect(screen.getByText('Respuesta correcta')).toBeInTheDocument());
      expect(screen.queryByRole('alert')).toBeNull();
      expect(execution.llamadas).toHaveLength(2);
    });

    it('lo que se escribe en el editor se conserva', async () => {
      await loaded();
      await llegarAFixCode();

      await escribirCodigo('const mio = 1;');

      await waitFor(() =>
        expect(screen.getByRole('textbox')).toHaveValue('const mio = 1;'),
      );
    });

    it('el editor no ejecuta el código del ejercicio', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      await loaded();
      await llegarAFixCode();

      expect(log).not.toHaveBeenCalled();
      log.mockRestore();
    });
  });

  describe('pistas (T033)', () => {
    const pedirPista = () => screen.getByRole('button', { name: /pista/i });

    it('ofrece las pistas del paso actual sin revelarlas', async () => {
      await loaded();
      const real = await session();
      const step = real.steps[0];

      expect(screen.getByRole('region', { name: 'Pistas' })).toBeInTheDocument();
      expect(pedirPista()).toBeEnabled();
      step.hints.forEach((h) => expect(screen.queryByText(h)).toBeNull());
    });

    it('las revela de una en una y en orden', async () => {
      await loaded();
      const real = await session();
      const hints = real.steps[0].hints;

      for (let i = 0; i < hints.length; i += 1) {
        fireEvent.click(pedirPista());
        await waitFor(() => expect(screen.getByText(hints[i])).toBeInTheDocument());

        // Ninguna posterior se ha adelantado.
        hints.slice(i + 1).forEach((h) => expect(screen.queryByText(h)).toBeNull());
      }
    });

    it('al agotarlas el botón se deshabilita', async () => {
      await loaded();
      const real = await session();

      for (let i = 0; i < real.steps[0].hints.length; i += 1) {
        fireEvent.click(pedirPista());
      }

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'No quedan más pistas' })).toBeDisabled(),
      );
    });

    it('tras responder ya no se piden pistas', async () => {
      await loaded();
      const real = await session();

      fireEvent.click(screen.getByRole('radio', { name: real.steps[0].options![0].text }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));

      await waitFor(() => expect(pedirPista()).toBeDisabled());
    });

    it('al pasar de paso las pistas vuelven a empezar', async () => {
      await loaded();
      const real = await session();
      const primeras = real.steps[0].hints;

      fireEvent.click(pedirPista());
      await waitFor(() => expect(screen.getByText(primeras[0])).toBeInTheDocument());

      await answerAndAdvance(real.steps[0].options![0].text);

      await waitFor(() =>
        expect(screen.getByRole('group', { name: real.steps[1].prompt })).toBeInTheDocument(),
      );
      expect(screen.queryByText(primeras[0])).toBeNull();
      expect(pedirPista()).toBeEnabled();
      real.steps[1].hints.forEach((h) => expect(screen.queryByText(h)).toBeNull());
    });
  });

  describe('accesibilidad', () => {
    it('aporta un único h1 y ningún landmark main propio', async () => {
      const { container } = await loaded();

      expect(container.querySelectorAll('h1')).toHaveLength(1);
      expect(container.querySelectorAll('main')).toHaveLength(0);
    });

    it('los botones cumplen el área mínima de 44px', async () => {
      const { container } = await loaded();

      for (const button of container.querySelectorAll('button')) {
        expect(button.className).toContain('min-h-11');
      }
    });

    it('los radios son enfocables, y los botones en cuanto se habilitan', async () => {
      await loaded();
      const real = await session();

      // De inicio ambos botones están deshabilitados, así que no son
      // enfocables: lo alcanzable por teclado son las opciones.
      const radio = screen.getByRole('radio', { name: real.steps[0].options![0].text });
      radio.focus();
      expect(document.activeElement).toBe(radio);

      fireEvent.click(radio);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());

      const comprobar = screen.getByRole('button', { name: 'Comprobar' });
      comprobar.focus();
      expect(document.activeElement).toBe(comprobar);
    });

    it('el estado de carga se anuncia', async () => {
      renderAt(SESSION_ID);

      expect(screen.getByRole('status')).toBeInTheDocument();
      await screen.findByRole('heading', { name: /forEach no devuelve/i });
    });
  });

  describe('seguridad', () => {
    it('no ejecuta el código del ejercicio', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      await loaded();
      const real = await session();

      expect(real.steps[0].code).toContain('console.log');
      expect(log).not.toHaveBeenCalled();
      log.mockRestore();
    });
  });

  describe('integración con StepIndicator y ResultFeedback (T029/T030)', () => {
    it('muestra el indicador de pasos con el primero en curso', async () => {
      await loaded();
      const real = await session();
      const lista = screen.getByRole('list', { name: 'Progreso de la sesión' });

      expect(within(lista).getAllByRole('listitem')).toHaveLength(real.steps.length);
      expect(within(lista).getByText('Paso 1: en curso')).toBeInTheDocument();
      expect(screen.getByText(`Paso 1 de ${real.steps.length}`)).toBeInTheDocument();
    });

    it('no muestra feedback antes de responder', async () => {
      await loaded();

      expect(screen.queryByText('Respuesta correcta')).toBeNull();
      expect(screen.queryByText('Respuesta incorrecta')).toBeNull();
    });

    it('tras acertar muestra el feedback correcto con la explicación real', async () => {
      await loaded();
      const real = await session();
      const correcta = real.steps[0].options!.find((o) => o.correct)!;

      fireEvent.click(screen.getByRole('radio', { name: correcta.text }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));

      await waitFor(() => expect(screen.getByText('Respuesta correcta')).toBeInTheDocument());
      expect(screen.getByText(real.steps[0].explanation)).toBeInTheDocument();
    });

    it('tras fallar muestra el feedback incorrecto con la misma explicación', async () => {
      await loaded();
      const real = await session();
      const fallida = real.steps[0].options!.find((o) => !o.correct)!;

      fireEvent.click(screen.getByRole('radio', { name: fallida.text }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));

      await waitFor(() => expect(screen.getByText('Respuesta incorrecta')).toBeInTheDocument());
      expect(screen.getByText(real.steps[0].explanation)).toBeInTheDocument();
    });

    it('el indicador avanza al pasar de paso y marca el anterior completado', async () => {
      await loaded();
      const real = await session();

      fireEvent.click(screen.getByRole('radio', { name: real.steps[0].options![0].text }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Siguiente paso' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

      await waitFor(() => {
        const lista = screen.getByRole('list', { name: 'Progreso de la sesión' });
        expect(within(lista).getByText('Paso 1: completado')).toBeInTheDocument();
        expect(within(lista).getByText('Paso 2: en curso')).toBeInTheDocument();
      });
    });

    it('el feedback desaparece al avanzar al paso siguiente', async () => {
      await loaded();
      const real = await session();

      fireEvent.click(screen.getByRole('radio', { name: real.steps[0].options![0].text }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
      await waitFor(() => expect(screen.getByText(real.steps[0].explanation)).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

      await waitFor(() => expect(screen.queryByText(real.steps[0].explanation)).toBeNull());
    });

    it('el indicador no permite saltar de paso', async () => {
      await loaded();
      const lista = screen.getByRole('list', { name: 'Progreso de la sesión' });

      expect(within(lista).queryAllByRole('button')).toEqual([]);
      expect(within(lista).queryAllByRole('link')).toEqual([]);
    });
  });
});

describe('SessionPage · recovery (T052)', () => {
  it('muestra la decisión canónica antes de renderizar o sobrescribir la sesión', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.snapshot = recoveryOf();
    renderAt(SESSION_ID, repo, new FakeExecution(), recovery);

    expect(
      await screen.findByRole('heading', { name: 'Tienes una sesión incompleta' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Empezar de nuevo' })).toBeEnabled();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continuar' }));
    expect(recovery.saves).toHaveLength(0);
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('continúa el sessionId almacenado y navega a él si la URL era distinta', async () => {
    const requested = 'js-functions-return-flow-01';
    const recovery = new FakeSessionRecoveryStore();
    recovery.snapshot = recoveryOf(SESSION_ID);
    renderAt(requested, repo, new FakeExecution(), recovery);

    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }));

    await screen.findByRole('heading', { name: /forEach no devuelve/i });
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/practice/${SESSION_ID}`,
    );
    expect(recovery.clearCalls).toBe(0);
  });

  it('Empezar de nuevo descarta explícitamente el recovery anterior y conserva la URL solicitada', async () => {
    const requested = 'js-functions-return-flow-01';
    const recovery = new FakeSessionRecoveryStore();
    recovery.snapshot = recoveryOf(SESSION_ID);
    renderAt(requested, repo, new FakeExecution(), recovery);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Empezar de nuevo' }),
    );

    await screen.findByRole('heading', { name: /Salir de una función/i });
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/practice/${requested}`,
    );
    expect(recovery.clearCalls).toBe(1);
    await waitFor(() => expect(recovery.snapshot?.sessionId).toBe(requested));
  });

  it('INVALID_JSON muestra error page y no ofrece descarte parcial', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.loadError = 'INVALID_JSON';
    renderAt(SESSION_ID, repo, new FakeExecution(), recovery);

    expect(
      await screen.findByRole('heading', {
        name: 'No se pudo leer la sesión guardada',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('JSON inválido');
    expect(screen.queryByRole('button', { name: 'Empezar de nuevo' })).toBeNull();
    expect(recovery.clearCalls).toBe(0);
  });

  it('RECOVERY_FAILED permite empezar de nuevo sin restauración parcial', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.loadError = 'RECOVERY_FAILED';
    renderAt(SESSION_ID, repo, new FakeExecution(), recovery);

    expect(await screen.findByText('No se pudo recuperar')).toBeInTheDocument();
    recovery.loadError = null;
    fireEvent.click(screen.getByRole('button', { name: 'Empezar de nuevo' }));

    await screen.findByRole('heading', { name: /forEach no devuelve/i });
    expect(recovery.clearCalls).toBe(1);
  });

  it('avisa de STORAGE_UNAVAILABLE sin bloquear la práctica ni ofrecer retry', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.loadError = 'STORAGE_UNAVAILABLE';
    renderAt(SESSION_ID, repo, new FakeExecution(), recovery);

    await screen.findByRole('heading', { name: /forEach no devuelve/i });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La sesión continuará en memoria',
    );
    expect(screen.queryByRole('button', { name: 'Reintentar guardado' })).toBeNull();
  });

  it('avisa de STORAGE_FULL y conecta el retry de persistencia', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.saveError = 'STORAGE_FULL';
    renderAt(SESSION_ID, repo, new FakeExecution(), recovery);

    const retry = await screen.findByRole('button', {
      name: 'Reintentar guardado',
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tu estado sigue en memoria',
    );

    recovery.saveError = null;
    fireEvent.click(retry);
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(recovery.snapshot?.sessionId).toBe(SESSION_ID);
  });
});
