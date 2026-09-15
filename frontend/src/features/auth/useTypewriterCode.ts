import { useEffect, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export const AUTH_CODE_SNIPPETS = [
  `// Mejora tus habilidades
while (practicas) {
  aprendes();
  mejoras();
}`,
  `const progreso = practica
  .map(aprender)
  .filter(mejorar);`,
  `function entrenar() {
  const hoy = practicar();
  return mañanaMejor(hoy);
}`,
] as const;

interface TypewriterCodeState {
  text: string;
  isTyping: boolean;
  reducedMotion: boolean;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Recorre los snippets sin repetir el actual y cancela cada timer al cambiar
 * de fase o desmontarse. En reduced motion entrega directamente un ejemplo
 * completo y no crea el bucle de escritura.
 */
export function useTypewriterCode(
  snippets: readonly string[] = AUTH_CODE_SNIPPETS,
): TypewriterCodeState {
  const fallbackSnippet = snippets[0] ?? '';
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [snippetIndex, setSnippetIndex] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [phase, setPhase] = useState<'waiting' | 'typing' | 'pausing' | 'deleting'>('waiting');

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener?.('change', handleChange);

    return () => query.removeEventListener?.('change', handleChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || snippets.length === 0) return;

    const snippet = snippets[snippetIndex] ?? fallbackSnippet;
    let delay = 38;

    if (phase === 'waiting') delay = 650;
    if (phase === 'pausing') delay = 1_800;
    if (phase === 'deleting') delay = 16;

    const timerId = window.setTimeout(() => {
      if (phase === 'waiting') {
        setPhase('typing');
        return;
      }

      if (phase === 'typing') {
        if (characterCount < snippet.length) {
          setCharacterCount((current) => current + 1);
        } else {
          setPhase('pausing');
        }
        return;
      }

      if (phase === 'pausing') {
        setPhase('deleting');
        return;
      }

      if (characterCount > 0) {
        setCharacterCount((current) => Math.max(0, current - 2));
        return;
      }

      setSnippetIndex((current) => (current + 1) % snippets.length);
      setPhase('typing');
    }, delay);

    return () => window.clearTimeout(timerId);
  }, [characterCount, fallbackSnippet, phase, reducedMotion, snippetIndex, snippets]);

  if (reducedMotion) {
    return { text: fallbackSnippet, isTyping: false, reducedMotion: true };
  }

  const activeSnippet = snippets[snippetIndex] ?? fallbackSnippet;
  return {
    text: activeSnippet.slice(0, characterCount),
    isTyping: phase === 'typing' || phase === 'waiting',
    reducedMotion: false,
  };
}
