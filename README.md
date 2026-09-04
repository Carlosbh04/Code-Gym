# CodeGym

Aplicación web para practicar JavaScript, HTML, CSS, React, Node.js y SQL
mediante sesiones cortas de lectura, predicción, detección de errores y,
cuando el motor lo soporta, corrección de código.

## Desarrollo

Requisitos: Node.js 20 o posterior.

```sh
npm install
npm run dev
```

Comandos de calidad:

```sh
npm test -- --run
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

`npm run analyze:bundle` genera un informe local de bundle. Los E2E usan
Playwright en Chromium, Firefox y WebKit.

## Despliegue

El proveedor canónico es Vercel. Construye con `npm run build`, publica `dist`
y `vercel.json` conserva el fallback SPA para las rutas de React Router. No se
requieren variables de entorno ni secretos para el MVP.

Consulta [la arquitectura](docs/ARCHITECTURE.md), la
[guía de contenido](docs/CONTENT-GUIDE.md) y la
[auditoría de rendimiento](docs/PERFORMANCE-AUDIT.md).
