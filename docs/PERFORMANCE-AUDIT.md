# Performance audit

## Método

La auditoría se ejecuta sobre el build de producción, servido con `vite preview`,
usando Lighthouse y Chromium. No se interpretan las métricas del servidor de
desarrollo: sus transformaciones bajo demanda no representan el artefacto que
recibe una persona usuaria.

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
npx lighthouse http://127.0.0.1:4173/ \
  --only-categories=performance,accessibility,best-practices,seo
```

## Resultado de referencia

| Categoría o métrica | Resultado |
| --- | ---: |
| Performance | 96/100 |
| Accessibility | 100/100 |
| Best practices | 96/100 |
| SEO | 82/100 |
| First Contentful Paint | 2.2 s |
| Largest Contentful Paint | 2.4 s |
| Cumulative Layout Shift | 0 |
| Total Blocking Time | 10 ms |

El LCP, CLS y TBT cumplen los objetivos del Master Plan §31. El FCP se debe
tratar como una métrica de seguimiento: el resultado de laboratorio depende
del throttling y de la máquina, y queda por encima del objetivo aspiracional de
1.5 s. Las rutas y CodeMirror ya se cargan de forma diferida; cualquier ajuste
adicional debe basarse en el informe de bundle de T094, no en cambiar el umbral
de Lighthouse.

## Artefactos

`npm run analyze:bundle` genera `bundle-stats.html` localmente. El informe no
se versiona porque es un artefacto derivado del build.
