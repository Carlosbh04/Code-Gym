import { describe, expect, it } from 'vitest';

import type { ExerciseSession } from '@/types/exercise';
import type { CompletedSession } from '@/types/progress';
import { resolveSessionState } from './session-status';

const SESSION: ExerciseSession = {
  id: 'session-1',
  title: 'Sesión',
  conceptId: 'concept-1',
  technologyId: 'javascript',
  difficulty: 'beginner',
  version: '1.0.0',
  status: 'published',
  createdAt: '2026-09-01',
  updatedAt: null,
  steps: [],
};

const COMPLETION: CompletedSession = {
  id: 'completion-1',
  sessionId: SESSION.id,
  technologyId: 'javascript',
  conceptId: SESSION.conceptId,
  totalSteps: 1,
  correctSteps: 1,
  accuracy: 100,
  timeSpentMs: 1_000,
  completedAt: '2026-09-06T10:00:00.000Z',
};

describe('resolveSessionState', () => {
  it('prioriza una finalización persistida sobre la recuperación temporal', () => {
    expect(resolveSessionState(
      SESSION,
      { status: 'ready', completedSession: COMPLETION },
      { status: 'ready', sessionId: SESSION.id, currentStep: 2 },
    )).toMatchObject({ status: 'ready', sessionStatus: 'completed', completedSession: COMPLETION });
  });

  it('deriva en progreso solo cuando la recuperación pertenece a la sesión', () => {
    expect(resolveSessionState(
      SESSION,
      { status: 'ready', completedSession: null },
      { status: 'ready', sessionId: SESSION.id, currentStep: 2 },
    )).toMatchObject({ status: 'ready', sessionStatus: 'in-progress', currentStep: 2 });
  });

  it('distingue disponible de bloqueada usando el estado canónico de publicación', () => {
    const recovery = { status: 'ready', sessionId: null, currentStep: null } as const;
    expect(resolveSessionState(SESSION, { status: 'ready', completedSession: null }, recovery)).toMatchObject({ sessionStatus: 'available' });
    expect(resolveSessionState({ ...SESSION, status: 'draft' }, { status: 'ready', completedSession: null }, recovery)).toMatchObject({ sessionStatus: 'locked' });
  });

  it('conserva explícitamente los fallos de historial o recuperación', () => {
    expect(resolveSessionState(
      SESSION,
      { status: 'error', message: 'historial inaccesible' },
      { status: 'ready', sessionId: null, currentStep: null },
    )).toEqual({ status: 'error', message: 'historial inaccesible' });
    expect(resolveSessionState(
      SESSION,
      { status: 'ready', completedSession: null },
      { status: 'error', message: 'recuperación inaccesible' },
    )).toEqual({ status: 'error', message: 'recuperación inaccesible' });
  });
});
