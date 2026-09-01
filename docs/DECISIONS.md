# DECISIONS — Architecture Decision Records

Registro de decisiones arquitectónicas de CodeGym, previsto en el Master Plan §38.

**D001–D006** están definidas en el Master Plan §46 y no se duplican aquí. Su
migración a este archivo se hará en T015.11, junto con **D009** (highlight.js y
estrategia de fuentes), que queda pendiente.

Este archivo se adelanta parcialmente respecto a T098 porque D007 y D008
resuelven una contradicción de la especificación y necesitan trazabilidad antes
de que se construya más UI encima.

---

## D007 — Escala de acento accesible

**Fecha:** T015.7 (bloque de corrección posterior a la auditoría de transferencia)
**Estado:** aceptada
**Sustituye a:** el bloque `/* Accent */` original del Master Plan §12

### Contexto

El Master Plan fija dos requisitos incompatibles entre sí:

- §12: `--accent: #6366f1`
- §14: contraste ≥ 4.5:1 para texto normal (WCAG 2.1 AA)

Ratios medidos sobre la paleta del plan:

| Uso | Ratio | AA texto (4.5) |
|---|---|---|
| `#6366f1` como texto sobre `--bg-primary` | 4.42:1 | no |
| `#6366f1` como fondo + texto blanco `#f0f0f5` | 3.93:1 | no |
| `#6366f1` como fondo + texto `#0a0a0f` | 4.42:1 | no |

La restricción dura es la segunda: **ningún color de texto alcanza AA sobre
`#6366f1`**. Cualquier solución que conserve ese color como superficie de botón
renuncia al botón primario indigo sólido o acepta una excepción.

En el estado auditado esto afectaba a 9 usos de `text-primary` (NavLink activo y
wordmark en las tres navegaciones) y al único botón del proyecto.

### Opciones consideradas

1. **Aclarar el acento** a `#818cf8` y retirar `#6366f1`.
2. **Conservar `#6366f1`** restringiendo su uso por convención.
3. **Doble token**: acento de marca + acento accesible, con roles excluyentes.
4. **Aceptar AA parcial** y documentar la excepción.

### Decisión

**Opción 3 — doble token.**

```
--accent:      #6366f1   marca. NO textual.
--accent-text: #818cf8   texto, interacción y superficie de botón primario.
```

Reglas:

- `#6366f1` → bordes, iconos, focus ring, glows, superficies decorativas.
  Le basta el 3:1 de elementos no textuales, que cumple (4.42:1).
- `#818cf8` → texto de acento, enlaces, estados activos, y superficie de los
  botones primarios con `--bg-primary` como color de texto.
- Nunca blanco sobre `#6366f1`.

En la capa semántica, `--primary` deriva de `--accent-text` (no de `--accent`),
de modo que `text-primary`, `bg-primary` y `text-primary-foreground` cumplen AA
por construcción. `--ring` sí deriva de `--accent`, porque el focus ring es un
elemento no textual.

### Razón

Conserva el acento del Master Plan sin renunciar a WCAG AA. `#818cf8` no es un
color nuevo: §12 ya lo definía como `--accent-hover`, así que la identidad visual
no se altera. Y a diferencia de la opción 2, la regla la hace cumplir el sistema
de tokens y no la disciplina de cada componente a lo largo de 40+ tareas de UI.

### Consecuencias

- El botón primario pasa de `#6366f1` sólido con texto claro a `#818cf8` con
  texto `#0a0a0f` (6.62:1).
- `--accent-hover` queda como alias de `--accent-text`: mismo valor, un solo
  literal.
- Queda **una** deuda AA conocida: `.hljs-comment` usa `--text-muted` sobre
  `--code-bg` y da 3.09:1. No se corrige aquí porque resolverlo exige decidir el
  tono de los comentarios de código —usar `--text-secondary` los igualaría a
  `hljs-params` y perdería jerarquía— y `CodeBlock` todavía no se renderiza en
  ninguna página. Se traslada a T026, cuando el componente entra en uso.

---

## D008 — Jerarquía de tokens primitivos → semánticos → shadcn

**Fecha:** T015.7
**Estado:** aceptada

### Contexto

La implementación mantenía dos paletas independientes:

- los tokens hex del Master Plan §12 (`--bg-primary`, `--text-primary`, …);
- una capa HSL de shadcn con valores propios (`--background`, `--foreground`, …).

Problemas concretos:

- `--background` (#0e0e10) y `--bg-primary` (#0a0a0f) eran **colores distintos**
  para el mismo concepto.
- `--accent` estaba sobrescrito con el triplete `239 84% 67%`, lo que lo
  invalidaba como color: `color: var(--accent)` no producía nada. Su vecino
  `--accent-hover` seguía en hex.
- Los componentes mezclaban sistemas sin criterio: `DifficultyBadge` usaba
  `var(--success)`, `Progress` usaba `bg-primary/20`, `EmptyState` usaba
  `var(--text-primary)`.
- `--space-*` y `--radius-*` no tenían consumidor, duplicando escalas que
  Tailwind ya proporciona.

### Opciones consideradas

1. Tomar §12 como canónico y renunciar al contrato de shadcn.
2. Tomar shadcn como canónico y retirar los tokens de §12.
3. **Derivar** la capa de shadcn a partir de §12.

### Decisión

**Opción 3.** Cuatro capas, un único valor por concepto:

```
CAPA 1  PRIMITIVAS   §12. Fuente única de verdad. Un literal por concepto.
   ↓
CAPA 2  SEMÁNTICAS   contrato shadcn. Derivadas con var(), sin literales.
   ↓
CAPA 3  TAILWIND     tailwind.config.js → hsl(var(--semántica))
   ↓
CAPA 4  COMPONENTES  utilidades: bg-background, text-foreground, text-success…
```

Decisiones de detalle:

- **Formato.** Las primitivas de color se declaran como canales HSL
  (`240 20% 5%`), no como hex. Es lo que permite derivarlas con `var()` y lo que
  Tailwind necesita para inyectar modificadores de opacidad
  (`bg-primary/20` → `hsl(var(--primary) / .2)`). Cada token documenta su hex en
  un comentario; las 15 conversiones reproducen el hex de §12 de forma exacta,
  verificado por round-trip.
- **Colisión de nombres.** En shadcn, `accent` significa «superficie sutil de
  hover/activo», no «color de marca». Como `--accent` ya es la primitiva de
  marca, el slot semántico se llama `--surface-hover`, y `tailwind.config.js`
  mapea la utilidad `accent` a ese token. El color de marca se expone como
  `brand`.
- **`--space-*`.** Retirados. La escala de §12 (4,8,12,16,20,24,32,40,48,64 px)
  es idéntica a la de Tailwind (1,2,3,4,5,6,8,10,12,16); mantener ambas invita a
  un segundo sistema de espaciado. §12 sigue siendo la especificación de la
  escala; el consumo es vía utilidades.
- **`--radius-*`.** Conservados y **activados**: `tailwind.config.js` los
  consume directamente. Sustituyen al `--radius` de shadcn, que derivaba una
  escala distinta (`rounded-md` 6px frente a los 8px de §12).
- **Excepciones.** Un componente puede leer una primitiva solo con
  justificación escrita. Hoy la única es el bloque de resaltado de código en
  `index.css`, cuyos tonos no tienen equivalente en la capa semántica de shadcn.

### Consecuencias

- `:root` no contiene ningún literal hex: solo canales HSL y derivaciones
  `var()`. No existe una segunda paleta.
- Ningún componente lee `var(--primitiva)`.
- `rounded-md` pasa de 6px a 8px y `rounded-lg` de 8px a 12px, alineándose con
  §12.
- Añadir un color nuevo obliga a decidir en qué capa vive.
