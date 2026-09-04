/**
 * Script que corre dentro del Web Worker (§26).
 *
 * Se exporta como texto y no como módulo porque §41 exige que el worker se
 * cree desde una blob URL y que esa URL se revoque en `destroy()`. Mantenerlo
 * en una cadena tiene además una propiedad que interesa: este fichero no
 * ejecuta nada al importarse, así que el `new Function` de dentro solo llega a
 * evaluarse en el contexto aislado del Worker, nunca en el hilo principal.
 *
 * El cuerpo es el de §26, sin añadidos. Nota sobre lo que no controla: si el
 * código del usuario devuelve algo que el clonado estructurado no sabe copiar
 * —una función, por ejemplo—, `postMessage` lanza aquí dentro. Esa excepción
 * queda fuera del try/catch por caso, sale del worker como evento `error` y la
 * recoge la rama ERROR del ciclo de vida de §26: terminar, recrear y rechazar.
 * No se convierte en un resultado normal.
 */
export const WORKER_SCRIPT = `
self.onmessage = async function (event) {
  var data = event.data;

  if (!data || data.type !== 'execute') {
    return;
  }

  var results = [];

  for (var i = 0; i < data.testCases.length; i++) {
    var test = data.testCases[i];

    try {
      var fn = new Function('input', data.code + '\\nreturn (' + test.call + ');');
      var actual = await fn(test.input);

      results.push({
        input: test.input,
        expected: test.expected,
        actual: actual,
        pass: JSON.stringify(actual) === JSON.stringify(test.expected)
      });
    } catch (error) {
      results.push({
        input: test.input,
        expected: test.expected,
        actual: null,
        error: error instanceof Error ? error.message : String(error),
        pass: false
      });
    }
  }

  self.postMessage({ type: 'result', id: data.id, results: results });
};
`;
