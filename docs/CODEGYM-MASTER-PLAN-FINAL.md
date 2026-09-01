# CODEGYM — MASTER PLAN v1.0

> ## IMPLEMENTATION ENTRYPOINT — OPENCODE / CLAUDE CODE
>
> Este documento es la fuente de verdad principal de CodeGym.
>
> **Framework principal:** React + TypeScript.
>
> Stack previsto por el plan: Vite, React, TypeScript, Tailwind CSS, shadcn/ui, React Router, CodeMirror 6, Vitest, React Testing Library, Playwright y Web Worker.
>
> ### Primera interacción con el agente de implementación
>
> En la primera lectura de este documento: NO implementes nada, NO instales dependencias, NO modifiques archivos y NO comiences T001 automáticamente.
>
> Primero lee este documento completo e inspecciona el repositorio, `.claude/agents/` y `.claude/skills/`. Después pregunta: **«¿Con qué tarea del Master Plan quieres que empecemos?»** y espera la instrucción del usuario.
>
> El usuario decide cuándo avanzar. Cuando se indique una tarea como `T001`, implementa únicamente esa tarea, respeta sus dependencias y Definition of Done, valida el resultado, informa y detente. No avances automáticamente a la siguiente tarea.
>
> ---

EXECUTIVE SUMMARY
CodeGym es una plataforma personal de entrenamiento de programación para desarrolladores. El usuario entrena lectura de código, razonamiento lógico, detección de errores y corrección de código de forma progresiva.
MVP: Frontend completo con JavaScript, 4 tipos de ejercicio, progreso local, Worker para ejecución, responsive, accesible, testeado.
Stack: React, TypeScript, Vite, Tailwind, shadcn/ui, React Router, CodeMirror 6, Vitest, RTL, Playwright, Web Worker.
Sin backend en MVP. Repository pattern preparado para migrar a Supabase en Fase 2.
2. PRODUCT VISION
CodeGym es un gimnasio para programadores. El usuario entrena habilidades de programación de forma progresiva: lectura, razonamiento, detección de errores, corrección.
No es un cuestionario escolar. No es una colección de preguntas. No es una copia de plataformas educativas existentes. Es un producto profesional, visualmente diferenciado, técnicamente sólido.
Objetivo: Portfolio frontend/full-stack de calidad comercial.
3. PRODUCT PRINCIPLES
Razonamiento > Memorización: El usuario debe pensar antes de responder
Progresión: Cada concepto se trabaja en múltiples modalidades
Feedback inmediato: El usuario siempre sabe dónde está
Error como aprendizaje: Equivocarse es parte del entrenamiento
Profesionalismo visual: Cada pixel tiene intención
Sin sobrearquitectura: Solo abstracciones con consumidor real
Preparado para crecer: MVP → Fase 2 sin reescritura
4. MVP SCOPE
SÍ en MVP
React + TypeScript + Vite + Tailwind + shadcn/ui
React Router v6+
4 tipos de ejercicio: Code Reading, Predict Output, Find Error, Fix Code
Contenido: JavaScript (Arrays, Functions, Closures, Promises, Objects, ES6+, Errors)
Dark-first UI (gym moderno oscuro)
CodeMirror 6 para Fix Code
Web Worker para ejecución controlada
Repository pattern para persistencia
Progreso por concepto (domain, accuracy, attempts, errors)
Historial de intentos (Attempt, CompletedSession)
SessionStorage para recuperación de sesión
Lazy loading de contenido por topic
Cache en memoria
Reset Progress
Responsive mobile-first (320px → 1280px+)
Accesibilidad WCAG 2.1 AA
CSS animations con prefers-reduced-motion
Testing completo (Unit + Component + Integration + E2E)
Onboarding simplificado
Página de resultados
Review manual de conceptos
NO en MVP
Autenticación / Supabase
Backend / base de datos
Admin panel
Gamificación (puntos, insignias, rachas)
Repaso inteligente automático (spaced repetition)
Multi-idioma / i18n
Dark/Light toggle
Social features / Leaderboards
Framer Motion
React Query / SWR
Zustand / Redux
Complete Code, Refactor, Challenge, Explain, Debug, Code Review exercise types
Multi-language code execution
PWA / Mobile app
Analytics
Notificaciones
5. NON-MVP SCOPE (Fase 2 y 3)
Fase 2
Supabase (Auth + PostgreSQL + API)
Autenticación completa
Migración local → cuenta
Contenido remoto
Admin panel básico
Repaso inteligente (spaced repetition)
Gamificación básica (puntos, niveles)
Fase 3
TypeScript, React, Node.js, SQL, HTML/CSS, Git, APIs, Testing, Architecture content
Nuevos tipos de ejercicio (Complete, Refactor, Challenge, Explain, Debug, Code Review)
Contenido evolutivo versionado
Dark/Light toggle
Multi-idioma
Social features
Leaderboards
Achievements, streaks
PWA / Mobile app
Ejecución multi-lenguaje (WebContainers o servicio externo)
Admin panel completo
Analytics
6. LEARNING METHODOLOGY
Principio: RAZONAMIENTO > MEMORIZACIÓN
El usuario debe enfrentarse a situaciones donde tenga que pensar antes de responder.
Progresión pedagógica por concepto
Cada concepto puede trabajarse mediante múltiples etapas:
1. Concepto    → Qué es, para qué sirve
2. Ejemplo     → Código de ejemplo + explicación
3. Code Reading → Leer y comprender código
4. Predict     → Predecir resultado sin ejecutar
5. Find Error  → Detectar problema en código
6. Fix Code    → Corregir el problema
7. Variación   → Problema con variación
8. Aplicado    → Caso real de uso
9. Repaso      → Revisar conceptos débiles
Progresión de hints
Las pistas se revelan progresivamente:
Nivel 0: Sin pista (el usuario intenta solo)
Nivel 1: Pista contextual ("Revisa la condición del filter")
Nivel 2: Pista conceptual ("¿Qué retorna el callback de filter?")
Nivel 3: Pista específica ("El problema está en la línea 3")
Nivel 4: Explicación completa (se muestra la razón del error)
Nivel 5: Solución (solo si el usuario lo pide explícitamente)
Cada exercise step puede tener hints: string[]. El usuario revela una pista a la vez. Cada pista revelada reduce la puntuación del step.
Diseño de ejercicios con errores deliberados
Los ejercicios incluyen errores diseñados para detectar problemas comunes:
Tipo de error	Ejemplo
Lógico	user.active = true en vez de ===
Mutación	Mutar argumento dentro de filter/map
Scope	Variable definida fuera de scope donde se usa
Async	Olvidar await en promise
Flujo	Return temprano que impide ejecución
Estado	Mutar state directamente
Tipo	Comparación con == cuando se necesita ===
Conceptual	Usar forEach cuando se necesita map
7. EXERCISE SYSTEM
Tipos de ejercicio MVP
Code Reading — El usuario lee código y determina qué hace, qué retorna, qué problema tiene.
Código → Pregunta de selección múltiple → Explicación
Predict Output — El usuario predice qué retorno o efecto tiene un código.
Código + input → El usuario escribe/selecciona output → Comparación + explicación
Find Error — El usuario identifica la línea y tipo de error en código con problema.
Código con error → Seleccionar línea + clasificar error → Explicación
Fix Code — El usuario corrige código usando un editor CodeMirror.
Código con error → Editor CodeMirror → Ejecución en Worker → Validación + explicación
Tipos futuros (no implementar)
Complete Code, Refactor, Challenge, Explain Code, Debug, Multiple Choice avanzado, Code Review, Compare Solutions.
Arquitectura de tipos de ejercicio
type StepType = 'code-reading' | 'predict-output' | 'find-error' | 'fix-code';
// Futuros: | 'complete-code' | 'refactor' | 'challenge' | 'explain' | 'debug';
El ExerciseEngine valida cada tipo de forma diferente.añadir un nuevo tipo = añadir un caso en validateStep() + un componente de UI. No requiere cambiar la arquitectura.
8. CONTENT STRATEGY
Formato
Contenido en archivos JSON (ejercicios) y Markdown (conceptos) versionados dentro del repositorio.
Estructura
data/content/javascript/
├── index.json
├── arrays/
│   ├── concept.md
│   ├── index.json
│   └── sessions/
│       ├── filter-mutation.json
│       ├── map-vs-foreach.json
│       └── reduce-accumulator.json
├── functions/
│   └── ...
├── closures/
│   └── ...
├── promises/
│   └── ...
├── objects/
│   └── ...
├── es6-plus/
│   └── ...
└── errors/
    └── ...
Loading strategy
App inicia → technologies.json (~1KB)
Selecciona tecnología → topic index (~1KB)
Selecciona topic → concept.md + session list (~3-10KB)
Inicia sesión → session JSON (~3-10KB)
Nunca cargar todo al inicio. Cada carga es lazy y se cachea en memoria.
9. EVOLVING TECHNOLOGY CONTENT STRATEGY
Versionado de contenido
Cada ejercicio y concepto puede tener:
{
  "version": "1.0.0",
  "status": "published",
  "minVersion": "ES2015",
  "deprecated": false
}
Estados de contenido
draft → published → updated → deprecated → legacy
Contenido legacy
El contenido antiguo no desaparece. Se marca como deprecated o legacy y se muestra con indicador visual. Es útil para:
Mantenimiento de proyectos existentes
Entrevistas que preguntan sobre código legacy
Compatibilidad
Añadir nueva tecnología
1. Crear data/content/typescript/index.json
2. Crear topics
3. Crear conceptos + sesiones
4. Actualizar technologies.json
5. La app la muestra automáticamente
No requiere modificar ningún componente ni el engine.
10. UX/UI VISION
Concepto visual
"Modern developer gym"
Dark-first. Jerarquía visual fuerte. Tipografía profesional. Código con tipografía monoespaciada. Feedback visual claro. No es un dashboard genérico. Es una plataforma de entrenamiento técnico.
Dirección estética
Fondo: #0a0a0f → #12121a → #1a1a25
Texto: #f0f0f5 (primario), #a0a0b5 (secundario), #606075 (muted)
Acento: #6366f1 (indigo)
Éxito: #22c55e
Error: #ef4444
Code: #0d1117 (fondo), #21262d (borde)
Font UI: Inter
Font code: JetBrains Mono
Estados de UI
idle → hover → focus → active → disabled
loading → success → error → empty
Cada componente interactivo debe manejar estos estados.
Identidad visual
Depende de:
Layout con jerarquía clara
Tipografía con escala definida
Color con propósito
Spacing consistente
Iconografía (Lucide React)
Code presentation excellence
Motion con información
No depende de:
Imágenes decorativas
Ilustraciones genéricas
Gradientes sin propósito
Stock photos
11. RESPONSIVE STRATEGY
Mobile-first real
Cada componente se diseña considerando TODOS los breakpoints desde su primera implementación.
Breakpoints
/* Mobile: 0-639px */
/* sm: 640px — Móviles grandes */
/* md: 768px — Tablets */
/* lg: 1024px — Laptops */
/* xl: 1280px — Desktop */
Layout por breakpoint
Mobile (0-639px):
Bottom navigation bar
Contenido a ancho completo
Cards apiladas verticalmente
Editor de código: pantalla completa
Code blocks: scroll horizontal
Tablet (640-1023px):
Top navigation bar
Grid 2 columnas para cards
Más espacio para editor
Desktop (1024px+):
Sidebar izquierda
Contenido central (máx 900px)
Más espacio entre elementos
Componentes que deben ser responsive desde su primera implementación
MobileNav / Sidebar / TopBar
ExerciseCard
ConceptProgress
CodeBlock / CodeEditor
SessionHeader
StepIndicator
HintReveal
ResultFeedback
DashboardPage
ResultsPage
ReviewPage
TechnologyPage / TopicPage
12. DESIGN SYSTEM
Jerarquía de tokens (D008)
La implementación organiza el color en cuatro capas. Cada concepto visual tiene un único valor, declarado una sola vez en la capa primitiva.
  CAPA 1  PRIMITIVAS   los valores de esta sección. Fuente única de verdad.
     ↓
  CAPA 2  SEMÁNTICAS   contrato shadcn/ui (background, foreground, primary…). Derivadas con var(), sin literales propios.
     ↓
  CAPA 3  TAILWIND     tailwind.config.js expone hsl(var(--semántica)) como utilidades.
     ↓
  CAPA 4  COMPONENTES  consumen utilidades (bg-background, text-foreground, text-success…).
Regla: los componentes NO leen primitivas directamente. Las excepciones se justifican por escrito (hoy solo el bloque de resaltado de código en index.css, cuyos tonos no tienen equivalente semántico en shadcn).
Tokens
:root {
  /* Background */
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-tertiary: #1a1a25;
  --bg-surface: #1e1e2a;
  --bg-elevated: #252535;

  /* Text */
  --text-primary: #f0f0f5;
  --text-secondary: #a0a0b5;
  --text-muted: #606075;

  /* Accent — dos tonos con roles excluyentes (D007) */
  --accent: #6366f1;       /* marca. NO textual: bordes, iconos, focus ring, glows.
                              4.42:1 sobre --bg-primary → cumple el 3:1 no textual,
                              NO el 4.5:1 de texto normal que exige §14. */
  --accent-text: #818cf8;  /* texto e interacción. 6.62:1 sobre --bg-primary → AA.
                              Es también la superficie de los botones primarios,
                              con --bg-primary como color de texto (6.62:1). */
  --accent-hover: #818cf8; /* mismo valor que --accent-text; en la implementación
                              se declara como alias para no duplicar el literal. */
  --accent-glow: rgba(99, 102, 241, 0.15);

  /* Semantic */
  --success: #22c55e;
  --success-glow: rgba(34, 197, 94, 0.15);
  --error: #ef4444;
  --error-glow: rgba(239, 68, 68, 0.15);
  --warning: #f59e0b;

  /* Code */
  --code-bg: #0d1117;
  --code-border: #21262d;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
Notas de implementación
Formato: las primitivas de color se declaran en index.css como canales HSL («240 20% 5%») en lugar de hex. Es necesario para que la capa semántica las derive con var() y para que Tailwind inyecte modificadores de opacidad (bg-primary/20 → hsl(var(--primary) / .2)). Cada token documenta su hex equivalente en un comentario; todas las conversiones reproducen el hex de esta sección de forma exacta.
--space-*: la escala coincide exactamente con la de Tailwind (1,2,3,4,5,6,8,10,12,16 → 4,8,12,16,20,24,32,40,48,64 px). Se consume mediante utilidades (p-4, gap-6…) y no se declara como variables CSS sin consumidor, para no mantener dos escalas de espaciado en paralelo. Esta sección sigue siendo la especificación de la escala.
--radius-*: sí se declaran, porque tailwind.config.js los consume directamente (rounded-sm|md|lg|xl|full). Sustituyen al token --radius de shadcn, que derivaba una escala distinta (md 6px en vez de 8px).
Componentes shadcn/ui (base)
Button, Card, Badge, Input, Textarea, Select, Tabs, Dialog, Tooltip, Progress, Separator, Skeleton, Toast/Alert
Componentes CodeGym (custom)
Componente	Responsabilidad
CodeBlock	Mostrar código con syntax highlight (lectura)
CodeEditor	CodeMirror wrapper (edición)
ExerciseCard	Tarjeta de ejercicio con estado
ConceptProgress	Barra de progreso por concepto
StepIndicator	Progreso de pasos en sesión
HintReveal	Pista que se revela progresivamente
ResultFeedback	Feedback post-respuesta (correct/incorrect + explicación)
SessionHeader	Título, concepto, dificultad, progreso
DifficultyBadge	Badge de dificultad
EmptyState	Estado vacío con CTA
13. ANIMATION STRATEGY
Principio
Cada animación comunica información o feedback. Sin decoración gratuita.
CSS animations/transitions
/* Entrada */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Feedback correcto */
@keyframes correctPulse {
  0% { box-shadow: 0 0 0 0 var(--success-glow); }
  70% { box-shadow: 0 0 0 8px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}

/* Feedback incorrecto */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

/* Progreso */
@keyframes progressFill {
  from { width: var(--from); }
  to { width: var(--to); }
}
Aplicación por componente
Componente	Animación
ExerciseCard	fadeInUp en entrada
CodeReadingStep	fadeInUp en paso nuevo
HintReveal	fadeIn al revelar pista
ResultFeedback	correctPulse o shake según resultado
Progress bar	progressFill
StepIndicator	slide indicator al cambiar paso
Session completada	celebrateAnimation (confetti sutil + fade)
prefers-reduced-motion
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
Celebración de sesión completada
Al completar una sesión correctamente:
Checkmark animado
Progress increment animation
Resumen de resultados con stagger
Para milestones grandes: confetti sutil (CSS-only, opaco, no infantil)
La animación nunca es obligatoria para entender la interfaz.
14. ACCESSIBILITY
Standard: WCAG 2.1 AA
Requisitos
Todas las interacciones accesibles por teclado
Tab order lógico
Focus visible en todos los elementos interactivos
ARIA labels donde sea necesario
Semantic HTML (button, nav, main, article, etc.)
Screen reader announcements para cambios de estado
Color contrast >= 4.5:1 (texto), >= 3:1 (texto grande)
Touch targets >= 44px
prefers-reduced-motion respetado
CodeMirror: modo accesible o fallback textarea
Focus management
Al cambiar de step: focus al prompt del nuevo step
Al abrir modal: focus al modal, trap focus
Al cerrar modal: focus al trigger
Al completar sesión: focus al resultado
15. APPLICATION ARCHITECTURE
Capas
UI (Pages + Components)
    ↓
Hooks (useProgress, useSession, useContent, useCodeExecution)
    ↓
Contexts (ProgressContext, ContentContext)
    ↓
Services / Engine (ExerciseEngine — lógica pura)
    ↓
Repositories (IProgressRepo, IAttemptRepo, ICompletedSessionRepo, IContentRepo)
    ↓
Infrastructure (localStorage, Web Worker)
Reglas de dependencia
UI          → puede usar: Hooks, Contexts, shadcn/ui, CSS
Hooks       → puede usar: Contexts, Engine (interfaces)
Engine      → puede usar: IContentRepository, ICodeExecutor (interfaces)
Executor    → puede usar: Web Worker (implementación concreta)
Repositories → puede usar: localStorage (implementación concreta)
Prohibiciones
UI          → NO puede usar: localStorage, Worker, Supabase
Hooks       → NO puede usar: localStorage, Worker, implementaciones concretas
Engine      → NO puede usar: localStorage, Worker, DOM, React
CodeEditor  → NO puede usar: Worker, Engine, repositories
Worker      → NO puede usar: React, DOM, estado de la app, localStorage de la app
16. FOLDER ARCHITECTURE
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx
│
├── components/
│   ├── ui/                          ← shadcn/ui
│   ├── layout/
│   │   ├── MobileNav.tsx
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   └── codegym/
│       ├── CodeBlock.tsx
│       ├── CodeEditor.tsx
│       ├── ExerciseCard.tsx
│       ├── ConceptProgress.tsx
│       ├── StepIndicator.tsx
│       ├── HintReveal.tsx
│       ├── ResultFeedback.tsx
│       ├── DifficultyBadge.tsx
│       ├── SessionHeader.tsx
│       └── EmptyState.tsx
│
├── features/
│   ├── home/
│   │   └── HomePage.tsx
│   ├── dashboard/
│   │   ├── DashboardPage.tsx
│   │   └── components/
│   │       ├── ProgressOverview.tsx
│   │       ├── RecentActivity.tsx
│   │       └── WeakConcepts.tsx
│   ├── practice/
│   │   ├── TechnologyPage.tsx
│   │   └── TopicPage.tsx
│   ├── session/
│   │   ├── SessionPage.tsx
│   │   ├── session-reducer.ts
│   │   ├── session-types.ts
│   │   └── steps/
│   │       ├── CodeReadingStep.tsx
│   │       ├── PredictOutputStep.tsx
│   │       ├── FindErrorStep.tsx
│   │       └── FixCodeStep.tsx
│   ├── review/
│   │   └── ReviewPage.tsx
│   └── results/
│       └── ResultsPage.tsx
│
├── hooks/
│   ├── useProgress.ts
│   ├── useSession.ts
│   ├── useContent.ts
│   └── useCodeExecution.ts
│
├── lib/
│   ├── engine/
│   │   ├── types.ts
│   │   ├── exercise-engine.ts
│   │   ├── scoring.ts
│   │   └── validation.ts
│   ├── executor/
│   │   ├── types.ts
│   │   ├── ICodeExecutor.ts
│   │   ├── WorkerExecutor.ts
│   │   └── worker-script.ts
│   ├── repositories/
│   │   ├── types.ts
│   │   ├── IProgressRepository.ts
│   │   ├── IAttemptRepository.ts
│   │   ├── ICompletedSessionRepository.ts
│   │   ├── IContentRepository.ts
│   │   ├── LocalProgressRepository.ts
│   │   ├── LocalAttemptRepository.ts
│   │   ├── LocalCompletedSessionRepository.ts
│   │   └── StaticContentRepository.ts
│   ├── errors/
│   │   ├── types.ts
│   │   └── ErrorBoundary.tsx
│   ├── progress/
│   │   ├── domain-calculator.ts
│   │   └── migration.ts
│   └── utils.ts
│
├── contexts/
│   ├── ProgressContext.tsx
│   └── ContentContext.tsx
│
├── data/
│   ├── content/
│   │   └── javascript/
│   │       ├── index.json
│   │       ├── arrays/
│   │       ├── functions/
│   │       ├── closures/
│   │       ├── promises/
│   │       ├── objects/
│   │       ├── es6-plus/
│   │       └── errors/
│   └── technologies.json
│
├── styles/
│   └── globals.css
│
└── types/
    ├── exercise.ts
    ├── content.ts
    ├── progress.ts
    └── repository.ts
17. DOMAIN MODEL
Technology
interface Technology {
  id: string;           // "javascript"
  name: string;         // "JavaScript"
  icon: string;         // "js"
  description: string;
}
Topic
interface Topic {
  id: string;           // "js-arrays"
  name: string;         // "Arrays"
  technologyId: string; // "javascript"
  description: string;
}
Concept
interface Concept {
  id: string;           // "js-array-filter"
  name: string;         // "Array.filter()"
  topicId: string;      // "js-arrays"
  technologyId: string; // "javascript"
  contentMarkdown: string;
}
ExerciseSession
interface ExerciseSession {
  id: string;                    // "js-arrays-filter-mutation-01"
  title: string;                 // "Filter no debería mutar"
  conceptId: string;             // "js-array-filter"
  technologyId: string;          // "javascript"
  difficulty: Difficulty;        // "beginner" | "intermediate" | "advanced"
  version: string;               // "1.0.0"
  status: ContentStatus;         // "draft" | "published" | "deprecated" | "legacy"
  createdAt: string;             // ISO date
  updatedAt: string | null;
  steps: ExerciseStep[];
}

type Difficulty = 'beginner' | 'intermediate' | 'advanced';
type ContentStatus = 'draft' | 'published' | 'updated' | 'deprecated' | 'legacy';
ExerciseStep
interface ExerciseStep {
  id: string;                    // "step-1"
  type: StepType;
  prompt: string;
  code: string | null;
  language: string | null;
  options: AnswerOption[] | null;
  errorLines: number[] | null;
  errorType: string | null;
  testCases: TestCase[] | null;
  expectedPatterns: string[] | null;
  explanation: string;
  hints: string[];
  stepOrder: number;
}

type StepType = 'code-reading' | 'predict-output' | 'find-error' | 'fix-code';
AnswerOption
interface AnswerOption {
  id: string;       // "a"
  text: string;
  correct: boolean;
}
TestCase
interface TestCase {
  input: unknown;
  expected: unknown;
  call: string;          // "getUsers(input)"
  description: string;
}
ConceptProgress
interface ConceptProgress {
  conceptId: string;
  domain: number;                        // 0-100
  totalAttempts: number;
  correctAttempts: number;
  difficultyDistribution: DifficultyDistribution;
  recentErrors: ErrorRecord[];
  lastPracticed: string;                 // ISO date
  schemaVersion: number;                 // 1
}

interface DifficultyDistribution {
  beginner: { total: number; correct: number };
  intermediate: { total: number; correct: number };
  advanced: { total: number; correct: number };
}

interface ErrorRecord {
  stepType: string;
  errorType: string;
  timestamp: string;
  sessionId: string;
}
Attempt
interface Attempt {
  id: string;                // UUID
  sessionId: string;
  stepId: string;
  stepType: string;
  answer: unknown;
  isCorrect: boolean;
  timeSpentMs: number;
  hintsUsed: number;
  createdAt: string;         // ISO date
}
CompletedSession
interface CompletedSession {
  id: string;                // UUID
  sessionId: string;
  technologyId: string;
  conceptId: string;
  totalSteps: number;
  correctSteps: number;
  accuracy: number;          // 0-100
  timeSpentMs: number;
  completedAt: string;       // ISO date
}
UserAnswer
interface UserAnswer {
  stepId: string;
  stepType: StepType;
  answer: StepAnswer;        // según el tipo del paso, ver StepAnswer
  isCorrect: boolean;        // lo fija el engine al validar la respuesta
  timeSpentMs: number;
  hintsUsed: number;
}
StepAnswer
interface FindErrorAnswer {
  line: number;              // línea 1-based del code del paso
  errorType: string;
}

type StepAnswer = string | number | FindErrorAnswer;
La respuesta de find-error es compuesta (D014). §7 pide al usuario dos cosas —«Seleccionar línea + clasificar error»— y §24 valida las dos contra errorLines y errorType, de modo que un solo escalar no puede transportarla. Los pasos de opción única siguen respondiendo con el optionId y fix-code con el código.
El campo isCorrect resuelve una incoherencia del propio plan: §24 calcula la puntuación con answers.filter(a => a.isCorrect) sobre un UserAnswer[], y §21 construye los Attempt al completar la sesión a partir de SessionState.answers. Sin este campo, ni la fórmula de §24 compila ni Attempt.isCorrect tiene origen.
SessionScore
interface SessionScore {
  totalSteps: number;
  correctSteps: number;
  accuracy: number;
  timeSpentMs: number;
  hintsUsed: number;
  domainImpact: DomainImpact;
}

interface DomainImpact {
  previousDomain: number;
  newDomain: number;
  change: number;
}
IDs
Todos los IDs son strings. Nunca índices. Estables ante reordenamientos.
18. STATE ARCHITECTURE
UI State (useState)
sidebarOpen: boolean
activeTab: string
hintRevealed: boolean
modalOpen: boolean
Session State (useReducer)
interface SessionState {
  sessionId: string;
  currentStep: number;
  answers: UserAnswer[];
  startTime: number;
  elapsedMs: number;
  hintsRevealed: number[];
  isValidating: boolean;
  isComplete: boolean;
  error: string | null;
}

type SessionAction =
  | { type: 'SUBMIT_ANSWER'; payload: UserAnswer }
  | { type: 'NEXT_STEP' }
  | { type: 'REVEAL_HINT'; payload: number }
  | { type: 'SET_VALIDATING'; payload: boolean }
  | { type: 'SET_COMPLETE' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESTORE'; payload: Partial<SessionState> }
  | { type: 'RESET' };

// Transiciones inválidas:
// No se puede SUBMIT_ANSWER si isValidating es true
// No se puede NEXT_STEP si no hay respuesta para el step actual
// No se puede SET_COMPLETE si hay steps sin responder
Progress State (Context + Repository)
interface ProgressContextValue {
  progress: Map<string, ConceptProgress>;
  updateProgress: (conceptId: string, update: Partial<ConceptProgress>) => Promise<void>;
  getConceptDomain: (conceptId: string) => number;
  isLoading: boolean;
  error: string | null;
}
Content State (Context + useState + cache)
interface ContentContextValue {
  technologies: Technology[];
  getTechnology: (id: string) => Technology | undefined;
  getTopics: (technologyId: string) => Promise<Topic[]>;
  getConcept: (conceptId: string) => Promise<Concept | null>;
  getSession: (sessionId: string) => Promise<ExerciseSession | null>;
  isLoading: boolean;
}
Cache: Map<string, Topic[]>, Map<string, Concept>, Map<string, ExerciseSession>.
Auth State
No existe en MVP. Se añade en Fase 2 como AuthContext.
19. ROUTING
Rutas MVP
const routes = [
  { path: '/',                                element: <HomePage /> },
  { path: '/dashboard',                       element: <DashboardPage /> },
  { path: '/tech/:technologyId',              element: <TechnologyPage /> },
  { path: '/tech/:technologyId/:topicId',     element: <TopicPage /> },
  { path: '/practice/:sessionId',             element: <SessionPage /> },
  { path: '/review',                          element: <ReviewPage /> },
  { path: '/results/:sessionId',              element: <ResultsPage /> },
  { path: '*',                                element: <NotFoundPage /> },
];
Todas públicas en MVP. Sin ProtectedRoute.
Preparación para Fase 2
// Fase 2: envolver rutas privadas
const privateRoutes = ['/dashboard', '/tech/*', '/practice/*', '/review', '/results/*'];

// ProtectedRoute se añade en el router, no en los componentes
// Los componentes de página NO cambian
20. PERSISTENCIA
Repository Pattern
UI → Hooks → Context → IProgressRepository → LocalProgressRepository → localStorage
                                         → IAttemptRepository → LocalAttemptRepository → localStorage
                                         → ICompletedSessionRepository → LocalCompletedSessionRepository → localStorage
                                         → IContentRepository → StaticContentRepository → JSON/MD
Interfaces
interface IProgressRepository {
  getConceptProgress(conceptId: string): Promise<ConceptProgress | null>;
  getAllProgress(): Promise<ConceptProgress[]>;
  updateProgress(conceptId: string, progress: ConceptProgress): Promise<void>;
  clearProgress(): Promise<void>;
}

interface IAttemptRepository {
  saveAttempt(attempt: Attempt): Promise<void>;
  getAttemptsBySession(sessionId: string): Promise<Attempt[]>;
  getRecentAttempts(limit: number): Promise<Attempt[]>;
  clearAttempts(): Promise<void>;
}

interface ICompletedSessionRepository {
  save(session: CompletedSession): Promise<void>;
  getBySessionId(sessionId: string): Promise<CompletedSession | null>;
  getRecent(limit: number): Promise<CompletedSession[]>;
  clear(): Promise<void>;
}

interface IContentRepository {
  getTechnologies(): Promise<Technology[]>;
  getTopicsByTechnology(technologyId: string): Promise<Topic[]>;
  getConceptById(conceptId: string): Promise<Concept | null>;
  getSessionsByConcept(conceptId: string): Promise<ExerciseSession[]>;
  getSessionById(sessionId: string): Promise<ExerciseSession | null>;
}
MVP implementations
LocalProgressRepository → localStorage key codegym:progress
LocalAttemptRepository → localStorage key codegym:attempts
LocalCompletedSessionRepository → localStorage key codegym:completed-sessions
StaticContentRepository → imports estáticos de data/content/
Fase 2 implementations
SupabaseProgressRepository
SupabaseAttemptRepository
SupabaseCompletedSessionRepository
ApiContentRepository
21. SESSION RECOVERY
sessionStorage key
codegym:session → {
  sessionId: string,
  currentStep: number,
  answers: UserAnswer[],
  elapsedMs: number,
  hintsRevealed: number[],
  startTime: number
}
Ciclo de vida
INICIAR SESIÓN:
  → sessionStorage.setItem('codegym:session', initialState)

EN CADA STEP:
  → sessionStorage.setItem('codegym:session', currentState)

AL COMPLETAR:
  → guardar progress (localStorage)
  → guardar attempts (localStorage)
  → guardar completedSession (localStorage)
  → sessionStorage.removeItem('codegym:session')

AL ABANDONAR:
  → sessionStorage.removeItem('codegym:session')

AL RECARGAR:
  → leer sessionStorage
  → si existe sesión: mostrar "Tienes una sesión incompleta"
  → opciones: "Continuar" o "Empezar de nuevo"
  → si continuar: restaurar estado
  → si nuevo: limpiar + empezar
22. PROGRESS SYSTEM
Cálculo de dominio
weightedScore = (precision * 0.35) +
                (errorRate * 0.25) +
                (diffScore * 0.20) +
                (recency * 0.10) +
                (consistency * 0.10)

domain = clamp(0, 100, round(weightedScore * 100))

Los cinco factores viajan en el rango 0..1 y están orientados igual: 1 es siempre el mejor valor, también en errorRate, que quien lo derive debe pasar ya invertido. La escala por 100 es necesaria porque con factores 0..1 la suma ponderada solo llega a 1, y ConceptProgress.domain está documentado como 0-100. Ver D013.
Factor	Peso	Descripción
precision	35%	correctAttempts / totalAttempts
diffScore	25%	Ponderado por dificultad de ejercicios resueltos
errorRate	20%	Ratio de errores recientes vs total
recency	10%	Ejercicios recientes pesan más
consistency	10%	Practicar en días separados > todo de golpe
Impacto de sesión
interface DomainImpact {
  previousDomain: number;
  newDomain: number;
  change: number;  // positivo o negativo
}
La lógica de cálculo vive en lib/progress/domain-calculator.ts. Lógica pura, sin React. calculateDomain recibe los cinco factores ya calculados en un DomainFactors; §22 no define fórmula para diffScore, recency ni consistency, ni la ventana de errores recientes, y recency y consistency necesitarían datos que ConceptProgress no guarda. Derivarlos queda pendiente de la tarea que especifique el modelo de progreso. calculateDomainImpact(previous, next) construye el DomainImpact a partir de los dos dominios ya calculados. Ver D013.
23. HISTORY SYSTEM
Attempt
Cada respuesta de cada step se guarda como Attempt.
CompletedSession
Al terminar una sesión, se guarda metadata completa.
Uso futuro
El historial permite: estadísticas, tendencias, análisis de errores, repaso.
No implementar streaks, achievements, leaderboard, social en MVP.
24. EXERCISE ENGINE
Interface
class ExerciseEngine {
  constructor(
    private contentRepo: IContentRepository,
    private executor: ICodeExecutor
  ) {}

  async loadSession(sessionId: string): Promise<ExerciseSession>;
  validateSelection(step: ExerciseStep, answer: StepAnswer): ValidationResult;
  async validateFixCode(step: ExerciseStep, userCode: string): Promise<ValidationResult>;
  calculateScore(session: ExerciseSession, answers: UserAnswer[], domainImpact: DomainImpact): SessionScore;
  getNextStep(currentStep: number, totalSteps: number): number | null;
}
Validation por tipo
Tipo	Método	Validación
code-reading	validateSelection	optionId contra correct flag
predict-output	validateSelection	optionId contra correct flag
find-error	validateSelection	línea + tipo contra errorLines + errorType (answer: FindErrorAnswer)
fix-code	validateFixCode	ejecutar en Worker + comparar con testCases
Scoring
function calculateScore(session, answers, domainImpact): SessionScore {
  const totalSteps = session.steps.length;
  const correct = answers.filter(a => a.isCorrect).length;
  const accuracy = totalSteps === 0 ? 0 : (correct / totalSteps) * 100;
  const timeSpentMs = answers.reduce((t, a) => t + a.timeSpentMs, 0);
  const hintsUsed = answers.reduce((t, a) => t + a.hintsUsed, 0);
  return { totalSteps, correctSteps: correct, accuracy, timeSpentMs, hintsUsed, domainImpact };
}
domainImpact se recibe como parámetro en lugar de calcularse aquí: §22 sitúa ese cálculo en lib/progress/domain-calculator.ts, y inyectarlo mantiene el scoring como aritmética pura. T050 es donde ambos se juntan. hintsUsed se acumula como dato informativo: §6 dice que cada pista reduce la puntuación del paso, pero ni esta sección define la penalización ni SessionScore tiene un campo de puntuación por paso donde aplicarla. Ver D012.
25. CODE EXECUTION ARCHITECTURE
CodeEditor → UserCode → ExerciseEngine.validateFixCode() → ICodeExecutor → WorkerExecutor → Web Worker
                                                                                                 ↓
                                                                                           ExecutionResult
                                                                                                 ↓
                                                                                           ValidationResult
                                                                                                 ↓
                                                                                           Feedback UI
Límites
Límite	Valor
Timeout	3000ms
Ejecuciones simultáneas	1
Cola	FIFO
Alcance	Web Worker (aislado del DOM y localStorage de la app)
Qué puede el Worker
Ejecutar JavaScript arbitrario
Crear objetos, funciones, closures
Usar async/await
Fetch a servicios externos (limitado)
Crear timers
Qué NO puede el Worker
Acceder al DOM de la aplicación
Acceder al localStorage de la aplicación
Acceder a cookies, IndexedDB de la aplicación
Acceder a React, hooks, estado de la app
Acceder a window.parent (no existe en Worker)
Registrar Service Workers
Amenazas aceptadas para MVP
Amenaza	Nivel	Mitigación
while(true)	Bajo	worker.terminate() tras 3s
new Array(1e9)	Bajo	Timeout + terminate
fetch a externo	Bajo	No hay datos sensibles en el Worker
CPU spike	Bajo	3s máximo
Errores no controlados	Medio	onerror + recreate
Documentación de seguridad
Web Worker NO equivale a sandbox de seguridad perfecto. El MVP acepta ejecución de JavaScript arbitrario dentro del Worker porque CodeGym es una herramienta educativa local. Fase 2 debe reevaluar aislamiento más fuerte si se ejecuta código de terceros.
26. WORKER ARCHITECTURE
WorkerExecutor
class WorkerExecutor implements ICodeExecutor {
  private worker: Worker | null = null;
  private workerUrl: string | null = null;
  private pending: Map<string, PendingExecution> = new Map();
  private queue: QueuedExecution[] = [];
  private isExecuting: boolean = false;

  constructor() { this.createWorker(); }

  async execute(code: string, testCases: TestCase[]): Promise<ExecutionResult> {
    if (this.isExecuting) {
      return new Promise((resolve, reject) => {
        this.queue.push({ code, testCases, resolve, reject });
      });
    }
    return this.runExecution(code, testCases);
  }

  destroy() {
    // Rechazar pending + queue
    // terminate worker
    // revoke blob URL
    // limpiar todo
  }
}
worker-script.ts
self.onmessage = function(event) {
  const { type, id, code, testCases } = event.data;
  if (type !== 'execute') return;

  const results = [];
  for (const test of testCases) {
    try {
      const fn = new Function('input', `${code}\nreturn (${test.call});`);
      const actual = fn(test.input);
      results.push({
        input: test.input,
        expected: test.expected,
        actual,
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

  self.postMessage({ type: 'result', id, results });
};
Lifecycle
CONSTRUCTOR → createWorker()
EJECUCIÓN → postMessage → watchdog 3s → resolve/reject
TIMEOUT → pending.delete → worker.terminate → createWorker → reject
ERROR → worker.terminate → createWorker → reject pending
DESTRUIR → terminate → revoke URL → reject all → clear
Validación de mensajes
// En WorkerExecutor.handleMessage:
// 1. Validar que data existe
// 2. Validar data.type === 'result'
// 3. Validar typeof data.id === 'string'
// 4. Validar Array.isArray(data.results)
// 5. Validar que pending.has(data.id)
// 6. Si任何 validación falla: ignorar mensaje
27. ERROR HANDLING
ErrorType
enum ErrorType {
  CONTENT_NOT_FOUND,
  SESSION_NOT_FOUND,
  STEP_NOT_FOUND,
  INVALID_JSON,
  STORAGE_UNAVAILABLE,
  STORAGE_FULL,
  EXECUTION_TIMEOUT,
  EXECUTION_ERROR,
  WORKER_ERROR,
  INVALID_CODE,
  UNEXPECTED_RESULT,
  RECOVERY_FAILED,
}
Estrategia
Error	Recuperable	Retryable	UI
CONTENT_NOT_FOUND	No	No	Empty state + home
SESSION_NOT_FOUND	No	No	Toast + redirect
STEP_NOT_FOUND	Sí	No	Skip o error
INVALID_JSON	No	No	Error page
STORAGE_UNAVAILABLE	Sí	No	Banner + in-memory
STORAGE_FULL	Sí	Sí	Toast warning
EXECUTION_TIMEOUT	Sí	Sí	"Tiempo agotado" + reintentar
EXECUTION_ERROR	Sí	Sí	Error + reintentar
WORKER_ERROR	Sí	Sí	"Error de ejecución" + reintentar
INVALID_CODE	Sí	Sí	"Código inválido"
UNEXPECTED_RESULT	Sí	No	"Resultado inesperado"
RECOVERY_FAILED	No	Sí	"No se pudo recuperar" + empezar nuevo
Estados de carga
IDLE → nothing
LOADING → skeleton/spinner
SUCCESS → content
ERROR → error + retry
EMPTY → empty state + CTA
ErrorBoundary
// Global en App.tsx
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>
28. SECURITY
MVP
No hay backend, no hay auth, no hay multi-usuario. Las amenazas son internas.
Amenaza	Mitigación	Aceptado
Worker ejecuta código malicioso	Worker aislado, timeout, terminate	Sí
Worker consume CPU	3s timeout	Sí
Worker hace fetch externo	No hay datos sensibles	Sí
Worker causa OOM	Timeout limita	Sí
localStorage lleno	Manejo de error	Sí
localStorage corrupto	Try/catch + fallback	SÍ
Fase 2
Supabase RLS
JWT validation
Rate limiting
Input validation (Zod)
CORS
29. PRIVACY
Datos almacenados en el navegador
Key	Contenido	Propósito
codegym:progress	Domain por concepto	Progreso
codegym:attempts	Historial de respuestas	Estadísticas
codegym:completed-sessions	Metadata de sesiones	Historial
codegym:preferences	Theme, language	Configuración
codegym:session	Estado de sesión activa	Recuperación
Datos que NUNCA se almacenan
Passwords, tokens, cookies de sesión, IP, analytics, datos personales, código fuente del usuario como persistencia.
Reset Progress
function resetProgress() {
  localStorage.removeItem('codegym:progress');
  localStorage.removeItem('codegym:attempts');
  localStorage.removeItem('codegym:completed-sessions');
  sessionStorage.removeItem('codegym:session');
}
Reset Preferences (independiente)
function resetPreferences() {
  localStorage.removeItem('codegym:preferences');
}
30. TESTING STRATEGY
Unit (Vitest)
lib/engine/exercise-engine.ts
lib/engine/scoring.ts
lib/engine/validation.ts
lib/progress/domain-calculator.ts
lib/repositories/Local*Repository.ts
lib/executor/WorkerExecutor.ts
features/session/session-reducer.ts
Executor Tests (detallado)
✓ código correcto → pass: true
✓ syntax error → results con error
✓ runtime error → results con error
✓ while(true) → timeout tras 3s
✓ ejecución duplicada → serialización FIFO
✓ destroy durante ejecución → reject DESTROYED
✓ mensajes inesperados → ignorados
✓ recreateWorker tras timeout
✓ recreateWorker tras error
✓ cleanup completo en destroy
✓ revoke Blob URL
✓ múltiples ejecuciones en cola → FIFO
Component (RTL)
CodeBlock, CodeEditor, ExerciseCard, ConceptProgress,
StepIndicator, HintReveal, ResultFeedback, DifficultyBadge,
EmptyState, SessionHeader
Integration
Completar sesión completa → progress guardado + attempts guardados
Recuperar sesión tras reload → continuar correctamente
Reset progress → todo limpio
E2E (Playwright)
Home → Technology → Topic → Concept → Session → Results → Dashboard
Responsive: 320px, 768px, 1024px, 1280px
Accesibilidad: axe-core
31. PERFORMANCE STRATEGY
Targets
FCP < 1.5s
LCP < 2.5s
CLS < 0.1
TTI < 3s en mobile
Estrategias
Lazy routes (React.lazy)
Lazy CodeMirror (dynamic import)
Lazy content (por topic)
Cache en memoria
CSS animations (GPU-accelerated)
Fonts: font-display: swap
Bundle monitoring (rollup-plugin-visualizer)
32. ASSET STRATEGY
Iconos
Lucide React (via shadcn/ui) para iconos generales. Custom SVG para iconos específicos de CodeGym.
Code highlight
CodeMirror tiene su propio highlighting para el editor. Para CodeBlock (lectura): usar CSS con font-family: var(--font-mono) + highlighting básico o librería ligera.
Fuentes
Inter: UI (Google Fonts, self-hosted)
JetBrains Mono: Código (Google Fonts, self-hosted)
Imágenes
No introducir imágenes decorativas. La identidad visual depende de layout, tipografía, color, spacing, iconografía, code presentation, motion.
33. FUTURE AUTHENTICATION
NO en MVP
Fase 2
// AuthContext
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// ProtectedRoute
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
Rutas Fase 2
PUBLIC:   /, /login, /register, /forgot-password
PRIVATE:  /dashboard, /tech/*, /practice/*, /review, /results/*, /profile, /settings
Los componentes existentes NO cambian. Solo se añade ProtectedRoute en el router.
34. LOCAL → ACCOUNT MIGRATION
Flujo
1. Usuario anónimo → localStorage con LOCAL_USER_ID
2. Crear cuenta → Supabase Auth → realUserId
3. Migrar:
   a. Leer localStorage
   b. Para cada ConceptProgress:
      - Si existe en Remoto: tomar mayor domain
      - Si no existe: copiar
   c. Subir a PostgreSQL
   d. Confirmar
   e. Limpiar localStorage
MigrationResult
interface MigrationResult {
  migrated: number;
  conflicts: number;
  resolved: number;
  errors: string[];
  success: boolean;
}
Rollback
Si la migración falla:
Datos locales NO se borran
Se muestra error al usuario
Se ofrece reintentar
Datos parcialmente subidos se limpian
Identificador
const LOCAL_USER_ID = 'local-anonymous';
35. PHASE 2
Stack
Supabase (Auth + PostgreSQL + API) + @supabase/supabase-js
Qué se añade
lib/repositories/SupabaseProgressRepository.ts
lib/repositories/SupabaseAttemptRepository.ts
lib/repositories/SupabaseCompletedSessionRepository.ts
lib/repositories/ApiContentRepository.ts
contexts/AuthContext.tsx
hooks/useAuth.ts
features/auth/LoginPage.tsx
features/auth/RegisterPage.tsx
features/auth/ForgotPasswordPage.tsx
components/auth/ProtectedRoute.tsx
lib/progress/migration.ts
Qué NO cambia
lib/engine/*
lib/executor/*
features/session/*
features/dashboard/*
features/results/*
features/review/*
components/codegym/*
components/ui/*
Inyección de dependencias
// providers.tsx — solo cambia la línea de creación de repositorios
const progressRepo = new SupabaseProgressRepository(supabase);  // era Local
const attemptRepo = new SupabaseAttemptRepository(supabase);     // era Local
const contentRepo = new ApiContentRepository(supabase);           // era Static
const executor = new WorkerExecutor();                            // igual
36. PHASE 3
TypeScript, React, Node.js, SQL, HTML/CSS, Git, APIs, Testing, Architecture content
Complete Code, Refactor, Challenge, Explain, Debug, Code Review exercise types
Contenido evolutivo versionado
Dark/Light toggle
Multi-idioma
Social, Leaderboards, Achievements, Streaks
Admin panel completo
PWA / Mobile app
Ejecución multi-lenguaje
Spaced repetition avanzada
Analytics
37. DEPENDENCIES
MVP
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "@codemirror/lang-javascript": "^6.x",
    "@codemirror/view": "^6.x",
    "@codemirror/state": "^6.x",
    "@uiw/react-codemirror": "^4.x",
    "lucide-react": "^0.x",
    "@radix-ui/react-*": "via shadcn/ui",
    "tailwindcss": "^3.x",
    "class-variance-authority": "^0.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x",
    "vitest": "^1.x",
    "@testing-library/react": "^14.x",
    "@testing-library/jest-dom": "^6.x",
    "playwright": "^1.x",
    "@playwright/test": "^1.x"
  }
}
NO en MVP
framer-motion, zustand, redux, jotai, @tanstack/react-query, swr, @supabase/supabase-js, prisma, drizzle, axios
38. DOCUMENTATION
README.md
Descripción, stack, cómo ejecutar, estructura.
ARCHITECTURE.md
Arquitectura de capas, diagrama de dependencias, reglas de dependencia.
CONTENT-GUIDE.md
Cómo crear contenido: estructura de JSON, formato de concepto, tipos de step, test cases.
DECISIONS.md
ADR (Architecture Decision Records) para decisiones importantes:
D001: Web Worker sobre iframe sandbox
D002: Repository pattern sobre localStorage directo
D003: CSS animations sobre Framer Motion
D004: useState+useReducer sobre Zustand
D005: Lazy loading por topic sobre carga completa
D006: sessionStorage para recovery sobre localStorage
D007: Escala de acento accesible
D008: Jerarquía de tokens
D009: Highlighting y estrategia de fuentes
D010: Primitives de shadcn/Radix en components/ui
D011: ESLint 9 con flat config
D012: isCorrect en UserAnswer
D013: Escala del dominio y factores inyectados
El registro canónico vive en docs/DECISIONS.md, con el detalle completo de cada decisión (contexto, alternativas, razón y consecuencias). §46 conserva un resumen.
39. GIT STRATEGY
Branches
main        ← deploy
develop     ← integración
feature/*   ← features individuales
Checkpoints
Después de cada bloque funcional:
Tests pasan
Lint limpio
Typecheck limpio
Build exitoso
Responsive verificado
Commit
Commits
feat: añadir ExerciseEngine con validateSelection
fix: corregir timeout del WorkerExecutor
test: añadir tests para scoring
refactor: extraer domain-calculator
40. IMPLEMENTATION ROADMAP
FASE 1: Foundation (Semanas 1-3)
Semana 1: Setup
T001: Crear proyecto Vite + React + TypeScript
T002: Configurar Tailwind CSS
T003: Configurar shadcn/ui
T004: Configurar React Router
T005: Crear estructura de carpetas
T006: Crear layout base (MobileNav, Sidebar, TopBar)
T007: Configurar paths aliases TypeScript
T008: Configurar Vitest + test setup
Semana 2: Design System + Types
T009: Definir design tokens (globals.css)
T010: Configurar fuentes (Inter, JetBrains Mono)
T011: Crear tipos base (exercise.ts, content.ts, progress.ts, repository.ts)
T012: Crear componentes UI custom (DifficultyBadge, Progress)
T013: Crear CodeBlock component
T014: Crear EmptyState component
T015: Crear ErrorBoundary component
Semana 3: Content + Data
T016: Crear estructura de contenido (data/content/)
T017: Crear contenido: Arrays (concept + 3 sesiones)
T018: Crear contenido: Functions (concept + 3 sesiones)
T019: Crear IContentRepository + StaticContentRepository
T020: Crear ContentContext + useContent
T021: Crear technologies.json + index.json
T022: Test: StaticContentRepository
FASE 2: Exercise Engine (Semanas 4-6)
Semana 4: Engine + Code Reading
T023: Crear ExerciseEngine (loadSession, validateSelection)
T024: Crear scoring.ts
T025: Crear domain-calculator.ts + test
T026: Crear CodeReadingStep component
T027: Crear SessionPage con useReducer
T028: Crear session-reducer.ts + test
T029: Crear StepIndicator component
T030: Crear ResultFeedback component
Semana 5: Predict + Find Error
T031: Crear PredictOutputStep component
T032: Crear FindErrorStep component
T033: Crear HintReveal component
T034: Crear ejercicios: Code Reading (3 sesiones)
T035: Crear ejercicios: Predict Output (3 sesiones)
T036: Crear ejercicios: Find Error (3 sesiones)
Nota (D015): T034, T035 y T036 quedan satisfechas por el contenido de T017 y T018, que entregaron 6 sesiones completas con los cuatro tipos de paso. No generan contenido nuevo.
T037: Test: validateSelection para los 3 tipos
Semana 6: Fix Code + Worker
T038: Crear ICodeExecutor interface + types
T039: Crear WorkerExecutor + worker-script.ts
T040: Crear CodeEditor component (CodeMirror)
T041: Crear FixCodeStep component
T042: Integrar WorkerExecutor en ExerciseEngine
T043: Crear ejercicios: Fix Code (3 sesiones)
Nota (D015): satisfecha por el contenido de T017 y T018, igual que T034, T035 y T036. No genera contenido nuevo.
T044: Test: WorkerExecutor (timeout, error, destroy, queue)
T045: Test: validateFixCode
FASE 3: Progress & UX (Semanas 7-9)
Semana 7: Progress + Repositories
T046: Crear IProgressRepository + LocalProgressRepository + test
T047: Crear IAttemptRepository + LocalAttemptRepository + test
T048: Crear ICompletedSessionRepository + LocalCompletedSessionRepository + test
T049: Crear ProgressContext + useProgress
T050: Integrar progress en session completion
T051: Crear SessionHeader component
T052: Integrar sessionStorage recovery
T053: Test: integración sesión → progress → attempts
Semana 8: Pages
T054: Crear HomePage
T055: Crear DashboardPage + components
T056: Crear TechnologyPage
T057: Crear TopicPage
T058: Crear ResultsPage
T059: Crear ExerciseCard component
T060: Crear ReviewPage
T061: Crear NotFoundPage
T062: Crear onboarding flow
Semana 9: Contenido completo
T063: Crear contenido: Closures (concept + 3 sesiones)
T064: Crear contenido: Promises (concept + 3 sesiones)
T065: Crear contenido: Objects (concept + 3 sesiones)
T066: Crear contenido: ES6+ (concept + 3 sesiones)
T067: Crear contenido: Errors (concept + 3 sesiones)
T068: Crear Reset Progress functionality
T069: Crear migración schema (migration.ts básico)
T070: Test: contenido carga correctamente
FASE 4: Polish & Ship (Semanas 10-12)
Semana 10: Animations + Responsive
T071: Definir animation tokens/transitions CSS
T072: Animaciones entrada (fadeInUp, stagger)
T073: Animaciones feedback (correct/incorrect)
T074: Animaciones progreso (progressFill)
T075: Microinteracciones (hover, focus, pressed)
T076: prefers-reduced-motion
T077: Celebración sesión completada
T078: Responsive audit: Mobile (320px, 390px)
T079: Responsive audit: Tablet (768px)
T080: Responsive audit: Desktop (1024px, 1280px)
Semana 11: Accessibility + Testing
T081: Keyboard navigation completa
T082: ARIA labels
T083: Focus management
T084: Screen reader announcements
T085: Unit tests: engine + scoring + validation
T086: Unit tests: WorkerExecutor
T087: Unit tests: repositories
T088: Component tests: codegym components
T089: Integration tests: sesión completa
T090: E2E tests: flujo principal
Semana 12: Performance + Deploy
T091: Lazy routes (React.lazy)
T092: Lazy CodeMirror
T093: Lazy content loading
T094: Bundle analysis
T095: Performance audit (Lighthouse)
T096: Cross-browser testing
T097: Deploy configuration
T098: Documentación (README, ARCHITECTURE, CONTENT-GUIDE)
T099: Final QA
T100: Git tags + release
41. TASK BREAKDOWN
Cada tarea tiene:
TASK ID:    T0XX
Nombre:     Descriptivo corto
Objetivo:   Qué se logra
Dependencias: Tareas que deben completarse primero
Archivos:   Qué archivos crea o modifica
Tests:      Qué tests necesita
DoD:        Criterios de terminación
Ejemplo: T039
TASK ID:    T039
Nombre:     Crear WorkerExecutor + worker-script
Objetivo:   Ejecución de código en Web Worker con timeout, queue, cleanup
Dependencias: T038 (ICodeExecutor interface)
Archivos:
  - lib/executor/ICodeExecutor.ts (ya existe de T038)
  - lib/executor/WorkerExecutor.ts (nuevo)
  - lib/executor/worker-script.ts (nuevo)
  - lib/executor/types.ts (ya existe de T038)
Tests:
  - WorkerExecutor: código correcto
  - WorkerExecutor: syntax error
  - WorkerExecutor: runtime error
  - WorkerExecutor: timeout
  - WorkerExecutor: queue FIFO
  - WorkerExecutor: destroy durante ejecución
  - WorkerExecutor: recreate tras timeout
  - WorkerExecutor: cleanup completo
DoD:
  - Tests pasan
  - Timeout funciona a 3s
  - Queue procesa FIFO
  - destroy() limpia todo
  - Blob URLs se revocan
  - Sin memory leaks
42. DEPENDENCIES GRAPH
T001-T008 (Setup)
    ↓
T009-T015 (Design System + Types)
    ↓
T016-T022 (Content + Data)
    ↓
T023-T030 (Engine + Code Reading)
    ↓
T031-T037 (Predict + Find Error)
    ↓
T038-T045 (Fix Code + Worker)
    ↓
T046-T053 (Progress + Repositories)
    ↓
T054-T062 (Pages)
    ↓
T063-T070 (Contenido completo)
    ↓
T071-T080 (Animations + Responsive)
    ↓
T081-T090 (Accessibility + Testing)
    ↓
T091-T100 (Performance + Deploy)
43. MILESTONES
Milestone	Semana	Criterio
M1: Foundation	3	Proyecto compila, design system visual, contenido carga
M2: Engine	6	4 tipos de ejercicio funcionales end-to-end
M3: Complete App	9	Todas las pages, progress, historial, recovery
M4: Polish	12	Animations, responsive, accessibility, tests, deploy
44. DEFINITION OF DONE
Una feature está terminada cuando:
Funcionalidad correcta
Cumple arquitectura
Responsive mobile (320px, 390px)
Responsive tablet (768px)
Responsive desktop (1024px, 1280px)
Accesible por teclado
ARIA labels correctos
Focus management correcto
prefers-reduced-motion considerado
CSS animations funcionan
Loading state implementado
Error state implementado
Empty state implementado
Unit tests pasan
Component tests pasan
TypeScript sin errores
Lint limpio
Build exitoso
Sin errores de consola
Sin regresiones
Sin duplicación innecesaria
Sin archivos basura
Sin dependencias innecesarias
45. FINAL QA CHECKLIST
□ Compila sin errores
□ Tests unitarios pasan
□ Tests de componente pasan
□ Tests de integración pasan
□ E2E tests pasan
□ Lint limpio
□ TypeScript types correctos
□ Build de producción exitoso
□ Mobile: 320px — funciona
□ Mobile: 390px — funciona
□ Tablet: 768px — funciona
□ Desktop: 1024px — funciona
□ Desktop: 1280px — funciona
□ Keyboard navigation funciona
□ Focus visible funciona
□ Screen reader: annuncios correctos
□ Animaciones: reduced-motion funciona
□ Loading states: visibles
□ Error states: visibles
□ Empty states: visibles
□ localStorage: se guarda correctamente
□ sessionStorage: recovery funciona
□ Worker: timeout funciona
□ Worker: cleanup funciona
□ Reset progress: funciona
□ Consola: sin errores
□ Sin warnings innecesarios
□ Bundle size: razonable
□ Performance: targets cumplidos
□ Contenido: todos los topics de JS disponibles
□ Sesiones: completan correctamente
□ Progreso: se actualiza correctamente
46. ARCHITECTURAL DECISIONS
Resumen. El registro canónico y detallado de las decisiones está en docs/DECISIONS.md.
D001: Web Worker sobre iframe sandbox
Contexto: Fix Code necesita ejecutar código del usuario.
Opciones: eval() en thread principal | iframe sandbox | Web Worker | Servicio externo
Decisión: Web Worker.
Razón: eval() y new Function() en el thread principal no proporcionan aislamiento real. iframe sandbox añade complejidad de comunicación (doble postMessage) sin beneficio significativo para un contexto educativo local. Servicio externo añade dependencia y latencia. Web Worker proporciona aislamiento del thread principal, timeout fiable via terminate(), y es suficiente para un MVP educativo donde el código es del propio usuario.
Consecuencias: Worker puede hacer fetch externo y consumir CPU durante el periodo previo al timeout. Aceptado para MVP.
D002: Repository pattern sobre localStorage directo
Contexto: MVP usa localStorage, Fase 2 usará Supabase.
Opciones: localStorage directo en hooks | Repository pattern
Decisión: Repository pattern.
Razón: Sin la abstracción, migrar a Fase 2 requeriría modificar cada componente que accede a datos. Con la abstracción, solo se cambia la implementación del repository.
Consecuencias: Un archivo adicional por repository. Coste mínimo, beneficio alto.
D003: CSS animations sobre Framer Motion
Contexto: MVP necesita animaciones.
Opciones: CSS animations | Framer Motion
Decisión: CSS animations.
Razón: Framer Motion añade ~30KB al bundle. Para las animaciones necesarias en MVP (fade, slide, shake, pulse), CSS es suficiente. Si en Fase 3 se necesitan animaciones complejas (layout animations, drag, gestures), se puede añadir Framer Motion entonces.
Consecuencias: Algunas animaciones complejas (como stagger de listas) requieren más CSS que JavaScript. Aceptable para MVP.
D004: useState+useReducer sobre Zustand
Contexto: MVP necesita estado global.
Opciones: useState + useReducer + Context | Zustand | Redux
Decisión: useState + useReducer + Context.
Razón: La complejidad del estado en MVP no justifica un store externo. UI state = useState. Session state = useReducer. Progress/Content = Context. Si en Fase 2 la complejidad crece, se puede migrar a Zustand.
Consecuencias: Posible prop drilling en algunos casos. Se mitiga con Context.
D005: Lazy loading por topic sobre carga completa
Contexto: Contenido estático en JSON.
Opciones: Cargar todo al inicio | Lazy load por topic
Decisión: Lazy load por topic.
Razón: Cargar todo el contenido de JavaScript al inicio (~30-50KB) es innecesario. Cada topic carga solo cuando el usuario lo selecciona (~3-10KB). La experiencia es más rápida.
Consecuencias: Tiny delay al seleccionar un topic nuevo. Se mitiga con cache en memoria.
D006: sessionStorage para recovery sobre localStorage
Contexto: Recuperar sesión tras reload.
Opciones: localStorage | sessionStorage | No recuperar
Decisión: sessionStorage.
Razón: La sesión activa es temporal. Si el usuario cierra la pestaña deliberadamente, no debe recuperarse. sessionStorage se limpia al cerrar la pestaña, que es el comportamiento deseado. localStorage preservaría sesiones abandonadas indefinidamente.
Consecuencias: Si el usuario cierra la pestaña, pierde la sesión activa. Esto es intencional.
D007: Escala de acento accesible
Contexto: §12 fijaba --accent: #6366f1 y §14 exige contraste ≥ 4.5:1 para texto normal. Ambas cosas son incompatibles: sobre --bg-primary el acento da 4.42:1, y como fondo de botón ningún color de texto alcanza AA (blanco 3.93:1, --bg-primary 4.42:1).
Opciones: aclarar el acento | conservarlo restringiendo su uso | doble token | aceptar AA parcial
Decisión: doble token. --accent (#6366f1) queda como color de marca no textual; --accent-text (#818cf8) cubre texto, interacción y superficies de botón primario.
Razón: conserva el acento del plan sin renunciar a WCAG AA, y el sistema de tokens hace cumplir la regla en lugar de confiarla a la disciplina de cada componente. #818cf8 ya estaba en §12 como --accent-hover, así que no introduce un color nuevo.
Consecuencias: el botón primario deja de ser #6366f1 sólido y pasa a #818cf8 con texto oscuro (6.62:1). Los usos no textuales del acento (focus ring, bordes, iconos, glows) siguen siendo #6366f1. Detalle en docs/DECISIONS.md.
D008: Jerarquía de tokens
Contexto: la implementación mantenía dos paletas independientes: los tokens hex de §12 y una capa HSL de shadcn con valores propios. --background (#0e0e10) no coincidía con --bg-primary (#0a0a0f), --accent estaba sobrescrito con un triplete HSL que lo invalidaba como color, y los componentes mezclaban ambos sistemas sin criterio.
Opciones: tomar §12 como canónico | tomar shadcn como canónico | derivar shadcn de §12
Decisión: derivar. §12 es la capa primitiva; los tokens de shadcn se definen con var() sobre ella; Tailwind expone las semánticas; los componentes consumen utilidades.
Razón: un único valor por concepto visual, sin literales duplicados, conservando el contrato de shadcn y los modificadores de opacidad de Tailwind.
Consecuencias: las primitivas se declaran como canales HSL, no como hex. Los componentes no usan var(--primitiva) salvo excepción justificada. Detalle en docs/DECISIONS.md.
D009: Highlighting y estrategia de fuentes
Contexto: §32 pide highlighting ligero para CodeBlock y fuentes self-hosted, pero ni la librería elegida ni la estrategia de carga quedaron registradas.
Decisión: highlight.js importando solo core + el lenguaje JavaScript; Inter y JetBrains Mono vía @fontsource con el subset latin y solo los pesos en uso.
Consecuencias: el build pasa de 60 ficheros de fuente (~950 KB) a 12 (328 KB). El coste real de highlight.js se mide en T094. Detalle en docs/DECISIONS.md.
D010: Primitives de shadcn/Radix en components/ui
Contexto: components/ui contenía una implementación propia de Progress y el CLI de shadcn nunca se había ejecutado con éxito.
Decisión: components/ui solo contiene primitives generados por el CLI de shadcn; los componentes propios viven en components/codegym.
Consecuencias: se añade @radix-ui/react-progress. El proyecto posee el código generado y puede corregirlo. Detalle en docs/DECISIONS.md.
D011: ESLint 9 con flat config
Contexto: §44, §45 y §39 exigen «lint limpio», pero el proyecto no tenía linter.
Decisión: ESLint 9 flat config con los conjuntos oficiales recomendados de JS, typescript-eslint, react-hooks y react-refresh. Sin Prettier.
Consecuencias: todo código futuro debe pasar no-explicit-any, no-unused-vars, rules-of-hooks y exhaustive-deps como errores. Detalle en docs/DECISIONS.md.
D012: isCorrect en UserAnswer
Contexto: §24 calcula la puntuación con answers.filter(a => a.isCorrect) sobre un UserAnswer[], pero el UserAnswer de §17 no tiene ese campo; y §21/§23 construyen los Attempt desde ese mismo estado, de modo que Attempt.isCorrect tampoco tenía origen.
Decisión: añadir isCorrect: boolean a UserAnswer. Lo fija el engine al validar la respuesta.
Consecuencias: SessionState y SUBMIT_ANSWER heredan el campo sin cambios; quien despacha la respuesta debe rellenarlo; la recuperación de sesión conserva la corrección. Detalle en docs/DECISIONS.md.
D013: Escala del dominio y factores inyectados
Contexto: la fórmula de §22 solo podía devolver 0 o 1 porque sus factores son ratios 0..1 y no se escalaban, y tres de los cinco factores no tienen fórmula; dos de ellos ni siquiera tienen datos en ConceptProgress.
Decisión: escalar por 100 tras la suma ponderada, fijar los pesos en 35/25/20/10/10 con los cinco factores orientados a que 1 sea el mejor valor, y recibirlos ya calculados mediante DomainFactors.
Consecuencias: T025 implementa solo la ponderación, el redondeo y el recorte; la derivación de los factores queda para la tarea que especifique el modelo de progreso. Detalle en docs/DECISIONS.md.
47. RISKS AND MITIGATIONS
#	Riesgo	Prob.	Impacto	Mitigación
1	Contenido insuficiente para MVP	Alta	Alto	Empezar con 2-3 topics bien desarrollados
2	WorkerExecutor más complejo de esperado	Media	Medio	Implementar incrementalmente, testear bien
3	CodeMirror pesado en mobile antiguo	Media	Medio	Lazy load + fallback textarea
4	localStorage pierde datos	Baja	Bajo	Detectar + fallback a memoria
5	Alcance creep	Alta	Alto	Seguir plan estrictamente
6	Session recovery no funciona correctamente	Media	Medio	Testear reload exhaustivamente
7	CSS animations insuficientes	Media	Bajo	Evaluar Framer Motion solo si es necesario
8	Contenido JSON difícil de mantener a escala	Media	Medio	Motivación para admin panel en Fase 2
9	Responsive en todos los breakpoints consume mucho tiempo	Media	Medio	Cada componente se diseña responsive desde su primera implementación
10	Accessibility más compleja de esperado	Media	Medio	Usar shadcn/ui (ya accesible) + checklist
48. FUTURE EXPANSION
Posible evolución del proyecto
TypeScript, React, Node.js, SQL, HTML/CSS, Git, APIs, Testing, Architecture content
Nuevos tipos de ejercicio
Contenido evolutivo versionado
Dark/Light toggle
Multi-idioma
Social, Leaderboards, Achievements, Streaks
Admin panel completo
PWA / Mobile app
Ejecución multi-lenguaje
Spaced repetition avanzada (SM-2 + ML)
AI-powered hints
Analytics
Notificaciones
Certificaciones
Comunidad
FIN DEL MASTER PLAN v1.0

Este documento contiene todas las decisiones arquitectónicas necesarias para implementar CodeGym con Claude Code sin improvisación.

Estado: READY FOR IMPLEMENTATION
