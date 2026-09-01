import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ContentProvider } from '@/contexts/ContentContext';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import type { Concept, Technology, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { IContentRepository } from '@/types/repository';
import SessionPage from './SessionPage';

const SESSION_ID = 'js-arrays-map-vs-foreach-01';
const repo = new StaticContentRepository();

const renderAt = (sessionId: string, repository: IContentRepository = repo) =>
  render(
    <ContentProvider repository={repository}>
      <MemoryRouter initialEntries={[`/practice/${sessionId}`]}>
        <Routes>
          <Route path="/practice/:sessionId" element={<SessionPage />} />
          <Route path="/" element={<p>inicio</p>} />
        </Routes>
      </MemoryRouter>
    </ContentProvider>,
  );

const loaded = async (sessionId = SESSION_ID, repository: IContentRepository = repo) => {
  const view = renderAt(sessionId, repository);
  await waitFor(() => expect(screen.queryByText(/Cargando la sesión/)).toBeNull());
  return view;
};

const session = async (): Promise<ExerciseSession> =>
  (await repo.getSessionById(SESSION_ID))!;

/** Repositorio que falla al leer la sesión, sin ocultar el error. */
const failingRepo: IContentRepository = {
  getTechnologies: () => Promise.resolve([] as Technology[]),
  getTopicsByTechnology: () => Promise.resolve([] as Topic[]),
  getConceptById: () => Promise.resolve(null as Concept | null),
  getSessionsByConcept: () => Promise.resolve([]),
  getSessionById: () => Promise.reject(new Error('el contenido no se pudo leer')),
};

describe('SessionPage (T027)', () => {
  describe('carga', () => {
    it('muestra un estado de carga antes de tener la sesión', () => {
      renderAt(SESSION_ID);

      expect(screen.getByRole('status')).toHaveTextContent(/Cargando la sesión/);
    });

    it('carga una sesión real y muestra su título y posición', async () => {
      await loaded();
      const real = await session();

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(real.title);
      expect(screen.getByText(`Paso 1 de ${real.steps.length}`)).toBeInTheDocument();
    });

    it('renderiza el CodeReadingStep del primer paso', async () => {
      await loaded();
      const real = await session();
      const primero = real.steps[0];

      expect(primero.type).toBe('code-reading');
      expect(screen.getByRole('group', { name: primero.prompt })).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(primero.options!.length);
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

    it('los tipos de paso aún no implementados se indican como tales', async () => {
      await loaded();
      const real = await session();

      fireEvent.click(screen.getByRole('radio', { name: real.steps[0].options![0].text }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Comprobar' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Siguiente paso' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));

      await waitFor(() =>
        expect(screen.getByText(/todavía no están disponibles/)).toBeInTheDocument(),
      );
      expect(screen.getByText(/predict-output/)).toBeInTheDocument();
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

    it('el estado de carga se anuncia', () => {
      renderAt(SESSION_ID);

      expect(screen.getByRole('status')).toBeInTheDocument();
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

  describe('límites de la tarea', () => {
    it('no renderiza todavía indicador de pasos ni feedback de resultado', async () => {
      const { container } = await loaded();

      expect(within(container).queryByRole('progressbar')).toBeNull();
      const real = await session();
      expect(container.textContent).not.toContain(real.steps[0].explanation);
    });
  });
});
