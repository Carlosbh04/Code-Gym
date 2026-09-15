import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { LearningContent as LearningContentModel } from '@/types/content';
import { LearningContent } from './LearningContent';

const CONTENT: LearningContentModel = {
  sections: [
    { type: 'intro', title: 'Introducción', body: 'Una idea concreta para empezar.' },
    { type: 'objectives', title: 'Qué vas a aprender', items: ['Leer código', 'Elegir una alternativa'] },
    { type: 'code', title: 'Ejemplo', code: 'const answer = 42;', language: 'javascript' },
    { type: 'warning', title: 'Error común', body: 'No confundas valor y referencia.' },
    { type: 'comparison', title: 'Comparación', left: { title: 'A', body: 'Primera opción.' }, right: { title: 'B', body: 'Segunda opción.' } },
    { type: 'quick-check', question: '¿Qué devuelve answer?', answer: 'El número 42.' },
  ],
};

describe('LearningContent', () => {
  it('presenta bloques pedagógicos escaneables y la mini comprobación con control nativo', () => {
    render(<LearningContent content={CONTENT} fallbackMarkdown="fallback" conceptName="Prueba" />);

    expect(screen.getByRole('region', { name: 'Teoría de Prueba' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Introducción' })).toBeInTheDocument();
    expect(document.querySelector('code')).toHaveTextContent('const answer = 42;');
    expect(screen.getByText('No confundas valor y referencia.')).toBeInTheDocument();
    expect(screen.queryByText('El número 42.')).not.toBeVisible();

    fireEvent.click(screen.getByText('Ver respuesta'));
    expect(screen.getByText('El número 42.')).toBeVisible();
  });

  it('conserva el Markdown canónico cuando no hay lección estructurada', () => {
    render(<LearningContent content={undefined} fallbackMarkdown="# Teoría existente" conceptName="Legado" />);

    expect(screen.getByRole('region', { name: 'Teoría de Legado' })).toHaveTextContent('# Teoría existente');
  });
});
