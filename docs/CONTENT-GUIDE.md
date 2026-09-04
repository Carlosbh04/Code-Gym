# Guía de contenido

## Principios

El contenido de CodeGym está versionado en el repositorio y se carga bajo demanda por topic (D005). Una tecnología publicada debe incluir topics, conceptos con teoría estructurada y al menos una sesión real por concepto. No declares tarjetas vacías ni importes JSON directamente desde React.

Los IDs usan minúsculas, guiones y un prefijo de tecnología: `css-flexbox-layout`, `react-state-events` o `sql-joins-relations`.

## Estructura

```text
src/data/
  technologies.json
  content/
    <technology>/
      index.json                 # Topic[]
      <concept-folder>/
        index.json               # Concept sin contentMarkdown
        concept.md               # fallback canónico de texto
        sessions/<session>.json
```

1. Añade la tecnología a `technologies.json` con `id`, `name`, `icon` y descripción.
2. Declara sus topics en `content/<technology>/index.json`.
3. Para cada topic crea un concepto con teoría, Markdown de respaldo y sesiones.
4. Ejecuta el test de integridad antes de abrir una práctica.

## Teoría estructurada

`concept.md` mantiene compatibilidad con el contenido anterior. El contenido nuevo debe añadir `content.sections` en el `index.json` del concepto. Es una lista tipada y pequeña, no un page builder.

```json
{
  "id": "css-flexbox-layout",
  "name": "Distribución en un eje",
  "topicId": "css-flexbox",
  "technologyId": "css",
  "content": {
    "sections": [
      { "type": "intro", "title": "Introducción", "body": "…" },
      { "type": "objectives", "title": "Qué vas a aprender", "items": ["…"] },
      { "type": "code", "title": "Ejemplo", "language": "css", "code": ".row { display: flex; }" },
      { "type": "quick-check", "question": "¿…?", "answer": "…" }
    ]
  }
}
```

Tipos disponibles:

- `intro`, `explanation`, `key-point`, `warning`: título y `body`.
- `objectives`: título e `items`.
- `code`: título, `code`, `language` y caption opcional. Se representa con el `CodeBlock` canónico; los lenguajes sin highlighter registrado se muestran como texto seguro.
- `comparison`: dos alternativas con título y explicación.
- `quick-check`: pregunta corta y respuesta revelable con un control nativo de teclado.

Una lección publicada debe tener al menos cuatro secciones y combinar explicación, ejemplo y comprobación cuando sea pertinente. No inventes objetivos, errores comunes o comparaciones si el concepto no los justifica.

## Sesiones

Una sesión necesita `id`, `title`, `conceptId`, `technologyId`, `difficulty`, `version`, `status`, fechas y `steps`. Cada step necesita un ID único, `stepOrder` consecutivo, prompt, explicación y al menos una pista.

- `code-reading` y `predict-output`: usan opciones y exactamente una correcta.
- `find-error`: requiere `code`, `errorLines`, `errorType` y opciones coherentes.
- `fix-code`: requiere `code`, `testCases` y patrones que el Worker pueda ejecutar.

Usa `fix-code` únicamente para JavaScript ejecutable por el Worker actual. HTML, CSS, React, Node.js y SQL se entrenan por ahora con lectura, predicción y detección de errores: CodeGym no simula la ejecución de un navegador, un runtime Node, un bundler React ni una base de datos. No declares una sesión como ejecutable si esa capacidad no existe.

## Authoring executable JavaScript exercises

Un `fix-code` es una práctica real de escritura para JavaScript. `code` es el
starter code que verá el usuario: debe contener la firma y contexto suficiente,
pero nunca una solución disimulada. Usa comentarios breves como `// Tu código
aquí` cuando ayuden a arrancar.

Cada `testCases` declara `input`, `expected`, `call` y `description`. Incluye
un caso normal y, cuando el concepto lo justifique, un borde relevante (array
vacío, valor límite, dato ausente o error). La `description` se muestra como
requisito y el resultado real del Worker muestra `Expected`, `Received` y el
error de cada caso fallido.

El flujo visible separa **Ejecutar tests** de **Comprobar**: ambos usan los
casos canónicos en el Web Worker, pero solo una comprobación que pasa permite
avanzar. Un fallo no bloquea el editor ni convierte el step en completado; el
usuario puede corregir el mismo draft y ejecutar otra vez. No hay consola shell
ni salida `console.log` libre en esta fase.

El Worker evalúa únicamente el código y los `call` del ejercicio, sin DOM,
filesystem, red, procesos ni acceso al hilo de UI. Puede esperar el valor que
devuelva una función `async`, pero los resultados deben ser clonables y
comparables mediante JSON. No uses timers, APIs del navegador, imports, fetch,
dependencias externas ni valores que no se puedan serializar. Los errores de
sintaxis y de ejecución se convierten en resultados de test; los timeouts o
fallos del Worker son recuperables desde la interfaz.

El borrador de código se conserva mientras el step está abierto. La recuperación
de sesión actual no persiste drafts de editor: no añadas ese campo sin una
decisión explícita de esquema de recovery.

## Calidad y validación

Mantén texto pedagógico concreto: explica qué hace algo, cuándo usarlo y un error común o alternativa cuando aporte valor. Los hints y explanations deben provenir del contenido de la sesión.

```sh
npm test -- --run src/data/content/content-loading.test.ts
npm test -- --run
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

El test de integridad valida el grafo de tecnologías, topics, conceptos, sesiones, referencias, steps y secciones pedagógicas. No debilites ese test para publicar contenido incompleto.
