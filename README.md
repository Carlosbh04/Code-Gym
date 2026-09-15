# CodeGym

Plataforma interactiva de entrenamiento técnico para practicar programación mediante sesiones guiadas, ejercicios progresivos, seguimiento de progreso y validación autoritativa desde backend.

CodeGym está diseñada como una aplicación de práctica real, no como un catálogo estático de ejercicios. El frontend se encarga de la experiencia de usuario y el backend actúa como fuente de verdad para autenticación, validación de respuestas, progreso, sesiones, historial y ejecución segura de ejercicios de código.

---

## Índice

- [Descripción](#descripción)
- [Objetivos](#objetivos)
- [Arquitectura](#arquitectura)
- [Flujo de entrenamiento](#flujo-de-entrenamiento)
- [Stack tecnológico](#stack-tecnológico)
- [Funcionalidades](#funcionalidades)
- [Tipos de ejercicios](#tipos-de-ejercicios)
- [Rutas principales](#rutas-principales)
- [Seguridad](#seguridad)
- [Estructura](#estructura)
- [Instalación](#instalación)
- [Variables de entorno](#variables-de-entorno)
- [Testing](#testing)
- [Estado actual](#estado-actual)
- [Roadmap](#roadmap)
- [Principios de diseño](#principios-de-diseño)
- [Autor](#autor)

---

## Descripción

**CodeGym** es una aplicación web orientada al entrenamiento práctico de programación.

Permite trabajar con tecnologías como:

- JavaScript
- HTML
- CSS
- React
- Node.js
- SQL

Cada tecnología se organiza en conceptos, sesiones y ejercicios. El usuario puede entrenar, continuar sesiones, revisar intentos, consultar su progreso y retomar contenido pendiente.

La arquitectura sigue una regla principal:

> El navegador puede mostrar el juego, pero no debe ser la autoridad del juego.

---

## Objetivos

CodeGym busca:

- convertir el aprendizaje en práctica real;
- evitar ejercicios puramente estáticos;
- mantener progreso persistido en backend;
- permitir sesiones reanudables;
- impedir que el cliente autodeclare respuestas correctas;
- separar contenido público de soluciones privadas;
- soportar distintos formatos de ejercicio;
- escalar a más tecnologías y contenidos;
- mantener una experiencia responsive y profesional.

---

## Arquitectura

El proyecto está dividido en dos aplicaciones.

### Frontend

Repositorio:

```text
codeGYM
```

Responsabilidades:

- interfaz;
- navegación;
- estado visual temporal;
- formularios;
- selección de respuestas;
- animaciones;
- feedback visual;
- recuperación local de sesión;
- consumo de APIs.

El frontend **no debe decidir de forma autoritativa**:

- si una respuesta es correcta;
- si una sesión se completa;
- el progreso persistido;
- los badges;
- los tests canónicos;
- la solución de un ejercicio.

### Backend

Repositorio:

```text
codeGYM-Back
```

Responsabilidades:

- autenticación;
- JWT;
- Google Auth;
- TrainingRun;
- validación de respuestas;
- ejecución de ejercicios;
- Attempts;
- progreso;
- historial;
- ConceptProgress;
- CompletedSession;
- contenido público;
- contenido privado de verificación;
- persistencia con Prisma y MySQL.

---

## Flujo de entrenamiento

```text
Usuario abre una sesión
        ↓
Frontend solicita contenido público
        ↓
Backend devuelve solo información visible
        ↓
Frontend crea o recupera TrainingRun
        ↓
Usuario responde
        ↓
Frontend envía intención / respuesta
        ↓
Backend
  ├─ valida usuario
  ├─ valida ownership
  ├─ valida TrainingRun
  ├─ valida ejercicio
  ├─ verifica respuesta
  ├─ registra Attempt
  ├─ actualiza progreso
  └─ decide finalización
        ↓
MySQL
        ↓
Backend devuelve resultado autorizado
        ↓
Frontend representa el resultado
```

Para ejercicios de código:

```text
Código del usuario
     ↓
Backend
     ↓
CodeExecutionService
     ↓
tests privados
     ↓
passed / failed
     ↓
Frontend
```

---

## Stack tecnológico

### Frontend

- React
- TypeScript
- Vite
- React Router
- Context API
- Custom Hooks
- Tailwind CSS
- Lucide React
- Vitest
- Testing Library
- Playwright

### Backend

- Node.js
- TypeScript
- Express
- Prisma
- MySQL
- JWT
- Google Authentication
- QuickJS / servicio de ejecución aislada
- Vitest

---

## Funcionalidades

### Autenticación

CodeGym contempla autenticación mediante:

- email y contraseña;
- Google Auth;
- access token;
- refresh token;
- logout;
- recuperación de contraseña;
- cambio de contraseña.

Google valida identidad, pero la identidad interna sigue siendo la del usuario local de CodeGym.

```text
Google
  ↓
identidad verificada
  ↓
CodeGym User
  ↓
progreso / sesiones / historial
```

### Inicio

Ruta:

```text
/
```

Página principal autenticada.

### Progreso

Ruta:

```text
/dashboard
```

Muestra progreso, actividad y recomendaciones derivadas del backend.

### Entrenar

Ruta:

```text
/tech
```

Permite elegir tecnología, concepto y sesión.

### Repasar

Ruta:

```text
/review
```

Muestra resultados históricos sin exponer soluciones privadas.

### Sesión de práctica

Ruta:

```text
/practice/:sessionId
```

Orquesta TrainingRun, respuesta, feedback y avance.

---

## Tipos de ejercicios

### Code Reading

El usuario interpreta código y selecciona una respuesta.

### Predict Output

El usuario predice la salida de un fragmento de código.

### Find Error

El usuario identifica:

1. la línea;
2. el tipo de error.

Ejemplo:

```json
{
  "line": 3,
  "errorType": "syntax-error"
}
```

El backend conserva de forma privada las líneas válidas y el tipo correcto.

### Fix Code

El usuario modifica código roto y lo envía al backend.

El backend ejecuta tests privados.

Respuesta pública:

```ts
{
  passed: boolean;
  reason:
    | 'passed'
    | 'failed'
    | 'syntax-error'
    | 'runtime-error'
    | 'timeout';
}
```

El navegador no recibe los tests canónicos.

---

## Rutas principales

| Ruta | Sección |
|---|---|
| `/` | Inicio |
| `/dashboard` | Progreso |
| `/tech` | Entrenar |
| `/review` | Repasar |
| `/practice/:sessionId` | Sesión de práctica |

---

## Seguridad

Uno de los objetivos principales del proyecto es minimizar la confianza en el navegador.

### Contenido público permitido

El frontend puede recibir información equivalente a:

```ts
{
  id
  type
  prompt
  code
  language
  options
  requirements
  hints
  stepOrder
}
```

### Contenido que debe permanecer privado

El frontend no debe recibir:

```text
correct
correctOptionIds
errorLines
errorType
testCases
input
expected
call
expectedPatterns
soluciones canónicas
```

La explicación pedagógica tampoco debe exponerse antes de responder si permite deducir la solución.

### Verificación

El backend produce el veredicto:

```ts
result.attempt.isCorrect
```

El frontend solo lo representa.

### Fix-code

Los tests canónicos permanecen en backend.

```text
Frontend
  ↓ userCode
Backend
  ↓
tests privados
  ↓
resultado seguro
Frontend
```

---

## TrainingRun

Cada entrenamiento se representa mediante un `TrainingRun`.

Contiene, entre otros:

- userId;
- sessionId;
- technologyId;
- topicId;
- conceptId;
- estado;
- totalExercises;
- answeredExercises;
- correctExercises;
- durationMs;
- hintsUsed;
- startedAt;
- completedAt.

Estados principales:

```text
ACTIVE
COMPLETED
```

---

## Attempt

Cada respuesta registrada genera un intento.

Datos relevantes:

- userId
- trainingRunId
- sessionId
- exerciseId
- conceptId
- technologyId
- isCorrect
- attemptedAt
- durationMs
- hintsUsed

El usuario **no envía `isCorrect`**.

Ese valor lo determina el backend.

---

## Estructura

### Frontend

```text
src/
├── app/
├── components/
├── contexts/
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── home/
│   ├── review/
│   └── session/
├── hooks/
├── lib/
├── types/
└── test/
```

### Backend

```text
src/
├── auth/
├── content/
├── training/
├── progress/
├── dashboard/
├── database/
└── ...
```

---

## Instalación

### Requisitos

- Node.js 20+
- npm
- MySQL
- Git

### Frontend

```bash
cd /Users/carlos/Desktop/codeGYM
npm install
npm run dev
```

### Backend

```bash
cd /Users/carlos/Desktop/codeGYM-Back
npm install
npm run dev
```

---

## Variables de entorno

Los secretos reales nunca deben subirse al repositorio.

Variables típicas:

```env
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
GOOGLE_CLIENT_ID=
```

Los nombres exactos deben coincidir con el contrato real del proyecto.

Se recomienda mantener:

```text
.env
.env.local
```

fuera de Git y proporcionar un `.env.example` sin credenciales reales.

---

## Testing

El proyecto utiliza:

- Vitest
- Testing Library
- Playwright

### Unit tests

Para componentes, hooks y lógica aislada.

### Integration tests

Para contextos, servicios, repositorios y flujos combinados.

### E2E

Para autenticación, navegación y sesiones completas.

### Seguridad del contenido público

Existe cobertura específica para evitar que el API público filtre:

```text
correct
testCases
input
expected
call
errorLines
errorType
expectedPatterns
```

---

## Estado actual

CodeGym se encuentra en una fase avanzada de desarrollo.

Ya se ha trabajado en:

- autenticación tradicional;
- Google Auth;
- rutas privadas;
- TrainingRun;
- Attempts;
- CompletedSession;
- ConceptProgress;
- progreso persistido;
- recuperación de sesión;
- dashboard;
- review;
- ejecución backend de fix-code;
- contenido servido desde API;
- sanitización del DTO público;
- eliminación de la ejecución local del runtime productivo;
- separación entre estado visual y estado autoritativo.

La arquitectura sigue endureciéndose para reducir al mínimo los datos manipulables desde DevTools.

---

## Roadmap

### Orden autoritativo de ejercicios

El backend debe impedir respuestas fuera de secuencia.

```text
ejercicio 1
↓
intento de responder ejercicio 5
↓
backend rechaza
```

### Tiempo controlado por backend

Objetivo:

- usar timestamps de servidor;
- derivar duración;
- dejar de confiar ciegamente en `durationMs` enviado por el navegador.

### Pistas controladas por backend

Objetivo:

- registrar revelación de pistas desde backend;
- impedir que el cliente modifique `hintsUsed`.

Posible endpoint futuro:

```text
POST /training/runs/:runId/exercises/:exerciseId/hints
```

### Feedback pedagógico post-respuesta

Objetivo:

```text
GET ejercicio
→ sin solución

POST respuesta
→ backend verifica

respuesta:
{
  attempt,
  feedback
}
```

La explicación aparece solo después de responder.

### Fuente canónica del verifier

Objetivo:

```text
Contenido canónico privado
        ↓
        ├── PublicExerciseStep
        │     sin soluciones
        │
        └── VerifierExercise
              con solución
```

Esto evita drift entre contenido público y verifier.

---

## Principios de diseño

La interfaz busca una estética SaaS moderna y profesional:

- dark mode;
- fondos oscuros;
- acentos violeta y azul;
- bordes finos;
- sombras discretas;
- tarjetas limpias;
- responsive real;
- navegación lateral;
- topbar de utilidades;
- sin 3D innecesario;
- sin glassmorphism excesivo;
- sin apariencia genérica de plantilla IA.

---

## Principios técnicos

### El frontend no es la autoridad

Aunque React pueda comprobar una respuesta, no debe hacerlo si esa comprobación afecta al estado persistido.

### La base de datos no se modifica desde el navegador

Todo cambio relevante pasa por backend.

### Recuperación local no equivale a progreso

`sessionStorage` sirve para UX, no para fabricar progreso persistido.

### Una respuesta correcta no se deduce del DOM

No debe existir información pública equivalente a:

```ts
option.correct
```

### Los tests privados permanecen privados

Requisito público:

```text
"La función debe devolver un nuevo array con los valores duplicados."
```

Test privado:

```ts
{
  input: [1, 2],
  expected: [2, 4],
  call: 'dobles(input)'
}
```

---

## Filosofía técnica

> Todo dato que determine progreso, puntuación o validez debe poder reconstruirse desde el backend sin confiar en el navegador.

Esto mejora:

- seguridad;
- consistencia;
- testabilidad;
- mantenimiento;
- escalabilidad.

---

## Autor

Proyecto desarrollado por **Carlos Hernández**.

Tecnologías principales trabajadas:

- JavaScript
- React
- TypeScript
- Node.js
- Express
- Prisma
- MySQL
- Testing
- Arquitectura frontend/backend
- Autenticación
- Seguridad de APIs

---

## Licencia

Define la licencia antes de distribuir el proyecto públicamente.

Ejemplo:

```text
MIT
```

---

## Nota

CodeGym continúa en evolución activa.

La prioridad no es únicamente añadir funcionalidades, sino reforzar contratos internos para que el backend sea la fuente de verdad real del sistema.
