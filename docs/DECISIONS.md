# Architecture Decision Records — CodeGym

Registro canónico de decisiones técnicas del proyecto, previsto en el Master
Plan §38. El Master Plan §46 conserva un resumen; **este archivo es la fuente
de verdad** de las decisiones y su justificación.

D001–D006 se trasladan desde §46 sin alterar su significado. D007–D011 se
registran a partir de la auditoría de transferencia y del bloque de corrección
T015.1–T015.12.

| ID | Título | Estado |
|---|---|---|
| D001 | Web Worker sobre iframe sandbox | Accepted |
| D002 | Repository pattern sobre localStorage directo | Accepted |
| D003 | CSS animations sobre Framer Motion | Accepted |
| D004 | useState+useReducer sobre Zustand | Accepted |
| D005 | Lazy loading por topic sobre carga completa | Accepted |
| D006 | sessionStorage para recovery sobre localStorage | Accepted |
| D007 | Escala de acento accesible | Accepted |
| D008 | Jerarquía de tokens | Accepted |
| D009 | Highlighting y estrategia de fuentes | Accepted |
| D010 | Primitives de shadcn/Radix en components/ui | Accepted |
| D011 | ESLint 9 con flat config | Accepted |
| D012 | isCorrect en UserAnswer | Accepted |
| D013 | Escala del dominio y factores inyectados | Accepted |
| D018 | Finalización coordinada de sesión y dominio diferido | Accepted |

---

# D001 — Web Worker sobre iframe sandbox

## Context
El tipo de ejercicio Fix Code necesita ejecutar código escrito por el usuario.

## Decision
Ejecutar el código en un Web Worker.

## Alternatives
- `eval()` en el thread principal
- iframe sandbox
- Web Worker
- Servicio externo

## Rationale
`eval()` y `new Function()` en el thread principal no proporcionan aislamiento
real. El iframe sandbox añade complejidad de comunicación (doble `postMessage`)
sin beneficio significativo para un contexto educativo local. Un servicio
externo añade dependencia y latencia. El Web Worker proporciona aislamiento del
thread principal, timeout fiable vía `terminate()`, y es suficiente para un MVP
educativo donde el código es del propio usuario.

## Consequences
El Worker puede hacer fetch externo y consumir CPU durante el periodo previo al
timeout. Aceptado para el MVP.

## Status
Accepted

**Tareas:** T038–T045 · **Master Plan:** §25, §26, §28

---

# D002 — Repository pattern sobre localStorage directo

## Context
El MVP usa localStorage; la Fase 2 usará Supabase.

## Decision
Acceder a la persistencia a través del patrón Repository.

## Alternatives
- localStorage directo en los hooks
- Repository pattern

## Rationale
Sin la abstracción, migrar a Fase 2 requeriría modificar cada componente que
accede a datos. Con la abstracción, solo se cambia la implementación del
repository.

## Consequences
Un archivo adicional por repository. Coste mínimo, beneficio alto.

## Status
Accepted

**Tareas:** T019, T046–T049 · **Master Plan:** §20, §35

---

# D003 — CSS animations sobre Framer Motion

## Context
El MVP necesita animaciones.

## Decision
Usar animaciones y transiciones CSS.

## Alternatives
- CSS animations
- Framer Motion

## Rationale
Framer Motion añade ~30KB al bundle. Para las animaciones necesarias en el MVP
(fade, slide, shake, pulse), CSS es suficiente. Si en Fase 3 se necesitan
animaciones complejas (layout animations, drag, gestures), se puede añadir
Framer Motion entonces.

## Consequences
Algunas animaciones complejas (como el stagger de listas) requieren más CSS que
JavaScript. Aceptable para el MVP.

## Status
Accepted

**Tareas:** T071–T077 · **Master Plan:** §13, §37

---

# D004 — useState+useReducer sobre Zustand

## Context
El MVP necesita estado global.

## Decision
useState + useReducer + Context.

## Alternatives
- useState + useReducer + Context
- Zustand
- Redux

## Rationale
La complejidad del estado en el MVP no justifica un store externo. UI state =
`useState`. Session state = `useReducer`. Progress/Content = Context. Si en
Fase 2 la complejidad crece, se puede migrar a Zustand.

## Consequences
Posible prop drilling en algunos casos. Se mitiga con Context.

## Status
Accepted

**Tareas:** T027, T028, T049 · **Master Plan:** §18

---

# D005 — Lazy loading por topic sobre carga completa

## Context
El contenido es estático, en archivos JSON.

## Decision
Cargar el contenido de forma diferida, por topic.

## Alternatives
- Cargar todo al inicio
- Lazy load por topic

## Rationale
Cargar todo el contenido de JavaScript al inicio (~30–50KB) es innecesario. Cada
topic carga solo cuando el usuario lo selecciona (~3–10KB). La experiencia es
más rápida.

## Consequences
Pequeño retardo al seleccionar un topic nuevo. Se mitiga con caché en memoria.

## Status
Accepted

**Tareas:** T019–T021, T093 · **Master Plan:** §8, §31

---

# D006 — sessionStorage para recovery sobre localStorage

## Context
Hay que recuperar la sesión activa tras una recarga.

## Decision
Guardar el estado de la sesión activa en sessionStorage.

## Alternatives
- localStorage
- sessionStorage
- No recuperar

## Rationale
La sesión activa es temporal. Si el usuario cierra la pestaña deliberadamente,
no debe recuperarse. sessionStorage se limpia al cerrar la pestaña, que es el
comportamiento deseado. localStorage preservaría sesiones abandonadas
indefinidamente.

## Consequences
Si el usuario cierra la pestaña, pierde la sesión activa. Esto es intencional.

## Status
Accepted

**Tareas:** T052 · **Master Plan:** §21

---

# D007 — Escala de acento accesible

## Context
El Master Plan fijaba dos requisitos incompatibles entre sí: §12 definía
`--accent: #6366f1` y §14 exige contraste ≥ 4.5:1 para texto normal (WCAG 2.1
AA). Ratios medidos sobre la paleta del plan:

| Uso | Ratio | AA texto |
|---|---|---|
| `#6366f1` como texto sobre `--bg-primary` | 4.42:1 | no |
| `#6366f1` como fondo + texto `#f0f0f5` | 3.93:1 | no |
| `#6366f1` como fondo + texto `#0a0a0f` | 4.42:1 | no |

La restricción determinante es la segunda: **ningún color de texto alcanza AA
sobre `#6366f1`**. En el estado auditado esto afectaba a 9 usos de
`text-primary` (NavLink activo y wordmark en las tres navegaciones) y al único
botón del proyecto.

## Decision
Dos tonos de acento con roles excluyentes:

```
--accent:      #6366f1   marca. NO textual.
--accent-text: #818cf8   texto, interacción y superficie de botón primario.
```

- `#6366f1` → bordes, iconos, focus ring, glows y superficies decorativas. Le
  basta el 3:1 de elementos no textuales, que cumple (4.42:1).
- `#818cf8` → texto de acento, estados activos y superficie de los botones
  primarios, con `--bg-primary` como color de texto (6.62:1).
- Nunca blanco sobre `#6366f1`.

En la capa semántica, `--primary` deriva de `--accent-text` y `--ring` de
`--accent`.

## Alternatives
1. Aclarar el acento a `#818cf8` y retirar `#6366f1`.
2. Conservar `#6366f1` restringiendo su uso por convención.
3. Doble token con roles excluyentes.
4. Aceptar AA parcial y documentar la excepción.

## Rationale
La opción 3 conserva el acento del Master Plan sin renunciar a WCAG AA.
`#818cf8` no es un color nuevo: §12 ya lo definía como `--accent-hover`, así que
la identidad visual no se altera. Frente a la opción 2, la regla la hace cumplir
el sistema de tokens y no la disciplina de cada componente a lo largo de más de
40 tareas de UI. Frente a la opción 4, evita que el fallo aparezca en T082/T090
(axe-core) y T095 (Lighthouse) con toda la interfaz ya construida.

## Consequences
- El botón primario deja de ser `#6366f1` sólido con texto claro y pasa a
  `#818cf8` con texto `#0a0a0f`.
- `--accent-hover` queda como alias de `--accent-text`: mismo valor, un solo
  literal.
- Los 12 pares de texto normal del proyecto cumplen AA, verificado sobre los
  valores resueltos del CSS construido.
- Deuda conocida: `.hljs-comment` usa `--text-muted` sobre `--code-bg` y da
  3.09:1. No se corrige aquí porque exige decidir el tono de los comentarios de
  código —`--text-secondary` los igualaría a `hljs-params` y perdería
  jerarquía— y `CodeBlock` todavía no se renderiza en ninguna página. Se
  traslada a T026.

## Status
Accepted

**Tareas:** T015.7 (corrige T009) · **Master Plan:** §12, §14

---

# D008 — Jerarquía de tokens

## Context
La implementación mantenía dos paletas independientes: los tokens hex del Master
Plan §12 y una capa HSL de shadcn con valores propios. Consecuencias concretas:

- `--background` (#0e0e10) y `--bg-primary` (#0a0a0f) eran **colores distintos**
  para el mismo concepto.
- `--accent` estaba sobrescrito con el triplete `239 84% 67%`, lo que lo
  invalidaba como color: `color: var(--accent)` no producía nada. Su vecino
  `--accent-hover` seguía en hex.
- Los componentes mezclaban ambos sistemas sin criterio.
- `--space-*` y `--radius-*` no tenían consumidor y duplicaban escalas que
  Tailwind ya proporciona.

## Decision
Cuatro capas, con un único valor por concepto visual:

```
CAPA 1  PRIMITIVAS   §12. Fuente única de verdad. Un literal por concepto.
   ↓
CAPA 2  SEMÁNTICAS   contrato shadcn. Derivadas con var(), sin literales.
   ↓
CAPA 3  TAILWIND     tailwind.config.js → hsl(var(--semántica))
   ↓
CAPA 4  COMPONENTES  utilidades: bg-background, text-foreground, text-success…
```

**Los componentes consumen la capa semántica**, no las primitivas. Leer una
primitiva directamente exige justificación escrita; hoy la única excepción es el
bloque de resaltado de código en `index.css`, cuyos tonos no tienen equivalente
en la capa semántica de shadcn.

Decisiones de detalle:

- **Formato.** Las primitivas de color se declaran como canales HSL
  (`240 20% 5%`), no como hex. Es lo que permite derivarlas con `var()` y lo que
  Tailwind necesita para inyectar modificadores de opacidad
  (`bg-primary/20` → `hsl(var(--primary) / .2)`). Cada token documenta su hex en
  un comentario; las 15 conversiones reproducen el hex de §12 exactamente.
- **Colisión de nombres.** En shadcn, `accent` significa «superficie sutil de
  hover/activo», no «color de marca». El slot semántico se llama
  `--surface-hover` y `tailwind.config.js` mapea la utilidad `accent` a él. El
  color de marca se expone como `brand`.
- **`--space-*`.** Retirados: la escala de §12 es idéntica a la de Tailwind.
  §12 sigue siendo la especificación; el consumo es vía utilidades.
- **`--radius-*`.** Conservados y activados: `tailwind.config.js` los consume
  directamente, sustituyendo al `--radius` de shadcn.

## Alternatives
1. Tomar §12 como canónico y renunciar al contrato de shadcn.
2. Tomar shadcn como canónico y retirar los tokens de §12.
3. Derivar la capa de shadcn a partir de §12.

## Rationale
La opción 3 es la única que conserva a la vez la paleta del Master Plan y el
contrato de shadcn, con un solo valor por concepto. La 1 obligaría a reescribir
cada componente de shadcn que se añada. La 2 desecharía la especificación de
color del proyecto.

## Consequences
- `:root` no contiene ningún literal hex: solo canales HSL y derivaciones
  `var()`. No existe una segunda paleta.
- Ningún componente lee `var(--primitiva)`.
- `rounded-md` pasa de 6px a 8px y `rounded-lg` de 8px a 12px, alineándose con
  §12.
- Añadir un color nuevo obliga a decidir en qué capa vive.

## Status
Accepted

**Tareas:** T015.7 (corrige T003 y T009) · **Master Plan:** §12

---

# D009 — Highlighting y estrategia de fuentes

## Context
Dos elecciones tomadas durante T010 y T013 no quedaron registradas, y ninguna
figuraba en la lista de dependencias del Master Plan §37.

**Resaltado de código.** §32 establece que CodeMirror trae su propio
highlighting para el editor, y que `CodeBlock` (lectura) debe usar «CSS con
`font-family: var(--font-mono)` + highlighting básico o librería ligera». T013
eligió highlight.js sin dejar constancia del motivo.

**Fuentes.** §32 pide Inter y JetBrains Mono self-hosted desde Google Fonts.
T010 las cargó vía `@fontsource` importando el fichero por peso, que declara
todos los subsets: el build producía 60 archivos de fuente (~950 KB) y 42 kB de
CSS para una interfaz en español.

## Decision
**Highlighting:** highlight.js en `CodeBlock`, importando solo el core y el
lenguaje JavaScript (`highlight.js/lib/core` + `lib/languages/javascript`), con
los colores de los tokens definidos con las primitivas del proyecto en
`index.css`.

**Fuentes:** Inter y JetBrains Mono self-hosted vía `@fontsource`, cargando
únicamente el subset `latin` y solo los pesos en uso: Inter 400/500/600/700 y
JetBrains Mono 400/500, todos con `font-display: swap`.

## Alternatives
**Highlighting:** CSS + tokenizador propio · highlight.js · Prism · Shiki.
La elección original de T013 no dejó registro de comparación; este ADR la
formaliza y fija la condición para revisarla.

**Fuentes:** importar el peso completo con todos los subsets · importar solo
`latin` · importar `latin` + `latin-ext`.

## Rationale
**Highlighting.** highlight.js con importación selectiva de core + un lenguaje
satisface la restricción de §32 («librería ligera») sin escribir un tokenizador
propio, que sería código a mantener para un producto cuyo valor está en el
contenido, no en el resaltado. Hoy no pesa nada en el bundle porque `CodeBlock`
aún no tiene consumidores y se elimina por tree-shaking; entrará en T026.

**Fuentes.** Se verificó, en lugar de asumir, que el subset `latin` basta: su
`unicode-range` cubre los 30 caracteres del repertorio español (acentos, ñ,
diéresis, signos de apertura, comillas tipográficas, guiones, €) y los 6
caracteres no ASCII presentes en el código. `latin-ext` cubre checo, polaco y
turco, que CodeGym no usa. Además, los ficheros por subset de `@fontsource` no
declaran `unicode-range`, de modo que un carácter fuera de `latin` caería en
`system-ui` en lugar de fallar. El peso 600 se añade porque el proyecto usa
`font-semibold`: sin él, el navegador subía a 700 y `font-semibold` y
`font-bold` se veían idénticos.

## Consequences
- El build pasa de 60 ficheros de fuente (~950 KB) a 12 (328 KB), y el CSS de
  42,34 kB a 14,05 kB.
- Añadir un idioma con caracteres fuera de `latin` obligará a revisar los
  subsets importados.
- Añadir un peso tipográfico nuevo obliga a importarlo explícitamente.
- El coste real de highlight.js en el bundle debe medirse en T094; si resulta
  alto, `CodeBlock` puede cargarse de forma diferida junto con T092.

## Status
Accepted

**Tareas:** T010, T013, T015.5 · **Master Plan:** §31, §32, §37

---

# D010 — Primitives de shadcn/Radix en components/ui

## Context
`components/ui/Progress.tsx` era una implementación propia dentro de la carpeta
que §16 reserva a los primitives de shadcn. En macOS, con sistema de ficheros
insensible a mayúsculas, `shadcn add progress` habría colisionado con ese
archivo. Además, el CLI de shadcn nunca se había ejecutado con éxito: escribía
en un directorio literal `@/` en la raíz del proyecto porque el `tsconfig.json`
raíz solo contenía `references`, sin `compilerOptions.paths`.

## Decision
`src/components/ui/` contiene exclusivamente primitives generados por el CLI de
shadcn; los componentes propios de CodeGym viven en `src/components/codegym/`.
Se adopta el `Progress` oficial basado en Radix y se retira la implementación
propia. El `tsconfig.json` raíz declara `compilerOptions.paths` —sin `baseUrl`—
para que el CLI resuelva los alias.

## Alternatives
- Mover el componente propio a `components/codegym/` y no usar shadcn para
  Progress.
- Adoptar el primitive oficial de shadcn/Radix.

## Rationale
§12 lista Progress entre los componentes base de shadcn. Adoptar el primitive
oficial elimina la colisión de nombres, aporta la semántica accesible de Radix y
—sobre todo— deja verificado de extremo a extremo que el CLI de shadcn funciona
en este proyecto, que era la parte de T003 que nunca se había comprobado.

## Consequences
- Se añade `@radix-ui/react-progress` como primera dependencia de Radix. Los
  siguientes primitives traerán la suya; no se instala el catálogo completo.
- Los primitives se generan con el estilo del CLI (comillas dobles, sin punto y
  coma), distinto del resto del proyecto. Es deliberado: señala qué código es
  vendorizado.
- El proyecto **posee** el código generado y puede editarlo. Ya fue necesario:
  el snippet oficial destructura `value` y no lo reenvía a
  `ProgressPrimitive.Root`, de modo que Radix devolvía
  `data-state="indeterminate"` y ningún `aria-valuenow` para cualquier valor —
  una barra que se mueve pero no anuncia nada. Se corrigió pasando
  `value={value}` al Root.
- Al actualizar un primitive con el CLI hay que revisar si se pierde una
  corrección local como esa.
- El nombre accesible lo aporta el consumidor vía `aria-label`, como en shadcn.

## Status
Accepted

**Tareas:** T015.9 (cierra T003, corrige T012) · **Master Plan:** §12, §16

---

# D011 — ESLint 9 con flat config

## Context
El Definition of Done (§44), el checklist de QA (§45) y los checkpoints de §39
exigen «lint limpio», pero el proyecto no tenía linter: el requisito era
inverificable en las 15 tareas entregadas y en todas las siguientes. §37 tampoco
listaba ESLint entre las dependencias.

## Decision
ESLint 9 con flat config, apoyado en conjuntos oficiales recomendados:
`@eslint/js` recomendado, `typescript-eslint` recomendado,
`eslint-plugin-react-hooks` (flat recommended) y `eslint-plugin-react-refresh`
(config `vite`). Dos bloques: código de aplicación con globals de navegador y
archivos de configuración con globals de Node. Script
`"lint": "eslint . --max-warnings 0"`. Sin Prettier.

## Alternatives
- Sin linter (estado anterior).
- ESLint 9 flat config con conjuntos recomendados.
- ESLint con reglas type-checked (`recommendedTypeChecked`).
- Añadir Prettier.

## Rationale
Los conjuntos oficiales dan cobertura real sin convertir la configuración en una
lista de reglas arbitrarias. Se descartan las reglas con type-checking porque
`tsc -b` ya cubre ese terreno con `strict`, `noUnusedLocals` y
`noUnusedParameters`, y duplicarlo solo añadiría lentitud. Prettier queda fuera
para no ampliar el alcance del bloque de corrección.

## Consequences
- Todo código futuro debe pasar `no-explicit-any`, `no-unused-vars`,
  `rules-of-hooks` y `exhaustive-deps` como errores. Es relevante a partir de
  T020, T027 y T049, donde entran hooks, contextos y un reducer.
- `--max-warnings 0` convierte cualquier warning en fallo, incluido
  `exhaustive-deps`.
- La regla `react-refresh/only-export-components` restringe qué puede exportar
  un archivo con componentes.
- El formateo no está automatizado: la consistencia de estilo depende de la
  revisión hasta que se decida sobre Prettier.

## Status
Accepted

**Tareas:** T015.10 · **Master Plan:** §37, §39, §44, §45

---

# D012 — isCorrect en UserAnswer

## Context

El Master Plan se contradice a sí mismo entre tres secciones.

§24 define la puntuación de una sesión así:

```ts
calculateScore(session: ExerciseSession, answers: UserAnswer[]): SessionScore;

function calculateScore(session, answers): SessionScore {
  const correct = answers.filter(a => a.isCorrect).length;
  ...
}
```

El cuerpo filtra por `a.isCorrect`, pero la firma recibe `UserAnswer[]`, y el
`UserAnswer` de §17 no tiene ese campo. Lo tiene `Attempt`, que es otro tipo. La
función, tal como está escrita, no compila contra su propia firma.

El problema no se limita al scoring. §21 guarda en sessionStorage
`answers: UserAnswer[]`, y §23 establece que cada respuesta de cada step se
guarda como `Attempt`, construyéndolos al completar la sesión a partir de ese
estado. Como `Attempt.isCorrect` es obligatorio y `UserAnswer` no lo aporta, **el
historial de intentos no tiene de dónde sacar la corrección**. El modelo estaba
incompleto con independencia de T024.

Tampoco puede recalcularse en el momento de puntuar: la corrección de un paso
`fix-code` exige ejecutar el código del usuario en el Worker (D001), que no está
disponible desde una función pura de scoring.

## Decision

Añadir `isCorrect: boolean` a `UserAnswer`, entre `answer` y `timeSpentMs`.

Lo fija el engine al validar la respuesta: el `isCorrect` de `ValidationResult`
(T023) pasa al `UserAnswer` que la UI despacha con `SUBMIT_ANSWER`.

## Alternatives

1. Cambiar el parámetro de `calculateScore` a `Attempt[]`, que ya tiene el campo.
2. Pasar la corrección aparte, como un array de booleanos paralelo.
3. **Añadir `isCorrect` a `UserAnswer`.**
4. Recalcular la corrección dentro de `calculateScore`.

## Rationale

La opción 1 no sirve porque §21 crea los `Attempt` *al completar* la sesión: en
el momento de puntuar todavía no existen. La 2 salva el scoring pero deja el
hueco de `Attempt.isCorrect` sin resolver. La 4 es imposible para `fix-code`.

La 3 es la única que cierra las tres secciones a la vez, y es además lo que el
pseudocódigo de §24 ya asumía. El coste fue mínimo porque al aplicarla no
existía ningún productor de `UserAnswer` en el proyecto: cero literales que
actualizar y cero compilaciones rotas.

## Consequences

- `SessionState.answers` y el payload de `SUBMIT_ANSWER` heredan el campo sin
  tocarse: citan el tipo por nombre.
- Quien despache `SUBMIT_ANSWER` (T027/T028) debe rellenar `isCorrect` con el
  resultado del engine. El reducer sigue siendo un almacén, sin validar nada.
- T050 puede construir los `Attempt` directamente desde las respuestas.
- La recuperación de sesión de §21/T052 conserva qué respuestas eran correctas;
  antes se habría perdido al recargar.
- El payload de sessionStorage crece un booleano por respuesta.

## Status

Accepted

**Tareas:** T024 (corrige T011) · **Master Plan:** §17, §21, §23, §24

---

# D013 — Escala del dominio y factores inyectados

## Context

§22 es la única sección que especifica el cálculo de dominio, y no se puede
implementar tal como está escrita.

**Contradicción numérica.** El único factor con fórmula es
`precision = correctAttempts / totalAttempts`, es decir un ratio 0..1. Si los
cinco factores son ratios, la suma ponderada está acotada a 0..1, y
`clamp(0, 100, round(suma))` solo puede devolver 0 o 1:

```
perfecto  (todos los factores a 1)  → round(1.0) = 1     ← debería ser 100
medio     (todos a 0.5)             → round(0.5) = 1     ← debería ser ~50
```

Pero `ConceptProgress.domain` está documentado como 0-100 y el propio `clamp`
acota a 100. Falta escalar por 100.

**Tres de los cinco factores no tienen fórmula.** Cada uno aparece exactamente
dos veces en todo el Master Plan: la línea de la suma y su fila en la tabla.

| Factor | Lo que dice §22 | ¿Implementable? |
|---|---|---|
| `precision` | `correctAttempts / totalAttempts` | Sí |
| `errorRate` | "Ratio de errores recientes vs total" | Parcial: "recientes" no está definido |
| `diffScore` | "Ponderado por dificultad de ejercicios resueltos" | No: no hay tabla de pesos |
| `recency` | "Ejercicios recientes pesan más" | No: no hay curva de decaimiento |
| `consistency` | "Practicar en días separados > todo de golpe" | No: no hay métrica |

**Dos de ellos ni siquiera tienen datos.** `recency` exige comparar
`lastPracticed` con el momento actual, y el cálculo debe ser determinista, así
que necesitaría una fecha de referencia inyectada. `consistency` exige saber en
cuántos días distintos se ha practicado, y `ConceptProgress` guarda una única
fecha; `recentErrors[].timestamp` solo cubre los errores, no la práctica.

Implementar §22 al completo habría exigido inventar seis cosas: la escala, los
pesos por dificultad, la ventana de errores recientes, la curva de recency, la
métrica de consistency y los datos que la alimentan.

## Decision

**Escala.** Los factores viajan en 0..1 y el resultado se escala por 100:

```
domain = clamp(0, 100, round(weightedScore * 100))
```

Así el usuario perfecto obtiene 100, el medio ~50 y el mínimo 0.

**Pesos.** 35 / 25 / 20 / 10 / 10, con esta asignación:

```
weightedScore = precision   * 0.35
              + errorRate   * 0.25
              + diffScore   * 0.20
              + recency     * 0.10
              + consistency * 0.10
```

Difiere de §22 en dos puntos deliberados: los pesos de `diffScore` y `errorRate`
quedan intercambiados respecto al texto original, y el término se escribe
`errorRate` en lugar de `(1 - errorRate)`. La consecuencia es que **los cinco
factores quedan orientados igual: 1 es siempre el mejor valor**, lo que hace la
fórmula simétrica y comprobable (todos a 1 → 100, todos a 0 → 0, todos a 0.5 →
50). Quien llame debe pasar `errorRate` ya orientado; pasar la tasa de error en
bruto haría que fallar más subiera el dominio.

**Factores inyectados.** `calculateDomain` recibe un `DomainFactors` con los
cinco valores ya calculados. T025 implementa solo la parte inequívoca de §22: la
ponderación, el redondeo y el recorte.

## Alternatives

1. Especificar ahora los cinco factores que faltan (pesos por dificultad,
   ventana de errores, curva de recency, métrica de consistency).
2. **Implementar solo la parte definida, con los factores inyectados.**
3. Aplazar T025 hasta T046–T049, cuando `ConceptProgress` se persista de verdad.

## Rationale

La opción 1 exigía cinco decisiones de producto y un cambio de contrato en
`ConceptProgress` para poder medir la consistencia; es diseñar el sistema de
progreso, no completar una fórmula. La 3 dejaba a T024 sin el punto de inyección
que ya había preparado.

La 2 entrega exactamente lo que §22 cubre sin inventar nada, mantiene la función
pura y determinista, y traslada la derivación de los factores al momento en que
el modelo de datos la soporte.

## Consequences

- `DomainFactors` se declara en `domain-calculator.ts` y no en
  `types/progress.ts`: §16 no prevé un fichero de tipos bajo `lib/progress`, y
  añadirlo a `ConceptProgress` habría cambiado un contrato sin necesidad.
- Nadie calcula todavía los cinco factores. La tarea que lo haga deberá definir
  los pesos por dificultad, la ventana de errores recientes, la curva de recency
  y la métrica de consistency, y probablemente añadir a `ConceptProgress` un
  historial de días de práctica.
- `errorRate` es el nombre que fija la decisión, pero su semántica es "1 = sin
  errores". Si al derivarlo se pasa la tasa en bruto, el dominio se invierte.
- `calculateDomainImpact(previous, next)` recibe los dos dominios ya calculados
  en lugar de la firma `(conceptId, accuracy, difficulty)` que insinuaba §24:
  esa firma no daba acceso a los datos que la fórmula necesita, y resolverla
  desde un `conceptId` habría exigido un repositorio dentro de lógica pura.

## Status

Accepted

**Tareas:** T025 · **Master Plan:** §22, §24

# D014 — Respuesta compuesta en find-error

## Context

El Master Plan describía la validación de `find-error` de dos formas
incompatibles. §7 pide al usuario dos cosas —«Seleccionar línea + clasificar
error»— y la tabla de §24 define la validación como «línea + tipo contra
errorLines + errorType», dos comparaciones. Pero la firma que fija la misma
§24 era `validateSelection(step: ExerciseStep, answer: string)`, un solo
escalar, y §17 tipaba `UserAnswer.answer` como `string | number`, también uno.

El contenido acompaña a §7, no a la firma: los seis pasos `find-error`
declaran `errorLines` poblado y sus enunciados piden las dos cosas
explícitamente («Localiza la línea del error y clasifícalo»).

T023 implementó la mitad que la firma permitía —la clasificación contra
`errorType`— y dejó la comprobación de `errorLines` anotada como decisión de
contrato pendiente. T032, que construye la interfaz del paso, la fuerza.

## Decision

La respuesta de un paso `find-error` es compuesta:

```ts
interface FindErrorAnswer {
  line: number;      // línea 1-based del code del paso
  errorType: string;
}

type StepAnswer = string | number | FindErrorAnswer;
```

`UserAnswer.answer` pasa a ser `StepAnswer` y `validateSelection` acepta
`StepAnswer`. La respuesta es correcta **solo** cuando `line` pertenece a
`step.errorLines` **y** `errorType === step.errorType`. No hay crédito parcial:
`ValidationResult.isCorrect` sigue siendo binario.

`errorLines` se mantiene como `number[]`. La comprobación usa `includes`, así
que un paso con varias líneas válidas se resuelve señalando cualquiera de
ellas sin tocar la regla. La interfaz sigue recogiendo una sola línea: no se
diseña selección múltiple mientras no exista contenido que la necesite.

## Alternatives

- **Segundo parámetro**: `validateSelection(step, answer, line?)`. Cabía en la
  firma sin tocar §17, pero deja `UserAnswer.answer` sin poder registrar la
  línea elegida, y §21 construye los `Attempt` a partir de esas respuestas: la
  mitad de la respuesta se perdería al persistir.
- **Cadena compuesta** (`"3:mutacion"`): no cambia ningún tipo, pero inventa un
  formato de serialización que ninguna sección del plan define, y obliga a
  parsear una respuesta que ya venía estructurada.
- **La línea como presentación**: recoger solo el tipo y resaltar `errorLines`
  en el feedback. Cero cambios de contrato, pero contradice el «Seleccionar
  línea» de §7 y dejaría los seis enunciados pidiendo algo que la interfaz no
  recoge.

## Rationale

Es la única opción en la que el dato viaja entero por toda la cadena —interfaz,
engine, `UserAnswer`, y más adelante `Attempt` en §21— sin serializaciones
inventadas ni información que se pierde por el camino. El coste es ensanchar
dos tipos; a cambio, la firma pasa a decir lo que la tabla de §24 ya describía.

La regla «línea correcta Y tipo correcto» es la lectura literal de esa tabla, y
la binariedad de `ValidationResult` no deja sitio a crédito parcial.

## Consequences

- `validateSelection` lanza si la respuesta no tiene la forma que el tipo del
  paso exige, igual que ya lanzaba con el contenido mal formado: es un fallo de
  programación, no una respuesta errónea.
- `useSession` decide cuándo una respuesta está completa (`canSubmit`), porque
  `find-error` solo puede enviarse con sus dos mitades puestas.
- `FindErrorStep` recoge las dos mitades por separado con `FindErrorSelection`
  (`line: number | null`, `errorType: string | null`) y no lee `errorLines`:
  renderiza igual con una línea errónea que con varias, así que no filtra la
  respuesta.
- Los consumidores que traten `answer` como escalar deben estrecharlo. Hoy solo
  lo lee el reducer, que lo guarda tal cual.

## Status

Accepted

**Tareas:** T023, T032 · **Master Plan:** §17, §24

# D015 — Las tareas de contenido por tipo las satisface T017/T018

## Context

El roadmap tiene dos familias de tarea de contenido con criterios distintos:

- Por topic: `Crear contenido: <Topic> (concept + 3 sesiones)` — T017 Arrays,
  T018 Functions, T063 Closures, T064 Promises, T065 Objects, T066 ES6+ y
  T067 Errors. Son 7 tareas para los 7 topics que dibuja §8: 21 sesiones.
- Por tipo de ejercicio: `Crear ejercicios: <Tipo> (3 sesiones)` — T034 Code
  Reading, T035 Predict Output, T036 Find Error y T043 Fix Code, cada una
  situada junto al componente que renderiza ese tipo (T026, T031, T032, T041).

El roadmap no asigna topic a las cuatro tareas por tipo, y las dos familias no
encajan entre sí. T017 y T018 ya entregaron **6 sesiones completas de 4 pasos**
—code-reading, predict-output, find-error y fix-code— es decir 24 steps y
**6 ejercicios de cada uno de los cuatro tipos**, donde cada tarea por tipo
pide 3.

## Decision

T034, T035, T036 y T043 quedan **satisfechas por el contenido existente de
T017 y T018**. No se crea contenido nuevo, no se crean sesiones nuevas y no se
modifica ninguno de los siete topics.

Las tareas de contenido por topic pendientes —T063 a T067— no se ven afectadas
y siguen siendo las que aportan las 15 sesiones restantes.

## Alternatives

- **Colección incremental (cada tarea añade un tipo de step a las mismas 3
  sesiones)**: T034 crearía 3 sesiones con un solo paso, T035 y T036 añadirían
  el suyo y el cuarto no llegaría hasta T043, que está en la Semana 6 mientras
  T034–T036 están en la Semana 5. El repositorio quedaría con sesiones
  incompletas cruzando una frontera de semana: contradice la progresión de §7,
  `SessionPage` recorre `session.steps` y `StepIndicator` pinta el total, así
  que una sesión de un paso se navega entera en un clic, y los validadores de
  contenido fallarían. Además obligaría a deshacer las sesiones completas que
  T017 y T018 ya entregaron.
- **Tres sesiones completas nuevas por tarea, en un topic pendiente**: no hay
  topic libre. §8 dibuja 7 y las 7 tareas `Crear contenido` los reclaman todos.
  Esta opción solaparía T034–T036 con T063–T067 sobre los mismos directorios y
  llevaría el total a 33 sesiones, con topics de 6 sin nada que lo justifique.

## Rationale

Es la única lectura compatible a la vez con §6, §7, §8, los datos del
repositorio y la estructura del propio roadmap. §6 enumera las etapas 3 a 6
—Code Reading, Predict, Find Error, Fix Code— que son exactamente los cuatro
tipos de §7 y exactamente los cuatro pasos de cada sesión de T017/T018: el
contenido ya está organizado como la metodología pide.

Las otras dos no caen por preferencia sino por evidencia: la incremental deja
el repositorio en un estado que el propio plan invalida, y la de topics nuevos
no tiene dónde ponerse.

## Consequences

- Cuatro tareas del roadmap se cierran **sin entregable de contenido**. Se
  registran aquí para que releer el roadmap más adelante no sugiera que se
  saltaron.
- El inventario final del roadmap no cambia: 21 sesiones, 84 steps, 7 topics.
- T037 (`Test: validateSelection para los 3 tipos`) sí tiene trabajo real y es
  ejecutable ya, porque el contenido que necesita existe.
- No cambia ningún tipo, contrato, validador ni sección de §8. Si en el futuro
  se quisieran más ejercicios de un tipo, sería una ampliación de alcance
  fuera de este plan, no la ejecución de T034–T036 o T043.

## Status

Accepted

**Tareas:** T034, T035, T036, T043 · **Master Plan:** §6, §7, §8, roadmap

# D016 — Forma de ExecutionResult y TestCaseResult

## Context

El Master Plan usa `ExecutionResult` pero no lo declara en ninguna sección.
Aparece exactamente dos veces: en el diagrama de flujo de §25
(`… → WorkerExecutor → Web Worker → ExecutionResult → ValidationResult →
Feedback UI`) y en la firma de §26
(`execute(code: string, testCases: TestCase[]): Promise<ExecutionResult>`).
El resultado por test case ni siquiera tiene nombre en el plan: §26 lo
describe estructuralmente dentro del `worker-script`, apilándolo en un array.

T038 es la tarea que crea `lib/executor/types.ts`, así que fijar esa forma le
corresponde. No hay margen para elegirla libremente: el plan la describe en
tres sitios y basta con leerlos juntos.

## Decision

```ts
interface TestCaseResult {
  input: unknown;
  expected: unknown;
  actual: unknown;
  pass: boolean;
  error?: string;
}

interface ExecutionResult {
  pass: boolean;
  results: TestCaseResult[];
}
```

## Rationale

Cada campo sale de una fuente concreta del plan, ninguno es añadido:

- **`input`, `expected`, `actual`, `pass`** — el `worker-script` de §26 apila
  exactamente esas cuatro claves por cada test case en el camino de éxito.
- **`error?: string`** — el mismo script añade `error` solo en el `catch`, y lo
  construye como `error instanceof Error ? error.message : String(error)`. Es
  un mensaje, no una excepción, y está ausente cuando el caso va bien: de ahí
  que sea opcional y no `string | null`.
- **`actual` admite `null`** — el camino de error fija `actual: null`. Se
  cubre con `unknown`, que ya lo admite sin necesidad de un tipo aparte.
- **`pass` y `results` como campos hermanos de `ExecutionResult`** — §30 los
  nombra por separado al describir los tests del executor: «código correcto →
  pass: true» y «syntax error → results con error». Un solo veredicto agregado
  sobre la lista de casos.
- **Todo es clonable estructuradamente** — §25 sitúa la ejecución en un Web
  Worker, así que el resultado cruza por `postMessage`. Por eso el fallo viaja
  como cadena y no como `Error`.

Lo que el tipo **no** lleva, también por el plan: ni timeout ni fallo del
worker tienen sitio en `ExecutionResult`. El ciclo de vida de §26 los asigna a
la rama `reject` (`TIMEOUT → pending.delete → terminate → createWorker →
reject`, `ERROR → terminate → createWorker → reject pending`). Un test case que
lanza sí es un resultado; que la ejecución entera no llegue a producirlos, no.

El nombre `TestCaseResult` es el único elemento no dictado por el plan: §26
describe la entrada pero no la bautiza. Se elige por simetría con `TestCase`
de §17, que es justamente su entrada.

## Alternatives

- **`ExecutionResult` como alias del array de resultados**: más corto, pero
  deja sin sitio el `pass` agregado que §30 nombra aparte.
- **Un campo de error de alto nivel** (`ExecutionResult.error`) para timeout y
  fallo de worker: contradice el ciclo de vida de §26, que los rechaza en vez
  de resolverlos, y crearía dos caminos para el mismo fallo.
- **`error: string | null`** en vez de opcional: obligaría al worker-script a
  emitir una clave que hoy omite en el camino de éxito.

## Consequences

- T039 implementa `WorkerExecutor` contra este tipo sin decidir nada más: el
  contrato ya está cerrado.
- Quien consuma `ExecutionResult` debe tratar timeout y fallo de worker como
  promesa rechazada, no como resultado.
- Si en el futuro se quisiera distinguir el tipo de fallo por caso —sintaxis
  frente a ejecución— habría que ampliar `TestCaseResult`; hoy el plan solo
  distingue «hubo error» y su mensaje.

## Status

Accepted

**Tareas:** T038 · **Master Plan:** §25, §26, §30

# D017 — Contexto de ejecución con ciclo de vida en el provider

## Context

`fix-code` necesita que la sesión pueda pedir una validación asíncrona, pero
§15 mantiene los componentes y hooks alejados de implementaciones concretas.
`WorkerExecutor` además posee recursos del navegador —Worker, blob URL, cola y
watchdogs— que deben liberarse al cerrar la aplicación. Crear el executor en
la UI o recrearlo en cada render rompería esa separación y podría cancelar
trabajo en curso.

## Decision

Se introduce `ExecutionContext` como la frontera entre la sesión y el motor.
`AppProviders` crea una única pareja `WorkerExecutor` + `ExerciseEngine` dentro
de su efecto de montaje, guarda ambas instancias en refs y publica una fachada
estable con la única operación que la sesión necesita:
`validateFixCode(step, userCode)`.

Al desmontar el provider, su cleanup llama a `WorkerExecutor.destroy()`. El
cleanup no crea una nueva instancia ni actualiza estado; en desarrollo,
StrictMode puede montar un ciclo nuevo y ese ciclo crea y destruye su propia
instancia de forma independiente.

## Rationale

- El provider es la raíz de composición que ya concentra dependencias concretas
  (D002, §35), por lo que es el dueño natural del executor y del engine.
- La fachada del contexto evita que `useSession` conozca `WorkerExecutor`,
  Workers o repositorios; la UI conserva su responsabilidad de recoger la
  respuesta y mostrar el feedback.
- La creación ocurre en un efecto, no durante render, porque iniciar un Worker
  es un efecto del navegador.
- Las refs preservan la identidad de executor y engine durante toda la vida del
  provider sin desencadenar renders ni recreaciones por cambios de UI.
- `destroy()` concentra la liberación del Worker, blob URL, ejecuciones
  pendientes y cola, según §26.

## Consequences

- `fix-code` sigue la cadena `FixCodeStep → useSession → ExerciseEngine →
  ICodeExecutor → WorkerExecutor → Web Worker`.
- Rechazos de infraestructura atraviesan esa cadena para que la sesión los
  presente como reintentables, sin registrarlos como respuestas incorrectas.
- Los tests de sesión montan `ExecutionProvider` con un doble controlable; un
  test de integración usa el provider real y el script real del Worker.

## Status

Accepted

**Tareas:** T045.1 · **Master Plan:** §15, §24–§27

---

# D018 — Finalización coordinada de sesión y dominio diferido

## Context

T050 debe convertir las respuestas acumuladas por `useSession` en progreso del
concepto, un `Attempt` por respuesta y la metadata `CompletedSession`. Las tres
colecciones viven detrás de repositorios distintos y localStorage no ofrece una
transacción común.

D013 impide calcular un dominio nuevo: todavía no existen fórmulas para todos
los factores ni datos suficientes para derivarlos. `UserAnswer` tampoco aporta
un `errorType` canónico con el que construir `ErrorRecord`.

## Decision

- T050 actualiza las métricas de progreso, pero conserva el dominio anterior.
  Para un concepto nuevo, `domain: 0` significa «todavía no calculado».
- `totalAttempts` cuenta steps respondidos, no sesiones. Cada `UserAnswer`
  incrementa ese contador y produce exactamente un `Attempt`.
- `recentErrors` se conserva. El progreso inicial usa una colección vacía y no
  se inventan registros sin un `errorType` derivable.
- Un `SessionCompletionContext` coordina la persistencia detrás de las
  interfaces de repositorio; `SessionPage` no conoce esa infraestructura.
- El orden es progreso → attempts secuenciales → completed session.
- `SessionState.isComplete` solo cambia después de confirmar las tres etapas.
- El plan fija una vez IDs, timestamp y datos derivados. Durante el mismo
  montaje, un retry reanuda desde la primera etapa no confirmada y las llamadas
  concurrentes comparten una única operación.
- La idempotencia después de reload/unmount queda fuera del contrato actual.
  No se afirma atomicidad real entre las tres claves de almacenamiento.

`calculateDomain()` no participa en T050. El score recibe
`calculateDomainImpact(previousDomain, previousDomain)`, por lo que el impacto
es cero hasta que una tarea posterior especifique todos los factores.

## Consequences

- Una escritura fallida no completa la sesión ni elimina sus respuestas.
- La operación puede reintentarse sin repetir etapas confirmadas mientras el
  provider siga montado.
- Un reload durante una finalización parcial puede dejar colecciones
  inconsistentes. Resolverlo exigiría un journal o identificador persistido de
  ejecución y no pertenece a T050.
- El cálculo completo de dominio y la generación de `ErrorRecord` permanecen
  aplazados de forma explícita.

## Status

Accepted

**Tareas:** T050 · **Master Plan:** §17, §20–§24 · **Relacionada con:** D002,
D004, D012, D013, D017

---

# D019 — Recovery temporal detrás de una capacidad inyectable

## Context

T052 debe leer, escribir y eliminar el estado de una sesión activa en
`sessionStorage`, distinguir corrupción de fallos reales del navegador y seguir
funcionando en memoria cuando la persistencia no está disponible. Hacerlo
directamente desde `useSession` acoplaría la orquestación de sesión a Web
Storage y haría indeterministas los tests de errores y cuota.

Además, un recovery existente debe inspeccionarse antes de inicializar otra
sesión. Un snapshot válido cuyo `sessionId` no coincide con la URL no puede
sobrescribirse sin una decisión explícita del usuario.

## Decision

- Una interfaz síncrona y estrecha, `ISessionRecoveryStore`, expone únicamente
  `load`, `save` y `clear` con el snapshot canónico de §21.
- `SessionStorageRecoveryStore` encapsula la clave, Web Storage, JSON,
  validación estructural y clasificación de errores.
- La implementación concreta se crea en la raíz y llega a `useSession` mediante
  contexto. El reducer permanece puro.
- JSON no parseable produce `INVALID_JSON`. JSON parseable pero no restaurable
  produce `RECOVERY_FAILED`; ninguno se elimina automáticamente.
- Una sesión nueva solo se persiste después de comprobar que no existe un
  recovery pendiente. Descartar o abandonar requiere una acción explícita.
- `STORAGE_UNAVAILABLE` desactiva más escrituras durante esa sesión y permite
  continuar en memoria. `STORAGE_FULL` pausa las escrituras y conserva una
  operación reintentable.
- El tiempo persistido se calcula como tiempo acumulado previo más tiempo desde
  la reanudación. `startTime` conserva la identidad original y no se cuenta el
  intervalo durante el que la página estuvo cerrada.
- El recovery se borra después de `SET_COMPLETE`, nunca antes de que T050 haya
  confirmado progreso, attempts y completed session.

## Alternatives

- Acceder a `sessionStorage` directamente desde `useSession`.
- Reutilizar un repositorio durable de progreso.
- Guardar el snapshot en un contexto con representación y errores de Web
  Storage expuestos a todos los consumidores.
- Borrar automáticamente snapshots inválidos o de otra sesión.

## Rationale

La capacidad separa orquestación, estado y plataforma sin convertir el estado
temporal en un repositorio de dominio durable. Su contrato síncrono refleja la
API subyacente y permite dobles deterministas. La decisión explícita antes de
escribir evita pérdida silenciosa, y el reloj con baseline conserva el tiempo
activo sin introducir un intervalo que fuerce renders.

## Consequences

- T052 añade un provider y una implementación concreta, pero los componentes no
  conocen claves, JSON ni Web Storage.
- La UI local de sesión muestra recovery y avisos de almacenamiento sin crear
  infraestructura global de notificaciones.
- Los borradores todavía no enviados no se recuperan porque no pertenecen al
  payload de §21.
- No se añade journal ni idempotencia de completion entre montajes; permanecen
  fuera de T052 según D018.

## Status

Accepted

**Tareas:** T052 · **Master Plan:** §21, §27 · **Relacionada con:** D004, D006,
D012, D018
