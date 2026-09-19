# CODEGYM — ESTRUCTURA COMPLETA DEL PROYECTO

> Lectura completa realizada el **2026-09-04** sobre `develop` @ `6c27296`
> («test: validate expanded curriculum»), versión **0.1.0** (tag `v0.1.0`).
> Documento descriptivo: no sustituye al Master Plan (fuente de verdad del
> producto), a `DECISIONS.md` (fuente de verdad de las decisiones) ni a
> `ARCHITECTURE.md`/`CONTENT-GUIDE.md` (guías canónicas).

---

## 1. Resumen ejecutivo

CodeGym es una plataforma personal de entrenamiento de programación («un
gimnasio para programadores»): sesiones cortas de lectura de código, predicción
de output, detección de errores y corrección de código. MVP según Master Plan:
frontend puro, sin backend, progreso en `localStorage`, ejecución de código del
usuario en Web Worker.

**Estado actual:**

- El roadmap completo **T001–T100 del Master Plan está integrado en develop**
  (todas las fases: foundation, engine, progreso, páginas, contenido,
  animaciones, accesibilidad, tests, performance, deploy).
- El currículo creció **más allá del MVP** de JavaScript: hoy hay **6
  tecnologías** (JavaScript, HTML, CSS, React, Node.js, SQL) con **32 topics,
  32 conceptos y 46 sesiones**.
- v0.1.0 preparada y desplegable en Vercel (SPA rewrite), con CHANGELOG.
- **Calidad actual no verde**: la suite Vitest deja **4–5 tests fallando**
  (cadena de ejecución fix-code) y **typecheck/build están rotos** por un
  import de tipo ausente en `src/test/fake-execution.ts`. Lint está limpio.
  Detalle en §20.

---

## 2. Stack y tooling

| Capa | Elección |
|---|---|
| Framework | React 18 + TypeScript 5 (strict) |
| Build | Vite 5 (`tsc -b` + `vite build`) |
| Estilos | Tailwind CSS 3 + tailwindcss-animate, tokens HSL en 4 capas (D008) |
| Rutas | React Router 6 (`createBrowserRouter`, `React.lazy` en todas las rutas) |
| Editor | CodeMirror 6 vía `@uiw/react-codemirror` + `@codemirror/lang-javascript`, cargado en diferido (T092) |
| Highlight | highlight.js (core + JavaScript, D009) |
| Iconos | Lucide React |
| Fuentes | Inter y JetBrains Mono vía @fontsource (self-hosted, subset latin) |
| Estado | useState/useReducer + Context (D004). Sin Zustand/Redux/React Query |
| Ejecución de código | Web Worker con watchdog de 3 s, cola FIFO (D001) |
| Tests unitarios/componente | Vitest 1 + Testing Library (jsdom), 53 ficheros / 812 tests |
| Tests E2E | Playwright: Chromium, Firefox y WebKit (4 specs) |
| Lint | ESLint 9 flat config, `--max-warnings 0` (D011) |
| Análisis de bundle | rollup-plugin-visualizer (`npm run analyze:bundle`) |
| Despliegue | Vercel (SPA rewrite en `vercel.json`) |

**Scripts npm:** `dev` · `build` · `preview` · `test` · `test:e2e` · `lint` ·
`typecheck` · `analyze:bundle`.

---

## 3. Árbol de directorios (completo, con líneas)

```
codeGYM/
├── index.html                  # entrada Vite (SPA, lang="es")
├── package.json                # v0.1.0, scripts §2
├── vercel.json                 # rewrite: /(.*) → /index.html
├── vite.config.ts              # plugin-react + alias @/* + visualizer condicional
├── vitest.config.ts            # jsdom, setup src/test/setup.ts, globals, css:true
├── playwright.config.ts        # 3 navegadores, servidor de preview
├── eslint.config.js            # ESLint 9 flat (D011)
├── tailwind.config.js          # CAPA 3 de tokens (D008) + keyframes T071
├── postcss.config.js           # tailwind + autoprefixer
├── tsconfig*.json              # proyecto base + app + node (paths @/* → src)
├── components.json             # config shadcn/ui
├── CHANGELOG.md                # 0.1.0 — MVP
├── README.md                   # descripción + comandos
├── bundle-stats.html           # (gitignored) salida del análisis de bundle
├── e2e/                        # Playwright
│   ├── main-flow.spec.ts           # T090: flujo principal
│   ├── content-discovery.spec.ts   # descubrimiento de contenido
│   ├── curriculum-discovery.spec.ts# descubrimiento multi-tecnología
│   └── final-qa.spec.ts            # T099: skip-link, sin overflow en 5 breakpoints
├── test-results/               # (gitignored) artefactos Playwright
├── dist/                       # (gitignored) build de producción
├── .claude/                    # agentes y skills del entorno de trabajo
│   ├── settings.local.json
│   ├── agents/                     # 15 agentes: architect, frontend, backend, logic,
│   │                               # reviewer, testing, ui-ux, accessibility,
│   │                               # performance, security, database, seo, social,
│   │                               # rate-limit, orchestrator
│   └── skills/                     # ui-design-exploration, animation-performance-engineering
├── design-lab/                 # (UNTRACKED, protegido) laboratorio visual del dashboard
│   ├── index.html                  # comparador de 5 conceptos
│   ├── EXPLORATION.md, README.md
│   ├── concept-1..5-*.html         # mapas/rack/sala/consola/manifiesto
│   ├── shared/                     # tokens.css (copia aislada), shell.css, lab chrome
│   └── visual/                     # final-diagnostico.html + parts/ + build.py
└── docs/
    ├── CODEGYM-MASTER-PLAN-FINAL.md    # 1684 líneas; fuente de verdad del producto
    ├── DECISIONS.md                    # 1127 líneas; 19 ADR (D001–D019)
    ├── ARCHITECTURE.md                 # capas, decisiones, flujo de datos, deploy
    ├── CONTENT-GUIDE.md                # cómo crear contenido (estructura, IDs)
    ├── PERFORMANCE-AUDIT.md            # método Lighthouse + referencia
    ├── CODEGYM-DASHBOARD-FINAL-SPEC.md     # (UNTRACKED, protegido) spec D07+D10
    ├── CODEGYM-DASHBOARD-VISUAL-EXPLORATION.md # (UNTRACKED, protegido)
    └── CODEGYM-PROJECT-STRUCTURE.md    # este documento
```

### `src/` (23.838 líneas en total)

```
src/
├── main.tsx                       (29)  montaje: router + AppProviders + ErrorBoundary
├── index.css                      (228) CAPAS 1-2 de tokens (D008) + resaltado + motion
├── index.css.test.ts              (89)  guarda de contraste/coherencia de tokens
├── vite-env.d.ts                  (1)
│
├── app/                                 # composición y rutas
│   ├── providers.tsx            (113)   ÚNICO punto de creación de implementaciones (§15/§35, D017)
│   ├── router.tsx               (30)    createBrowserRouter + AppLayout + rutas lazy
│   ├── route-elements.tsx       (63)    wrappers React.lazy + Suspense (T091)
│   ├── providers.test.tsx       (87)
│   └── router.test.tsx          (77)
│
├── components/
│   ├── ui/progress.tsx          (36)    primitive shadcn (D010)
│   ├── layout/
│   │   ├── AppLayout.tsx        (50)    propietario único de <main> + skip link (T081)
│   │   ├── Sidebar.tsx          (42)    desktop ≥1024
│   │   ├── TopBar.tsx           (34)    tablet 640–1023
│   │   ├── MobileNav.tsx        (37)    bottom nav <640
│   │   └── navigation.ts        (13)    definición de navegación
│   └── codegym/
│       ├── CodeBlock.tsx        (119)   lectura de código con highlight.js
│       ├── CodeEditor.tsx       (151)   wrapper CodeMirror
│       ├── LazyCodeEditor.tsx   (35)    import diferido del editor (T092)
│       ├── ExerciseCard.tsx     (42)    tarjeta de sesión
│       ├── StepIndicator.tsx    (90)    progreso de pasos
│       ├── HintReveal.tsx       (86)    pistas progresivas
│       ├── ResultFeedback.tsx   (53)    feedback correct/incorrect + explicación
│       ├── SessionHeader.tsx    (58)    título, concepto, dificultad
│       ├── DifficultyBadge.tsx  (36)
│       └── EmptyState.tsx       (46)
│
├── contexts/                            # estado de aplicación (D004)
│   ├── ContentContext.tsx       (195)   tecnologías, topics, conceptos, sesiones + caché
│   ├── ProgressContext.tsx      (155)   Map<conceptId, ConceptProgress> + persistencia
│   ├── HistoryContext.tsx       (129)   sesiones completadas recientes
│   ├── ExecutionContext.tsx     (29)    fachada executeFixCode/validateFixCode (D017)
│   ├── SessionCompletionContext.tsx (227) finalización coordinada (D018)
│   ├── SessionRecoveryContext.tsx (20)  recuperación de sesión activa (D006/D019)
│   ├── ResetProgressContext.tsx (22)    reset de progreso (T068)
│   └── *.context.ts             (interfaces tipo-safe de cada contexto)
│
├── hooks/
│   ├── useSession.ts            (334)   máquina de sesión (reducer + validación + hints)
│   ├── useSessionRecoveryController.ts (467) ciclo de vida de recuperación (D019)
│   ├── useDialogFocus.ts        (66)    trampa de foco en diálogos (T083)
│   ├── useContent.ts (22) useProgress.ts (14) useHistory.ts (11)
│   ├── useCodeExecution.ts (27) useSessionCompletion.ts (18)
│   └── useSessionRecovery.ts (15) useResetProgress.ts (6)
│
├── features/
│   ├── home/HomePage.tsx                (118) selección de tecnología
│   ├── onboarding/OnboardingPage.tsx    (53)  primera visita (T062)
│   ├── dashboard/
│   │   ├── DashboardPage.tsx            (337) veredicto diagnóstico (T055)
│   │   ├── dashboard-view-model.ts      (225) lógica pura: estado/veredicto/evidencia
│   │   └── components/                  DiagnosisVerdict, EvidencePiece,
│   │                                    ProgressOverview, RecentActivity, WeakConcepts
│   ├── practice/
│   │   ├── TechnologyPage.tsx           (165) topics de una tecnología
│   │   ├── TopicPage.tsx                (330) conceptos + teoría + sesiones
│   │   └── components/LearningContent.tsx (105) teoría estructurada por secciones
│   ├── session/
│   │   ├── SessionPage.tsx              (324) orquesta la sesión (T027)
│   │   ├── session-reducer.ts           (103) useReducer con transiciones protegidas
│   │   ├── session-types.ts             (33)  SessionState/SessionAction
│   │   └── steps/                       CodeReadingStep (94), PredictOutputStep (102),
│   │                                    FindErrorStep (156), FixCodeStep (56)
│   ├── review/ReviewPage.tsx            (211) + ReviewStep.tsx (138): repaso post-sesión
│   ├── results/ResultsPage.tsx          (231) resultados + impacto en dominio
│   └── NotFoundPage.tsx                 (30)
│
├── lib/
│   ├── engine/
│   │   ├── exercise-engine.ts   (88)    loadSession/validateSelection/validateFixCode
│   │   ├── validation.ts        (105)   traducción ExecutionResult → ValidationResult (D016)
│   │   ├── scoring.ts           (42)    SessionScore aritmética pura (§24)
│   │   └── types.ts             (15)
│   ├── executor/
│   │   ├── ICodeExecutor.ts     (30)    contrato (T038)
│   │   ├── WorkerExecutor.ts    (191)   watchdog 3 s, cola FIFO, recreate, destroy (T039)
│   │   ├── worker-script.ts     (53)    new Function + comparación JSON.stringify
│   │   └── types.ts             (42)    ExecutionResult/TestCaseResult
│   ├── repositories/
│   │   ├── I*Repository.ts      (4×6)   contratos (D002)
│   │   ├── LocalProgressRepository.ts        (61) → localStorage codegym:progress
│   │   ├── LocalAttemptRepository.ts         (60) → localStorage codegym:attempts
│   │   ├── LocalCompletedSessionRepository.ts (68) → codegym:completed-sessions
│   │   └── StaticContentRepository.ts        (238) import.meta.glob no eager (D005)
│   ├── recovery/
│   │   ├── ISessionRecoveryStore.ts       (41) contrato + errores tipados
│   │   └── SessionStorageRecoveryStore.ts (186) codegym:session (D006)
│   ├── progress/
│   │   ├── domain-calculator.ts (81)    suma ponderada 35/25/20/10/10 → 0..100 (D013)
│   │   └── migration.ts         (67)    schema v1 + registro de migraciones (T069)
│   ├── errors/ErrorBoundary.tsx (84)
│   └── utils.ts                 (6)     cn() (clsx + tailwind-merge)
│
├── data/
│   ├── technologies.json        (38)    6 tecnologías
│   └── content/                         # contenido versionado (§3, D005)
│       ├── content-loading.test.ts (137) guarda de carga perezosa (T070)
│       ├── javascript/                  7 topics · 7 conceptos · 21 sesiones · 84 pasos
│       ├── html/                        5 topics · 5 conceptos · 5 sesiones · 10 pasos
│       ├── css/                         5 topics · 5 conceptos · 5 sesiones · 5 pasos
│       ├── react/                       5 topics · 5 conceptos · 5 sesiones · 5 pasos
│       ├── nodejs/                      5 topics · 5 conceptos · 5 sesiones · 5 pasos
│       └── sql/                         5 topics · 5 conceptos · 5 sesiones · 5 pasos
│
├── test/                                # utilidades de test
│   ├── setup.ts / setup.test.tsx        jest-dom + limpieza de storage
│   └── fake-execution.ts, fake-session-completion.ts, fake-session-recovery.ts
│                                        ⚠ fake-execution.ts rompe typecheck (§20)
└── types/
    ├── exercise.ts  (80)  ExerciseSession/Step/AnswerOption/TestCase/StepAnswer
    ├── content.ts   (52)  Technology/Topic/Concept + LearningContent estructurado
    ├── progress.ts  (85)  ConceptProgress/Attempt/CompletedSession/SessionScore
    ├── history.ts   (13)  HistoryContextValue
    └── repository.ts (33) interfaces de repositorio
```

---

## 4. Arquitectura

Capas (§15 del Master Plan) y reglas de dependencia:

```
UI (features + components)
    ↓ usa
Hooks (useSession, useProgress, useContent, useHistory, useCodeExecution…)
    ↓ usa
Contexts (Content, Progress, History, Execution, Completion, Recovery, Reset)
    ↓ usa
Services / Engine (ExerciseEngine, scoring, validation, domain-calculator)
    ↓ usa interfaces
Repositories (IContent/IProgress/IAttempt/ICompletedSession + IRecoveryStore)
    ↓ implementaciones
Infraestructura (import.meta.glob, localStorage, sessionStorage, Web Worker)
```

- **Composición**: `src/app/providers.tsx` es el único sitio donde se instancian
  implementaciones concretas; migrar a Supabase (Fase 2) solo cambia ese
  fichero (§35). El `WorkerExecutor`/`ExerciseEngine` se crean en un `useEffect`
  (nunca durante el render) y se destruyen al desmontar (D017).
- **Prohibiciones**: la UI no toca storage ni Worker; el engine no conoce
  React/DOM; el worker no conoce el estado de la app.
- **Inmutabilidad del contenido**: `StaticContentRepository` congela en
  profundidad todo lo que devuelve.
- **Carga perezosa (D005)**: `import.meta.glob` no eager por ficheros; cada
  sesión es su propio chunk; rutas con `React.lazy` (T091); CodeMirror diferido
  (T092); el caché de aplicación vive en `ContentContext` (§18).

---

## 5. Modelo de dominio (`src/types/`)

| Tipo | Contenido |
|---|---|
| `Technology` | id, name, icon, description |
| `Topic` | id, name, technologyId, description |
| `Concept` | id, name, topicId, technologyId, `contentMarkdown`, `content?: LearningContent` |
| `LearningContent` | secciones tipadas: intro/explanation/key-point/warning, objectives, code, comparison, quick-check |
| `ExerciseSession` | id, title, conceptId, technologyId, difficulty, version, status, createdAt, updatedAt, steps[] |
| `ExerciseStep` | id, type (`code-reading`·`predict-output`·`find-error`·`fix-code`), prompt, code, language, options, errorLines, errorType, testCases, expectedPatterns, explanation, hints, stepOrder |
| `AnswerOption` | id, text, correct |
| `TestCase` | input, expected, call, description |
| `StepAnswer` | string (optionId) \| number \| `FindErrorAnswer {line, errorType}` (D014) |
| `ConceptProgress` | conceptId, domain 0–100, totalAttempts, correctAttempts, difficultyDistribution, recentErrors[], lastPracticed, schemaVersion |
| `Attempt` | id, sessionId, stepId, stepType, answer, isCorrect, timeSpentMs, hintsUsed, createdAt |
| `CompletedSession` | id, sessionId, technologyId, conceptId, totalSteps, correctSteps, accuracy, timeSpentMs, completedAt |
| `UserAnswer` | stepId, stepType, answer, isCorrect (D012), timeSpentMs, hintsUsed |
| `SessionScore` / `DomainImpact` | totals + previousDomain/newDomain/change |

IDs: strings legibles y estables con prefijo de tecnología
(`js-arrays-filter-mutation-01`, `css-flexbox-layout`, `react-state-events`).

---

## 6. Contenido (inventario real)

Estructura por topic: `index.json` (concepto sin prosa) + `concept.md`
(fallback canónico) + `sessions/*.json`. Los conceptos nuevos además llevan
`content?: LearningContent` (teoría estructurada que renderiza
`LearningContent.tsx` con intro/objectives/code/comparison/quick-check).

**JavaScript — currículo completo (4 tipos de ejercicio por sesión):**

| Topic | Concepto | Sesiones (beginner / intermediate / advanced) |
|---|---|---|
| js-arrays | Métodos de iteración de arrays | map-vs-foreach · filter-mutation · reduce-accumulator |
| js-functions | Parámetros, ámbito y retorno | default-parameters · scope-hoisting · return-flow |
| js-closures | Captura, estado y binding vivo | loop-capture · shared-state · live-binding |
| js-promises | Flujo, errores y espera asíncrona | chain-transform · error-recovery · await-value |
| js-objects | Propiedades, referencias y copias | dynamic-properties · shared-reference · object-entries |
| js-es6-plus | Destructuring, rest y valores opcionales | destructuring-shapes · rest-arguments · nullish-defaults |
| js-errors | Lanzar, capturar y propagar errores | throw-validation · catch-context · finally-cleanup |

Cada sesión JS: 4 pasos `code-reading → predict-output → find-error →
fix-code`, 3–4 opciones plausibles, 2–3 hints progresivos, testCases reales para
el worker en fix-code.

**HTML, CSS, React, Node.js y SQL — currículo de lectura (expansión posterior
al MVP):** 5 topics por tecnología, 1 concepto por topic con teoría
estructurada (`LearningContent`), y sesiones ligeras de 1–2 pasos
`code-reading` (sin worker). Ejemplos: `html-semantic-landmarks`,
`css-flexbox-layout`, `react-state-events`, `node-modules-imports`,
`sql-joins-relations`.

**Totales: 6 tecnologías · 32 topics · 32 conceptos · 46 sesiones · 114 pasos.**

Reglas de autoría: `docs/CONTENT-GUIDE.md` (estructura, IDs, nada de tarjetas
vacías, no importar JSON desde React). `src/data/content/content-loading.test.ts`
(T070) guarda que todo lo declarado carga perezosamente y resuelve.

---

## 7. Motor de ejercicios y ejecución

- **ExerciseEngine** (`lib/engine/exercise-engine.ts`): `loadSession`,
  `validateSelection` (code-reading/predict-output: optionId;
  find-error: línea + tipo, D014) y `validateFixCode` (async, vía executor).
- **Scoring** (`scoring.ts`): aritmética pura de §24 con `isCorrect` (D012) y
  `DomainImpact` inyectado.
- **WorkerExecutor** (`lib/executor/WorkerExecutor.ts`): un Worker con
  `new Function` sobre `code + return (call)`; límites: timeout 3000 ms,
  1 ejecución simultánea, cola FIFO; watchdog con `terminate()` + recreate;
  `destroy()` revoca el blob URL y rechaza lo pendiente (§25–26, D001, D016).
- **Validación de resultados** (`validation.ts`): traduce `ExecutionResult` →
  `ValidationResult` (correcto/error/timeout) con la explicación del paso.
- **Dominio** (`domain-calculator.ts`): `calculateDomain(DomainFactors)` =
  precisión 35 % + errorRate 25 % + diffScore 20 % + recency 10 % +
  consistency 10 %, escalado ×100 y recortado a 0–100 (D013: los factores
  llegan ya calculados).

---

## 8. Estado y hooks

| Contexto | Responsabilidad |
|---|---|
| `ContentContext` | tecnologías + carga perezosa de topics/conceptos/sesiones con caché |
| `ProgressContext` | `Map<conceptId, ConceptProgress>`, persiste vía repositorio |
| `HistoryContext` | CompletedSessions recientes (actividad del dashboard) |
| `ExecutionContext` | fachada estable `executeFixCode`/`validateFixCode` (D017) |
| `SessionCompletionContext` | finalización coordinada: intentos + sesión completada + progreso (D018) |
| `SessionRecoveryContext` | snapshot de sesión activa en sessionStorage (D006) con recuperación controlada por `useSessionRecoveryController` (D019): estados checking/none/available/invalid-json/recovery-failed y avisos STORAGE_* |
| `ResetProgressContext` | reset de progreso/attempts/sessions (T068) |

UI state: `useState`; sesión: `useReducer` (`session-reducer.ts`, transiciones
protegidas: no enviar validando, no avanzar sin respuesta, no completar sin
responder todo).

---

## 9. Persistencia

| Clave | Contenido | Dueño |
|---|---|---|
| `codegym:progress` | ConceptProgress por concepto | LocalProgressRepository |
| `codegym:attempts` | historial de intentos | LocalAttemptRepository |
| `codegym:completed-sessions` | metadata de sesiones completadas | LocalCompletedSessionRepository |
| `codegym:session` (sessionStorage) | sesión activa (recuperación) | SessionStorageRecoveryStore |

`lib/progress/migration.ts` (T069): versión de schema actual = 1, registro de
migraciones vacío, `UnsupportedSchemaVersionError` para versiones desconocidas.

---

## 10. Rutas y navegación

| Ruta | Página | Nota |
|---|---|---|
| `/` | HomePage | selección de tecnología |
| `/onboarding` | OnboardingPage | primera visita (T062) |
| `/dashboard` | DashboardPage | «Progreso»: veredicto diagnóstico |
| `/tech/:technologyId` | TechnologyPage | topics |
| `/tech/:technologyId/:topicId` | TopicPage | conceptos + teoría + sesiones |
| `/practice/:sessionId` | SessionPage | sesión activa con recovery |
| `/review/:sessionId` | ReviewPage | repaso de la sesión |
| `/results/:sessionId` | ResultsPage | resultados + dominio |
| `*` | NotFoundPage | |

`AppLayout` es propietario único de `<main>` y del skip link. Navegación
responsive: bottom nav <640, TopBar 640–1023, Sidebar ≥1024 (§11).

---

## 11. Design system

- **Tokens en 4 capas (D008)**: primitivas HSL en `src/index.css` → semánticas
  shadcn (`--background`, `--primary`, …) → `tailwind.config.js`
  (`hsl(var(--token))`, opacidades) → componentes con utilidades.
- **Acento accesible (D007)**: `brand` (#6366f1) solo usos no textuales; el
  texto de acento es `text-primary` (#818cf8). `subtle` es texto decorativo
  (3,13:1, no AA).
- **Slots propios**: `success`, `warning`, `code-bg/code-border`,
  `surface-hover` (accent de shadcn).
- **Radios**: escala §12 (`rounded-sm|md|lg|xl|full` sobre `--radius-*`).
- **Motion (T071)**: tokens `--motion-duration-fast/normal/slow` y
  `--motion-ease-standard/emphasized` expuestos como `duration-*`/`ease-*`;
  keyframes `fadeInUp`, `correctPulse`, `shake`, `progressFill`,
  `celebrateCheck` (T077) como animaciones utilitarias; `prefers-reduced-motion`
  global (T076).
- **Componentes CodeGym** (`components/codegym/`): CodeBlock, CodeEditor +
  LazyCodeEditor, ExerciseCard, StepIndicator, HintReveal, ResultFeedback,
  SessionHeader, DifficultyBadge, EmptyState. Primitives shadcn solo en
  `components/ui/` (D010: hoy `progress`).

---

## 12. Accesibilidad (T081–T084)

Skip link «Saltar al contenido principal» (T081, verificado en E2E final-qa),
ARIA labels/roles en controles y regiones (T082), focus management entre rutas
y trampa de foco en diálogos (`useDialogFocus`, T083), anuncios de cambios de
progreso de sesión con aria-live (T084), objetivos táctiles ≥44 px
(`min-h-11`), jerarquía de headings verificada en tests.

---

## 13. Testing

**Vitest (unit/componente/integración): 53 ficheros, 812 tests** (medido hoy).
Áreas: engine (exercise-engine, validation, scoring), executor
(ICodeExecutor, WorkerExecutor con timeout/cola/destroy), repositorios locales,
content loading (T070), contexts, hooks (useSession, recovery controller),
session (reducer, integración de persistencia, 4 steps), páginas (home,
technology, topic, dashboard + view-model, results, review, not-found,
onboarding), diseño (index.css.test: contraste/coherencia de tokens).

**Playwright (E2E): 4 specs × Chromium/Firefox/WebKit** — `main-flow`,
`content-discovery`, `curriculum-discovery`, `final-qa` (skip link + sin
overflow horizontal en 320/390/768/1024/1280).

**Estado actual: NO verde.** Fallos medidos en dos ejecuciones consecutivas
(entre 4 y 5 tests, la cifra varía entre runs):

- `lib/executor/ICodeExecutor.test.ts` — 1 fallo
- `lib/engine/exercise-engine.test.ts` — 2 fallos («T042 · ExecutionResult se
  traduce a ValidationResult»)
- `hooks/useSession.test.tsx` — «reintentar tras el fallo registra la respuesta
  y limpia el error»
- `features/session/SessionPage.test.tsx` — «un código que no pasa los test
  cases es respuesta incorrecta»

Todos se concentran en la **cadena del contrato fix-code
(fake-execution → engine → validación)**. Además hay ruido recurrente de
`TypeError: textRange(...).getClientRects is not a function` (CodeMirror en
jsdom). Lint: limpio. Detalle de typecheck/build roto en §20.

---

## 14. Performance

- Lazy routes (T091), lazy CodeMirror (T092), lazy content por topic (D005).
- `npm run analyze:bundle` genera `bundle-stats.html` (T094).
- `docs/PERFORMANCE-AUDIT.md` (T095): método Lighthouse sobre build de
  producción con `vite preview` y tabla de referencia por categoría/métrica.
- Sin gráficos ni imágenes decorativas; animaciones CSS con capas efímeras.

---

## 15. Despliegue y release

- `vercel.json`: SPA rewrite de todas las rutas a `index.html` (T097).
- `CHANGELOG.md` 0.1.0 — MVP (T100). Tag `v0.1.0` creado.
- `main` está **retrasada**: sigue en el baseline de fundación
  (`66cf603 chore: baseline del proyecto tras T001-T015`); todo el trabajo
  vive en `develop`.

---

## 16. Roadmap Master Plan — estado

| Fase | Tareas | Estado |
|---|---|---|
| 1. Foundation | T001–T008 | ✅ (rama `feature/foundation-fixes`, baseline `66cf603`) |
| 1. Design system + types | T009–T015 | ✅ |
| 1. Content + data | T016–T022 | ✅ (`feature/t019…t021`) |
| 2. Engine + Code Reading | T023–T030 | ✅ (`t023…t030`) |
| 2. Predict + Find Error | T031–T037 | ✅ (`t031-t032`, `t033`, `t037`) |
| 2. Fix Code + Worker | T038–T045 | ✅ (`t038`, `t039`, `t040-t041`, `t042`, `t045-1`) |
| 3. Progress + repositories | T046–T053 | ✅ |
| 3. Pages | T054–T062 | ✅ (`t054`…`t062`) |
| 3. Contenido completo | T063–T067 | ✅ closures, promises, objects, es6-plus, errors |
| 3. Reset + migración + test de carga | T068–T070 | ✅ |
| 4. Animations + responsive | T071–T080 | ✅ |
| 4. Accessibility | T081–T084 | ✅ |
| 4. Testing | T085–T090 | ✅ (unit + E2E Playwright) |
| 4. Performance + deploy | T091–T097 | ✅ (lazy ×3, bundle, Lighthouse, cross-browser, Vercel) |
| 4. Docs + QA + release | T098–T100 | ✅ (README/ARCHITECTURE/CONTENT-GUIDE, final-qa, v0.1.0) |

**Más allá del plan** (commits `517b63a`, `ba0a68a`, `fc8f7c7`, `6c27296`):
teoría estructurada (`LearningContent`), conexión topics→sesiones y currículos
de HTML, CSS, React, Node.js y SQL — contenido que el Master Plan reservaba
para Fase 3.

---

## 17. Decisiones arquitectónicas (`docs/DECISIONS.md`)

| ID | Decisión |
|---|---|
| D001 | Web Worker sobre iframe sandbox para ejecutar código del usuario |
| D002 | Repository pattern sobre localStorage directo |
| D003 | CSS animations sobre Framer Motion |
| D004 | useState+useReducer+Context sobre Zustand/Redux |
| D005 | Lazy loading por topic sobre carga completa |
| D006 | sessionStorage para recovery sobre localStorage |
| D007 | Escala de acento accesible (brand no textual / texto acento #818cf8) |
| D008 | Jerarquía de tokens en 4 capas (primitivas HSL → semánticas → Tailwind → componentes) |
| D009 | highlight.js core+JS; fuentes @fontsource subset latin |
| D010 | Primitives shadcn/Radix solo en components/ui |
| D011 | ESLint 9 flat config, sin Prettier |
| D012 | `isCorrect` en UserAnswer (lo fija el engine) |
| D013 | Dominio 0–100, pesos 35/25/20/10/10, factores inyectados |
| D014 | Respuesta compuesta en find-error (`FindErrorAnswer`) |
| D015 | El contenido por tipo lo satisfacen T017/T018 |
| D016 | Forma de `ExecutionResult`/`TestCaseResult` |
| D017 | Contexto de ejecución con ciclo de vida en el provider |
| D018 | Finalización coordinada de sesión y dominio diferido |
| D019 | Recovery temporal detrás de una capacidad inyectable |

---

## 18. Entorno de agentes (`.claude/`)

- **15 agentes**: orchestrator, architect, frontend, backend, logic, reviewer,
  testing, ui-ux, accessibility, performance, security, database, seo, social,
  rate-limit.
- **2 skills propias**: `ui-design-exploration` y
  `animation-performance-engineering` (usadas en la fase de diseño del
  dashboard).

---

## 19. Diseño del dashboard (pendiente de autorizar)

Fase de diseño **aislada del código** (untracked, protegida):

- `design-lab/`: comparador de 5 conceptos + prototipos estáticos +
  `visual/final-diagnostico.html` (D07 «Telemetría» + D10 «pieza de código»).
- `docs/CODEGYM-DASHBOARD-VISUAL-EXPLORATION.md`: análisis de 11 direcciones.
- `docs/CODEGYM-DASHBOARD-FINAL-SPEC.md`: spec final «Diagnóstico con pieza»
  (veredicto OK/ATENCIÓN/MEJORA + evidencia + pieza de código con líneas
  marcadas). **No autoriza implementación**; deja 6 decisiones pendientes,
  entre ellas el campo de contenido `errorLineNotes`.

El dashboard actual en `src/` (T055) ya implementa un veredicto con estados
ok/attention/improvement, evidencia y pieza, coherente con esa dirección.

---

## 20. Problemas conocidos (a fecha de esta lectura)

1. **Typecheck y build rotos** — `src/test/fake-execution.ts` usa
   `ExecutionResult` sin importarlo (TS2304 en las líneas 59/76/84).
   `npm run typecheck` y `npm run build` fallan; lint pasa. Es un fichero de
   test, así que Vitest ejecuta la suite sin quejarse.
2. **4–5 tests fallando** en la cadena fix-code (ICodeExecutor,
   exercise-engine T042 ×2, useSession reintento, SessionPage flujo de
   respuesta) — ver §13. La cifra varía entre ejecuciones.
3. **Test intermitente en dashboard** — la aserción de
   `DashboardPage.test.tsx` «puedes seguir consolidando Arrays» compite con el
   efecto async de nombres de concepto: si aún no resolvió, el h1 muestra el
   fallback `arrays` (conceptId). Detectado y caracterizado el 2026-09-03
   (falla ~1 de cada 3-4 ejecuciones, también en el commit base `62d1a66`,
   por lo que es preexistente).
4. **Contenido no-JS ligero** — HTML/CSS/React/Node/SQL solo tienen pasos
   `code-reading` (1–2 por sesión): sin predict/find-error/fix-code, el worker
   no interviene. Probable expansión futura.
5. **`main` desactualizada** — todo vive en `develop` (v0.1.0 etiquetada; sin
   merge a main visible).
6. **Diferidos del Master Plan**: derivación de factores diffScore/recency/
   consistency del dominio (D013), Fase 2 (Supabase/Auth), `errorLineNotes`
   (spec del dashboard), Dark/Light, i18n, gamificación.

---

## 21. Comandos

```sh
npm install
npm run dev            # desarrollo
npm test -- --run      # suite Vitest
npm run test:e2e       # Playwright (3 navegadores)
npm run lint           # ESLint --max-warnings 0
npm run typecheck      # tsc -b
npm run build          # build de producción
npm run analyze:bundle # bundle-stats.html
```

---

*Documento generado por lectura completa del repositorio el 2026-09-04
(develop @ 6c27296). Los ficheros `design-lab/`,
`docs/CODEGYM-DASHBOARD-FINAL-SPEC.md` y
`docs/CODEGYM-DASHBOARD-VISUAL-EXPLORATION.md` permanecen intactos y untracked.*
