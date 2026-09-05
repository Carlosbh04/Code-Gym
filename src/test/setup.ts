import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom no implementa estas mediciones de Range. CodeMirror las consulta al
// programar el layout del editor, aunque el resultado visual no interviene en
// las pruebas unitarias. Un rectángulo vacío reproduce el entorno sin layout.
if (typeof Range.prototype.getClientRects !== 'function') {
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    value: () => [],
  });
}

if (typeof Range.prototype.getBoundingClientRect !== 'function') {
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => new DOMRect(),
  });
}

afterEach(() => {
  cleanup();
});
