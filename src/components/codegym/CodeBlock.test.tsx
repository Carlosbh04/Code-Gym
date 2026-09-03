import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CodeBlock } from './CodeBlock';

describe('CodeBlock · líneas relevantes (T055)', () => {
  it('mantiene el renderizado simple compatible por defecto', () => {
    const { container } = render(<CodeBlock code="const answer = 42;" />);

    expect(container.querySelector('pre')).toHaveTextContent('const answer = 42;');
    expect(screen.queryByText('1')).toBeNull();
  });

  it('muestra números y etiqueta accesible en líneas relevantes', () => {
    const { container } = render(
      <CodeBlock
        code={'const value = 1;\nreturn value;'}
        showLineNumbers
        highlightedLines={[2]}
      />,
    );

    expect(container.querySelector('pre')).toHaveTextContent('1const value = 1;');
    expect(container.querySelector('pre')).toHaveTextContent('2Línea relevante del ejercicio. return value;');
    expect(screen.getByText(/Línea relevante del ejercicio/)).toHaveClass('sr-only');
  });

  it('escapa código de un lenguaje desconocido también por líneas', () => {
    const { container } = render(
      <CodeBlock code={'<script>\nunsafe()'} language="unknown" showLineNumbers />,
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('pre')).toHaveTextContent('<script>');
  });
});
