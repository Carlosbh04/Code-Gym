# Arquitectura

CodeGym es una SPA React/Vite. `src/app/providers.tsx` es el punto único de
composición: crea las implementaciones concretas y las inyecta en providers.

## Capas

- `features/`: páginas y flujos de producto.
- `components/`: UI reutilizable; los componentes no acceden a storage ni al
  dominio directamente.
- `contexts/` y `hooks/`: estado de aplicación y adaptadores React.
- `lib/`: engine, Worker, repositorios y recuperación.
- `data/content/`: contenido versionado cargado bajo demanda.
- `types/`: contratos de dominio y repositorio.

## Decisiones principales

- D001: el código de usuario se ejecuta en un Web Worker.
- D002: persistencia detrás de repositorios, con implementaciones locales.
- D005: contenido por topic mediante `import.meta.glob` no eager.
- D006/D019: recuperación de sesión activa en `sessionStorage`.
- D018: finalización coordinada de sesiones, progreso e historial.

El registro canónico y completo está en [DECISIONS.md](DECISIONS.md).

## Flujo de datos

El contenido sale de `StaticContentRepository`; el engine valida respuestas y
el Worker ejecuta únicamente código de ejercicios `fix-code`. `CodingWorkspace`
compone el panel del reto, `FixCodeStep`, acciones, consola y resultados: pide
ejecuciones al contexto, nunca al Worker directamente. `executeFixCode` corre
los tests canónicos sin responder el step; `validateFixCode` añade el veredicto
que permite progresar. Los providers persisten progreso, intentos y sesiones
completadas mediante sus interfaces de repositorio. Las rutas se cargan con
`React.lazy`, y CodeMirror solo se importa cuando se muestra un paso de
corrección.

## Routing y despliegue

React Router maneja las rutas de cliente. Vercel sirve el build `dist` y el
rewrite de `vercel.json` dirige las rutas profundas a `index.html`.
