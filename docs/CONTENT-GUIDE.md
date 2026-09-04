# Guía de contenido

## Estructura

Cada tecnología declara sus topics en `src/data/content/<technology>/index.json`.
Cada topic contiene:

```text
<topic>/
  index.json
  concept.md
  sessions/<session>.json
```

El `index.json` del topic describe el concepto (`id`, `name`, `topicId` y
`technologyId`); `concept.md` aporta la prosa. Las sesiones son JSON con los
campos de `ExerciseSession`.

## Sesiones

Una sesión necesita `id`, `title`, `conceptId`, `technologyId`, `difficulty`,
`version`, `status`, fechas y `steps`. Los tipos válidos de paso son:

- `code-reading` y `predict-output`: opciones con exactamente una correcta.
- `find-error`: `code`, líneas y tipo de error coherentes.
- `fix-code`: `code` y `testCases` que el Worker pueda ejecutar.

Mantén `stepOrder` consecutivo, IDs únicos y texto explicativo e hints en cada
paso. El contenido publicado debe pasar los tests de integridad:

```sh
npm test -- --run src/data/content/content-loading.test.ts
```

No incluyas secretos, llamadas de red ni código ejecutable fuera de los
fragmentos de ejercicios. El repositorio carga cada payload bajo demanda y
trata contenido inválido como no recuperable.
