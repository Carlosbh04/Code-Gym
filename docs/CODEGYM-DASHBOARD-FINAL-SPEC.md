# CODEGYM DASHBOARD — FINAL DESIGN SPEC

> **Esto es una especificación de diseño. No autoriza la implementación.**
>
> No se ha tocado `src/`, `package.json`, el router, componentes, tokens, tipos
> ni lógica. No se han creado rutas. T055 sigue bloqueada; el roadmap va por
> T016. Prototipo aislado en `design-lab/visual/final-diagnostico.html`.

---

## Selected Direction

**D07 · Telemetría + pieza de código de D10** — nombre de trabajo:
**`Diagnóstico con pieza`**.

### Core Principle

**Interpretación sobre visualización de métricas.**

La cadena completa, y en este orden:

```
INTERPRETAR → MOSTRAR EVIDENCIA → IDENTIFICAR PROBLEMA
            → MOSTRAR LÍNEAS EXACTAS → PROPONER CORRECCIÓN
```

El dashboard debe responder dos preguntas, en este orden:
**«¿qué está pasando con mi aprendizaje?»** y **«¿qué debería practicar ahora?»**.
Un número que no venga acompañado de su interpretación no entra en la página.

### Decisiones recibidas y cómo se aplican

| Decisión | Cómo se materializa |
|---|---|
| La navegación sigue diciendo **«Progreso»** | El veredicto **abre con la variación de dominio**, no con el error: «Subes 6 puntos, pero…». La página cumple la promesa de su etiqueta en la primera línea. |
| El progreso **no** queda al pie | Es la primera mitad del titular del veredicto, y la fila de evidencia va dentro del bloque del veredicto. Al pie solo quedan métricas secundarias sin jerarquía. |
| El veredicto **puede ser positivo** | Tres estados: `OK` · `ATENCIÓN` · `MEJORA`. El estado `OK` no muestra ningún hallazgo y reencuadra la pieza como «siguiente reto», no como corrección. |
| **Sin racha ni gamificación** | Eliminada de todo el prototipo. Ninguna métrica sin respaldo en §17. |
| **Sin ADR nuevos** | La dirección **no exige tocar `index.css`**: ver *Tokens*. |

---

## Visual Structure

### Arquitectura, de arriba abajo

```
┌ 1 · CONTEXTO ─────────────────────────────────────────────────┐
  codegym diagnose --tech=javascript · 312 intentos · 47 sesiones
  ──────────────────────────────────────────────────────────────
┌ 2+3+4 · VEREDICTO ────────────────────────────────────────────┐
▌  ⊙ MEJORA                              ← glifo + palabra
▌  Subes 6 puntos, pero sigues mutando   ← h1: PROGRESO + PROBLEMA
▌  lo que deberías copiar.
▌  El 56% de tus fallos son de dos tipos que comparten raíz…
▌  dominio 48→54 +6 · precisión 69%→73% +4,1 · 3 sesiones ·
▌  regresiones 2                          ← evidencia, en línea
  ──────────────────────────────────────────────────────────────
┌ 5 · DIAGNÓSTICO PRINCIPAL ────────────────────────────────────┐
  Promise.all()   promesas/ · dominio 22 · precisión 33%
  async · 3 fallos en 9 intentos · el último, ayer
┌ 6 · PIEZA ────────────────────────────────────────────────────┐
  promesas/promise-all-swallow.json · paso 3 de 5 · find-error
   3    Promise.resolve('ok'),
  ▌4    Promise.reject(new Error('falla')),      ← línea marcada
   5    Promise.resolve('ok'),
   7
  ▌8    const r = await Promise.all(tareas);     ← línea marcada
┌ 7 · LÍNEAS EXACTAS ───────────────────────────────────────────┐
  línea 4  Un solo reject rechaza todo el conjunto…
  línea 8  El await no recibe el array: recibe el error…
┌ 8 · ACCIÓN ───────────────────────────────────────────────────┐
  [ Corregir esto → ]  [ Ver otro hallazgo ]
  ──────────────────────────────────────────────────────────────
┌ OTROS HALLAZGOS ──────────────────────────────────────────────┐
  atención  Array.reduce()  arrays/ · 41 · mutación · −7 pts
  atención  Optional chaining  es6-plus/ · 12 · 1 intento
  ok        14 conceptos sin hallazgos
  ──────────────────────────────────────────────────────────────
┌ 9 · MÉTRICAS SECUNDARIAS ─────────────────────────────────────┐
  21 conceptos · 6 por encima de 80 · 9 en curso · 3 sin intentos
  47 sesiones · 312 intentos · 8h 42m · 48 s/paso · 1,4 pistas
```

### Jerarquía

| Orden | Qué | Mecanismo |
|---|---|---|
| 1.º | El titular del veredicto | 33 px, peso 700, `text-wrap: balance`, máx. 20ch. Es el `<h1>`. |
| 2.º | El nombre del concepto diagnosticado | 19 px, peso 700, `<h3>` |
| 3.º | Las líneas marcadas del código | Fondo + filete interior + numeral en color |
| 4.º | El CTA | 50 px de alto, sólido, color del estado |
| Ignorable | Métricas secundarias | 11,5 px, `--faint`, al final, sin encabezado propio |

### Reglas de composición

- **Sin tarjetas.** Las separaciones son hairlines de 1 px. Las dos únicas
  superficies con fondo son el bloque de código y el bloque de notas de línea,
  y existen porque el código necesita su plano (§10, §12 `--code-bg`).
- **Sin sombras decorativas, sin blur, sin degradados, sin glow.** Verificado en
  el prototipo: **0 filtros, 0 degradados, 2 `box-shadow`**, y los dos son
  `inset` de 3 px para marcar líneas de código (no son sombras: son filetes).
- **Una sola columna.** Máx. 900 px: **cabe en el `AppLayout` sin excepción a
  §11**.
- **Ningún color de marca en toda la página.** El único color es la escala de
  estado. El CTA hereda el color del estado que resuelve.

---

## Verdict System

Tres estados. **El color nunca es la única señal**: cada estado se comunica con
**cuatro** señales redundantes.

| | `OK` | `ATENCIÓN` | `MEJORA` |
|---|---|---|---|
| **Significado** | Progresa correctamente | Hay una señal que merece revisión | Hay un problema concreto que debe convertirse en entrenamiento |
| **Glifo** | Check (`✓`) — trazo abierto | Triángulo con barra | Círculo con flecha ascendente |
| **Palabra** | `OK` | `ATENCIÓN` | `MEJORA` |
| **Filete izquierdo** | **2 px** | **4 px** | **6 px** |
| **Color** | `#46d67f` (10,55:1) | `#ffb020` (10,83:1) | `#ff6b6b` (7,13:1) |
| **Tipografía** | Idéntica en los tres: palabra en mono 11 px / `.2em`; titular Inter `clamp(21px, 4.4vw, 33px)` / 700 | | |
| **Jerarquía** | Idéntica en los tres. El estado **no** reordena la página | | |
| **Sección siguiente** | «Siguiente reto» | «Señal a revisar» | «Diagnóstico principal» |
| **Hallazgos** | Solo `ok` / `omitido` | 1 señal + `ok` | 1 principal + `atención` + `ok` |
| **CTA** | «Seguir entrenando →» | «Practicar esto →» | «Corregir esto →» |
| **Mensaje tipo** | «Semana limpia: +6 de dominio y ninguna regresión.» | «Buena semana, pero ES6+ lleva doce días parado.» | «Subes 6 puntos, pero sigues mutando lo que deberías copiar.» |
| **Motion** | `verdictEnter` idéntico. Solo cambia el color, nunca la duración ni la curva | | |
| **Interacción** | El bloque de veredicto **no es interactivo**. La acción vive en el CTA | | |

### Reglas de redacción del veredicto

1. **Siempre empieza por el progreso.** «Subes 6 puntos, pero…» / «Semana
   limpia: +6…». La navegación promete «Progreso» y el titular lo entrega.
2. **Nunca acusa.** `MEJORA` describe un patrón, no un fracaso: «sigues mutando
   lo que deberías copiar», no «fallas demasiado».
3. **El número apoya, la interpretación manda.** Ninguna cifra aparece sola.
4. **El párrafo explica la causa, no repite el dato.** «Aparecen en tres topics
   distintos, así que no es un problema de Promesas: es un patrón tuyo.»
5. **Máximo 20ch el titular, 58ch el párrafo.**

### Cómo se elige el estado

Regla determinista, sin modelo nuevo:

```
hallazgos = conceptos con recentErrors recientes y domain por debajo del umbral

si sesiones < 10                         → ATENCIÓN (muestra insuficiente)
si no hay hallazgos de severidad error   → OK
si hay señales pero ninguna regresión    → ATENCIÓN
si hay ≥1 hallazgo de severidad error    → MEJORA
```

Severidad por hallazgo:
`error` = domain < 40 **y** con `recentErrors` en los últimos 30 días ·
`atención` = domain < 40 sin errores recientes, **o** regresión de domain, **o**
cobertura insuficiente (≤2 intentos) · `ok` = el resto · `omitido` = 0 intentos.

---

## UX

### Flujo principal

```
Entro → leo UNA frase y ya sé cómo voy y qué me pasa   (≈3 s)
      → leo el párrafo y entiendo POR QUÉ              (≈10 s)
      → veo el concepto concreto y su tipo de error
      → veo el código y las dos líneas donde vive
      → leo qué pasa en cada línea
      → pulso «Corregir esto»                          (1 clic)
```

Un solo clic desde abrir hasta entrenar, y cinco escalones de comprensión
opcionales por el camino. Quien tiene diez minutos pulsa directamente; quien
quiere entender, lee.

### Reglas de interacción

- El CTA principal es **el único elemento sólido** de la página.
- «Ver otro hallazgo» rota al siguiente hallazgo por severidad; **no navega**.
- Los hallazgos secundarios son enlaces al concepto, no al ejercicio.
- Si hay **sesión pendiente** (§21), el bloque de pieza se sustituye **entero**
  por el de reanudación. Nunca coexisten. El diagnóstico se conserva arriba y se
  añade una línea: «El diagnóstico de Promise.all() te espera al terminar».

### Qué se ve primero, después y qué se puede ignorar

| Prioridad | Contenido |
|---|---|
| **Primero** | Estado + titular (progreso + problema en una frase) |
| **Después** | Párrafo de causa → concepto diagnosticado → código → líneas |
| **Acción** | CTA sólido, color del estado |
| **Secundario** | Otros hallazgos |
| **Ignorable** | Métricas del pie. Están para quien las busque, no para ser leídas |

---

## Responsive

Cinco anchos, con cambios reales de arquitectura, no reducción.

### 320 px
- Contexto en **dos líneas**; la fecha baja.
- Filete del veredicto: se mantiene el grosor (es la señal de estado).
- Titular a **21 px** (mínimo del `clamp`).
- Evidencia: los cuatro pares **apilan en columna**, uno por línea.
- Código: canalón de numeración a **32 px**; el bloque **desplaza en horizontal
  dentro de su contenedor** (§11), el `body` nunca.
- Notas de línea: `línea 4` **encima** del texto, no en columna.
- Hallazgos: severidad **encima** del nombre (una columna).
- CTA: los dos botones a **ancho completo**, apilados.
- Métricas del pie: dos líneas envueltas.
- Navegación: **bottom nav** (§11). `padding-bottom: 96px` para no quedar debajo.

### 390 px
Igual que 320, con el titular creciendo por `4.4vw` (≈24 px) y la evidencia
permitiendo dos pares por línea si caben.

### 768 px
- **TopBar** sustituye a la bottom nav (§11).
- Evidencia: los cuatro pares **en una sola fila**.
- Notas de línea: vuelven a **dos columnas** (`línea N` | explicación, 58 px).
- Hallazgos: severidad recupera su **columna de 66 px**.
- CTA: los botones vuelven a ser **inline**.

### 1024 px
- **Sidebar** de 256 px (§11).
- Columna de contenido **fijada en 900 px**, centrada.
- Padding a 32 px. Titular cerca de su máximo (33 px).

### 1280 px
**Idéntico a 1024 px, y es deliberado.** §11 fija la columna en 900 px: el
espacio extra se convierte en margen, no en contenido. Alternativa evaluada y
descartada: llevar las notas de línea a una columna lateral tipo *marginalia*
(D10) exigiría romper los 900 px y por tanto una excepción a §11. **No compensa
inventar densidad para llenar píxeles.**

### Qué NO cambia en ningún breakpoint

El orden de los nueve bloques. Ninguna decisión de diseño se pierde en móvil:
es la propiedad que hizo que esta dirección ganara en responsive.

---

## Motion Engineering

Evaluado con `animation-performance-engineering`. **Nada implementado.**
Solo cinco animaciones, todas justificadas por comprensión.

### 1 · `verdictEnter`

| | |
|---|---|
| **Qué ocurre** | Glifo + palabra + titular entran juntos, 200 ms, `cubic-bezier(.2,.7,.3,1)` |
| **Propiedad** | `opacity: 0→1` + `transform: translateY(6px→0)` |
| **Reflow** | Ninguno |
| **Repaint** | Ninguno tras la promoción a capa |
| **Compositing** | Sí — **1 capa** (se anima el contenedor, no los tres hijos) |
| **GPU / CPU** | Coste despreciable; se descarta la capa en `animationend` |
| **React** | Clase CSS al montar. **Nunca** estado por fotograma |
| **Móvil** | Sin riesgo |
| **reduced-motion** | El bloque global de §13 lleva la duración a 0,01 ms → **salta al estado final**. Correcto |

### 2 · `evidenceReveal`

| | |
|---|---|
| **Qué ocurre** | La fila de evidencia entra 120 ms después del titular |
| **Propiedad** | `opacity` del contenedor `<dl>` |
| **Por qué aporta** | Refuerza que la evidencia **respalda** al titular, no compite con él |
| **Riesgo** | ⚠ **No animar los cuatro `<div>` por separado**: cuatro capas para nada |
| **reduced-motion** | Visible desde el inicio |

### 3 · `markedLines`

| | |
|---|---|
| **Qué ocurre** | Las líneas marcadas hacen **un solo pulso** al entrar la pieza |
| **Propiedad** | `opacity` de un **pseudo-elemento** con el fondo ya pintado |
| **Reflow** | Ninguno |
| **Repaint** | ⚠ Animar `background-color` **sí sería paint por fotograma**. Por eso se anima la opacidad de una capa preexistente |
| **Compositing** | 2 capas efímeras (una por línea marcada) |
| **Móvil** | Sin riesgo: máximo 3 líneas marcadas por pieza |
| **reduced-motion** | Marcadas de inicio, sin pulso. **La marca nunca depende de la animación** |

### 4 · `pieceReveal`

| | |
|---|---|
| **Qué ocurre** | El bloque de código entra 120 ms después del diagnóstico |
| **Propiedad** | `opacity` **del bloque completo** |
| **Riesgo** | ⚠ **Jamás línea a línea**: el resaltado genera decenas de `<span>`; un stagger crearía decenas de capas y superaría el presupuesto de 16 ms |
| **Móvil** | Barato como bloque único |
| **reduced-motion** | Visible de inmediato |

### 5 · `ctaPress`

| | |
|---|---|
| **Qué ocurre** | El botón baja 1 px al pulsar |
| **Propiedad** | `transform: translateY(1px)` |
| **Compositing** | Sí, 1 capa efímera |
| **Móvil** | **Es el feedback táctil principal**; en móvil es lo más importante de esta lista |
| **reduced-motion** | **Se conserva**: 100 ms de feedback de pulsación no es decoración, es respuesta del sistema |

### Lo que NO se anima, y por qué

| | Motivo |
|---|---|
| Contadores numéricos en el pie | Contradice su papel secundario y obliga a `tabular-nums` para no recolocar hermanos |
| Reordenación de hallazgos | Exigiría FLIP: leer `getBoundingClientRect` por fila **fuerza layout síncrono** |
| El resaltado de sintaxis | Paint puro sobre muchos nodos |
| Transición entre estados del veredicto | El estado cambia **entre sesiones**, no en pantalla. No hay transición que mostrar |

### Presupuesto

Máximo **4 capas de compositor simultáneas** y **320 ms** de duración total de
la secuencia de entrada. `will-change` se activa justo antes y se retira en
`animationend`. Ninguna animación es necesaria para entender la interfaz.

---

## Accessibility

### Contraste medido (WCAG 2.1 AA, sobre `#0a0a0a`)

| Token | Ratio | Uso |
|---|---:|---|
| `--fg` `#ededed` | **16,91** | Texto principal |
| `--dim` `#9d9d9d` | **7,30** | Texto secundario |
| `--faint` `#6b6b6b` | 3,72 | **Solo decorativo.** Nunca texto informativo — mismo criterio que `--text-muted` en D007 |
| `--ok` `#46d67f` | **10,55** | Estado OK |
| `--att` `#ffb020` | **10,83** | Estado ATENCIÓN |
| `--mej` `#ff6b6b` | **7,13** | Estado MEJORA |
| tinta sobre OK / ATT / MEJ | **9,80 / 10,14 / 7,09** | Texto del CTA |

### Estado sin depender del color — cuatro señales redundantes

1. **Glifo** de forma distinta (check / triángulo / círculo con flecha).
2. **Palabra** literal: `OK`, `ATENCIÓN`, `MEJORA`.
3. **Grosor del filete**: 2 / 4 / 6 px.
4. **Color**.

Las tres primeras funcionan en escala de grises. Lo mismo en las líneas de
código: fondo **+** filete interior de 3 px **+** numeral coloreado **+** una
nota textual que la cita por número.

### Semántica y navegación

- **Landmarks:** el `AppLayout` es propietario único de `<main>` (§16). La
  página aporta `<section>` con `aria-labelledby`.
- **Jerarquía de encabezados** — verificada, sin saltos:
  `h1` titular del veredicto → `h2` Diagnóstico principal → `h3` nombre del
  concepto → `h2` Otros hallazgos.
- El **estado entra en el nombre accesible** de la sección:
  `aria-labelledby="vs-mej vt-mej"` → «MEJORA Subes 6 puntos…».
- **Teclado:** solo **12 elementos interactivos** en toda la página. Orden de
  tabulación corto y en el orden de lectura.
- **Foco:** `outline: 2px solid` + `offset: 2px`, siempre visible.
- **Objetivos táctiles ≥44 px**, verificados en 320 y 390 en los seis estados.
- **Bloque de código:** `overflow-x: auto` propio; el `body` nunca desplaza.
- **`prefers-reduced-motion`** respetado globalmente (§13).
- **Barras de progreso de pasos** (sesión pendiente): `role="img"` con
  `aria-label` completo.

### Pendiente de comprobar en implementación

Zoom al 200 % sobre el titular (`clamp` lo mitiga, pero hay que probarlo) y
lectura del párrafo del veredicto con lector de pantalla, evitando que los `<b>`
fragmenten la locución.

---

## Performance

Medido en el prototipo real, estado MEJORA, Chromium:

| | D07 original | **Final (D07+D10)** | Δ |
|---|---:|---:|---:|
| Nodos DOM | 105 | **151** | +46 |
| Superficies | 3 | **10** | +7 |
| `box-shadow` | 0 | **2** | +2 (filetes `inset`) |
| Filtros / blur | 0 | **0** | — |
| Degradados | 0 | **0** | — |
| Elementos interactivos | 10 | **12** | +2 |
| Alto @1280 | 1303 px | **1308 px** | +5 |
| Alto @390 | 1732 px | **1693 px** | −39 |

**Lectura.** El injerto de D10 cuesta 46 nodos y 7 superficies, y **no alarga la
página**: en móvil incluso la acorta, porque la pieza sustituye texto
explicativo que antes hacía el mismo trabajo peor. Sigue siendo la más barata
de las once opciones exploradas después de D09.

### Riesgos evaluados

| Riesgo | Estado |
|---|---|
| **Layout thrashing** | Ninguna animación lee geometría. Sin FLIP, sin `scroll` handlers |
| **Coste del resaltado** | highlight.js con core + solo JavaScript (D009). Ya previsto; **medir en T094**. Si pesa, `CodeBlock` se carga en diferido con T092 |
| **Petición extra de contenido** | La pieza obliga a cargar la sesión recomendada. Encaja con el lazy loading por topic (D005), pero es **una petición más en la ruta crítica del dashboard** |
| **Impacto móvil** | 151 nodos y 1693 px. Sin gráficos, sin SVG de datos, sin listas largas |
| **Efectos caros** | Cero. Sin blur, sin degradados, sin sombras difuminadas |

---

## Prototype

`design-lab/visual/final-diagnostico.html` — servido en
**http://127.0.0.1:4180/visual/final-diagnostico.html**
Comparador con las diez direcciones: **http://127.0.0.1:4180/visual/**

Fuente editable: `design-lab/visual/parts/final-diagnostico.part` + `build.py`.

**Seis estados** conmutables desde la barra del laboratorio o por URL
(`?state=…`): `mej` · `att` · `ok` · `early` · `empty` · `pend`.
`?chrome=0` oculta la barra del laboratorio.

### Verificación ejecutada

**5 breakpoints × 6 estados = 30 combinaciones**, en Chromium:

- Cero desbordamiento horizontal del documento.
- Exactamente **un `<h1>` visible** en cada combinación.
- Todos los estados pintan contenido.
- **Cero objetivos táctiles por debajo de 44 px** en 320 y 390.
- Jerarquía de encabezados sin saltos.
- Contraste AA en los tres estados y en la tinta de sus tres CTA.

### Comparación D07 original ↔ final

| Criterio | D07 solo | **D07 + pieza D10** | Veredicto |
|---|---|---|---|
| **Claridad** | Alta: el veredicto se entiende | **Mayor**: el problema deja de ser abstracto | ✅ mejora |
| **Comprensión** | Sabes *qué* falla | **Sabes *por qué*, línea a línea** | ✅ mejora clara |
| **Utilidad** | Te dice qué corregir | **Te enseña qué vas a encontrar** antes de pulsar | ✅ mejora |
| **Densidad** | Muy baja (3 superficies) | Media-baja (10) | ⚠️ sube, aceptable |
| **Diferenciación** | Alta | **Máxima**: ninguna otra plataforma pone el código en el dashboard | ✅ mejora |
| **Accesibilidad** | Excelente | **Igual**: +2 interactivos, código con scroll propio, notas textuales por línea | ➖ sin cambio |
| **Responsive** | Excelente | **Igual**: el código desplaza dentro de su caja | ➖ sin cambio |
| **Performance** | 105 nodos | 151 nodos, +1 petición de contenido | ⚠️ coste real |
| **Implementación** | Baja | **Media**: `CodeBlock` + `errorLines` + carga de la sesión | ⚠️ coste real |

**Qué aporta D10 exactamente.** Convierte una afirmación estadística («fallas
por async, 11 veces») en una **prueba verificable** («línea 8: el `await` no
recibe el array, recibe el error»). Ese salto es lo que separa un panel de
métricas de una herramienta de aprendizaje, y es exactamente lo que §10 pide
con «code presentation excellence».

**Qué problemas puede introducir.**
1. **Una petición de contenido más** en la ruta crítica del dashboard.
2. **Riesgo de spoiler**: si la pieza mostrada es el paso que el usuario va a
   resolver, se le adelanta parte del ejercicio. *Mitigación aplicada:* se
   muestra el paso `find-error` con sus `errorLines` **ya reveladas** y la
   explicación escrita — es decir, se usa como **material didáctico**, no como
   examen; el ejercicio real empieza en el paso 1.
3. **La pieza puede eclipsar el veredicto** si crece. *Mitigación:* máximo
   **9 líneas** y **3 líneas marcadas**.
4. **Dependencia del contenido**: si una sesión no tiene paso `find-error`, no
   hay `errorLines` que marcar. *Mitigación:* ver *Component Inventory*.

---

## Handoff

> Suficiente para implementar sin reinterpretar el diseño. **No autoriza la
> implementación.**

### Component Inventory

En `src/features/dashboard/components/`, respetando §16:

| Componente | Responsabilidad | Props clave | §16 |
|---|---|---|---|
| `DiagnosisVerdict` | Glifo + palabra + titular + párrafo + evidencia | `state: 'ok'\|'att'\|'mej'`, `headline`, `explanation`, `evidence[]` | *(nuevo)* |
| `VerdictBadge` | Glifo + palabra + grosor de filete | `state` | *(nuevo)* |
| `PrincipalFinding` | Nombre del concepto, ruta, dominio, precisión, tipo de error | `concept`, `topicId`, `domain`, `accuracy`, `errorType`, `failCount` | *(nuevo)* |
| `EvidencePiece` | Barra de fichero + código + notas de línea + CTA | `sessionId`, `step`, `markedLines[]`, `notes[]` | *(nuevo)* |
| `LineNotes` | Explicación por línea marcada | `notes: {line, text}[]` | *(nuevo)* |
| `ResumeSession` | Reanudación desde `sessionStorage`. **Sustituye** a `EvidencePiece` | — | *(nuevo)* |
| `FindingsList` | Hallazgos secundarios con severidad textual | `findings[]` | `WeakConcepts.tsx` |
| `SecondaryMetrics` | Dos líneas al pie | `metrics` | `ProgressOverview.tsx` |

Reutiliza `CodeBlock` (D009/D010), `DifficultyBadge`, `EmptyState`,
`ErrorBoundary`. **No** usa `Progress` de shadcn: no hay barras de progreso en
esta dirección salvo la de pasos de `ResumeSession`.

### Datos — todos derivables, sin entidades nuevas

```
VERDICTO
  estado         regla determinista (ver Verdict System)
  headline       plantilla + Δdominio (ConceptProgress.domain, ventana 7 d)
                 + tipo de error dominante (recentErrors[].errorType)
  explanation    % de fallos por tipo + nº de topics afectados
  evidence       domain antes→después · precisión antes→después
                 · sesiones e intentos de la semana · nº de regresiones

DIAGNÓSTICO PRINCIPAL
  ordenar ConceptProgress por domain asc, desempate por lastPracticed asc
  y por recientes en recentErrors  → NO es spaced repetition (§5, Fase 2)

PIEZA
  IContentRepository → sesión del concepto diagnosticado
  seleccionar el step con errorLines !== null  (solo find-error lo declara)
  fallback: primer step con code !== null, SIN líneas marcadas
  markedLines = step.errorLines
  notes       = contenido AUTORADO junto al ejercicio (ver más abajo)

HALLAZGOS   ConceptProgress agrupado por topicId, severidad por umbral
MÉTRICAS    media de domain · totales de CompletedSession y Attempt
PENDIENTE   sessionStorage['codegym:session']  (§21)
```

**Precisión importante.** El copy **no** puede decir «has fallado estas líneas
tres veces»: para una sesión que el usuario aún no ha hecho eso es
inverificable. Lo derivable es (a) **dónde vive el error**, vía
`ExerciseStep.errorLines`, y (b) que **ese tipo de error** lo falla, vía
`ConceptProgress.recentErrors`. El copy del prototipo respeta esa distinción.

### Contenido nuevo que hay que escribir

No es código. Es contenido, y alguien tiene que redactarlo:

1. **Plantillas de veredicto** por combinación de `estado × errorType
   dominante`. Con los 8 tipos de §6 y 3 estados: hasta 24 frases. Se puede
   empezar con las 4–5 combinaciones reales del contenido de MVP.
2. **Notas de línea** por step con `errorLines`. Una frase por línea marcada.
   Es material didáctico y **debería vivir junto al ejercicio en su JSON**, no
   en el componente. Sugerencia: `errorLineNotes: { [line: number]: string }`.
   ⚠️ Esto **sí es un campo nuevo de contenido**; requiere decisión.

### Tokens — no hace falta tocar `index.css`

| Necesita | Hoy en el proyecto | Acción |
|---|---|---|
| Fondo negro neutro | `--bg-primary` `#0a0a0f` | **Usarlo tal cual.** La diferencia con `#0a0a0a` es imperceptible |
| Superficie de código | `--code-bg` / `--code-border` | Ya existen (§12) |
| Verde / ámbar / rojo de estado | `--success` `--warning` `--error` | **Ya existen.** Mapear `OK→success`, `ATENCIÓN→warning`, `MEJORA→error` |
| Tinta sobre el CTA de estado | — | Usar `--bg-primary` sobre los tres. Contraste verificado ≥7:1 |
| Ausencia de color de marca | `--accent` / `--accent-text` existen | **Regla de uso**, no cambio de token: el Dashboard **no consume** `text-primary` ni `bg-primary` |

**Consecuencia: cero ADR nuevos.** La única variación cromática frente al
prototipo es que `MEJORA` usaría `--error` `#ef4444` (5,25:1 sobre
`--bg-primary`) en vez de `#ff6b6b` (7,13:1). Ambos cumplen AA; conviene
verificarlo al implementar.

### States

| Estado | Veredicto | Sección 5–7 | Hallazgos | CTA |
|---|---|---|---|---|
| `loading` | Skeleton con la silueta del veredicto | Skeleton del bloque de código | Skeleton de 3 filas | Oculto. `aria-busy` + `aria-live="polite"` |
| `empty` | **Sin badge de estado.** `h1` = «Todavía no hay nada que diagnosticar» | Sin pieza | Sin hallazgos | «Empezar la primera sesión →», neutro (`--fg`) |
| `early` (<10 sesiones) | `ATENCIÓN` · «Tres sesiones todavía no son un diagnóstico» | Pieza como **continuidad**, no corrección | Ocultos | «Continuar en Arrays →» |
| `ok` | `OK` | «Siguiente reto» | Solo `ok` / `omitido` | «Seguir entrenando →» |
| `att` | `ATENCIÓN` | «Señal a revisar» | 1 señal + `ok` | «Practicar esto →» |
| `mej` | `MEJORA` | «Diagnóstico principal» | Principal + `atención` + `ok` | «Corregir esto →» |
| `pending` | El del estado que corresponda | `ResumeSession` **sustituye** a la pieza + línea «el diagnóstico te espera al terminar» | Se mantienen | «Continuar donde lo dejaste →» + «Empezar de nuevo» |
| `error` (fallo de lectura) | Severidad de la propia carga; se indica **qué falta** | Se muestra si hay contenido | Los disponibles | Sin cambio |

### CTA

- **Uno solo** primario por pantalla. Sólido, 50 px de alto, color del estado.
- Etiqueta **verbal y específica** del estado: nunca «Empezar» genérico.
- Secundario siempre presente, de borde: «Ver otro hallazgo» / «Elegir otra».
- En móvil, ambos a ancho completo y apilados; el primario arriba.
- Feedback de pulsación (`translateY(1px)`) **se conserva** con
  `prefers-reduced-motion`.

### Rejected Elements

Rechazado explícitamente. No reintroducir sin decisión previa:

| Elemento | Motivo |
|---|---|
| Racha / streak | §4 y §23 lo excluyen del MVP. Decisión del usuario: no introducirlo |
| XP, niveles, logros, objetivos semanales | Gamificación, Fase 2 (§5) |
| Fila de KPIs arriba | Es el patrón SaaS que motivó todo el rediseño |
| Tarjetas para métricas | P1 de los problemas detectados |
| Barras de progreso para toda métrica | P3. Solo sobrevive la de pasos en `ResumeSession` |
| Gráfico de evolución temporal | Material de `ReviewPage`/`ResultsPage`, no del dashboard |
| Heatmap de actividad | Idem |
| Color de marca (`--accent`) en la página | Contradice la tesis: el único color es la escala de estado |
| Sombras, blur, degradados, glow | Cero coste visual sin beneficio UX |
| Marginalia lateral a 1280 px | Exigiría romper los 900 px de §11 sin ganancia real |
| Animación de contadores | Contradice el papel secundario de las métricas del pie |
| Renombrar la navegación a «Diagnóstico» | Decisión del usuario: sigue siendo «Progreso» |

### Decisiones pendientes antes de implementar

| # | Decisión | Quién |
|---|---|---|
| 1 | **`errorLineNotes` en el JSON de contenido**: campo nuevo para las notas por línea. Es la única ampliación que esta dirección pide | Producto + Arquitectura |
| 2 | Quién redacta las **plantillas de veredicto** por estado × tipo de error | Producto |
| 3 | Umbrales exactos de severidad (aquí: domain <40, ≤2 intentos, ventana 30 d) | Producto |
| 4 | ¿Se carga la sesión recomendada en el dashboard, o se difiere hasta el hover/foco del CTA? | Arquitectura |
| 5 | ¿Se registra que la recomendación es **ordenación determinista**, no SRS? | Arquitectura |
| 6 | `MEJORA` con `--error` `#ef4444` (5,25:1) frente al `#ff6b6b` del prototipo (7,13:1) | Diseño |

### Lo que esta fase NO ha hecho

No se ha modificado `src/`, `package.json`, el router, componentes, tokens,
tipos ni lógica. No se han creado rutas ni componentes reales. No se ha
alterado el Master Plan ni `DECISIONS.md`. No se ha iniciado T016.

**Esto es una especificación. La implementación requiere tu autorización.**

---

*Dirección final derivada de `CODEGYM-DASHBOARD-VISUAL-EXPLORATION.md`.
Motion evaluado con `animation-performance-engineering`. Prototipo verificado en
Chromium sobre 5 breakpoints × 6 estados: sin desbordamiento, sin objetivos
táctiles por debajo de 44 px, jerarquía de encabezados sin saltos y contraste AA
en los tres estados.*
