import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ContentProvider } from '@/contexts/ContentContext';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import { useSession } from './useSession';

/**
 * Lo que este fichero cubre y SessionPage.test.tsx no puede: `hintsUsed` vive
 * dentro de `UserAnswer` y la página no lo expone.
 */

const repo = new StaticContentRepository();
const SESSION_ID = 'js-arrays-map-vs-foreach-01';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ContentProvider repository={repo}>{children}</ContentProvider>
);

const loaded = async () => {
  const view = renderHook(() => useSession(SESSION_ID), { wrapper });
  await waitFor(() => expect(view.result.current.session).not.toBeNull());
  return view;
};

describe('useSession · pistas (T033)', () => {
  it('revela una pista cada vez, en orden y sin saltarse ninguna', async () => {
    const { result } = await loaded();
    const total = result.current.currentStep!.hints.length;
    expect(total).toBeGreaterThan(1);

    for (let i = 0; i < total; i += 1) {
      act(() => result.current.revealHint());
      await waitFor(() =>
        expect(result.current.state.hintsRevealed).toHaveLength(i + 1),
      );
    }

    expect(result.current.state.hintsRevealed).toEqual(
      Array.from({ length: total }, (_, i) => i),
    );
  });

  it('no revela más pistas de las que declara el paso', async () => {
    const { result } = await loaded();
    const total = result.current.currentStep!.hints.length;

    for (let i = 0; i < total + 5; i += 1) {
      act(() => result.current.revealHint());
    }

    await waitFor(() =>
      expect(result.current.state.hintsRevealed).toHaveLength(total),
    );
  });

  it('no duplica REVEAL_HINT: el índice sale de las ya reveladas', async () => {
    const { result } = await loaded();

    act(() => result.current.revealHint());
    await waitFor(() => expect(result.current.state.hintsRevealed).toEqual([0]));

    act(() => result.current.revealHint());
    await waitFor(() => expect(result.current.state.hintsRevealed).toEqual([0, 1]));

    expect(new Set(result.current.state.hintsRevealed).size).toBe(
      result.current.state.hintsRevealed.length,
    );
  });

  it('hintsUsed coincide exactamente con las pistas reveladas en ese paso', async () => {
    const { result } = await loaded();
    const step = result.current.currentStep!;

    act(() => result.current.revealHint());
    act(() => result.current.revealHint());
    await waitFor(() => expect(result.current.state.hintsRevealed).toHaveLength(2));

    act(() => result.current.select(step.options![0].id));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.state.answers).toHaveLength(1));
    expect(result.current.state.answers[0].hintsUsed).toBe(2);
  });

  it('responder sin pistas registra hintsUsed 0', async () => {
    const { result } = await loaded();
    const step = result.current.currentStep!;

    act(() => result.current.select(step.options![0].id));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.state.answers).toHaveLength(1));
    expect(result.current.state.answers[0].hintsUsed).toBe(0);
  });

  it('las pistas no se arrastran de un paso al siguiente', async () => {
    const { result } = await loaded();
    const primero = result.current.currentStep!;

    act(() => result.current.revealHint());
    act(() => result.current.revealHint());
    await waitFor(() => expect(result.current.state.hintsRevealed).toHaveLength(2));

    act(() => result.current.select(primero.options![0].id));
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.state.answers).toHaveLength(1));
    act(() => result.current.next());

    await waitFor(() => expect(result.current.state.currentStep).toBe(1));
    expect(result.current.state.hintsRevealed).toEqual([]);

    // Y el segundo paso cuenta solo las suyas.
    act(() => result.current.revealHint());
    await waitFor(() => expect(result.current.state.hintsRevealed).toEqual([0]));

    const segundo = result.current.currentStep!;
    act(() => result.current.select(segundo.options![0].id));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.state.answers).toHaveLength(2));
    expect(result.current.state.answers.map((a) => a.hintsUsed)).toEqual([2, 1]);
  });
});
