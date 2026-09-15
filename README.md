# CodeGym

CodeGym es una plataforma web de práctica para aprender y reforzar programación mediante ejercicios interactivos, sesiones guiadas y seguimiento del progreso.

Actualmente incluye contenido para:

- JavaScript
- HTML
- CSS
- React
- Node.js
- SQL

El proyecto está dividido en un frontend desarrollado con React y un backend con Node.js, Express, Prisma y MySQL.

---

## Características

- Registro e inicio de sesión
- Inicio de sesión con Google
- Recuperación de contraseña
- Sesiones de práctica
- Ejercicios interactivos
- Seguimiento del progreso
- Historial de intentos
- Continuar donde lo dejaste
- Dashboard de progreso
- Sección de repaso
- Diseño responsive para móvil, tablet y escritorio
- Modo oscuro
- Validación de ejercicios desde backend
- Ejecución de ejercicios de código
- Tests unitarios, de integración y E2E

---

## Tipos de ejercicios

CodeGym incluye varios formatos de práctica:

### Lectura de código

El usuario analiza un fragmento de código y selecciona la respuesta correcta.

### Predecir resultado

El usuario debe indicar cuál será la salida de un fragmento de código.

### Encontrar el error

El usuario identifica la línea donde existe un problema y selecciona el tipo de error.

### Corregir código

El usuario modifica código incorrecto y envía su solución para ser comprobada.

---

## Tecnologías utilizadas

### Frontend

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Lucide React

### Backend

- Node.js
- Express
- TypeScript
- Prisma
- MySQL
- JWT
- Google Authentication

### Testing

- Vitest
- Testing Library
- Playwright

---

## Estructura general

El proyecto utiliza dos aplicaciones independientes:

```text
CodeGym
├── frontend
└── backend
```

Frontend:

```text
src/
├── app/
├── components/
├── contexts/
├── features/
├── hooks/
├── lib/
└── types/
```

Backend:

```text
src/
├── auth/
├── content/
├── training/
├── progress/
└── ...
```

---

## Instalación

### Requisitos

Antes de comenzar necesitas:

- Node.js 20 o superior
- npm
- MySQL
- Git

---

## Frontend

Clona el repositorio e instala las dependencias:

```bash
git clone <URL_DEL_REPOSITORIO>
cd codeGYM
npm install
```

Inicia el entorno de desarrollo:

```bash
npm run dev
```

Vite mostrará la dirección local donde se está ejecutando la aplicación.

---

## Backend

Clona el repositorio del backend:

```bash
git clone <URL_DEL_REPOSITORIO_BACKEND>
cd codeGYM-Back
npm install
```

Configura las variables de entorno necesarias.

Ejemplo:

```env
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
GOOGLE_CLIENT_ID=
```

Después ejecuta las migraciones necesarias de Prisma:

```bash
npx prisma migrate dev
```

Inicia el servidor:

```bash
npm run dev
```

---

## Base de datos

CodeGym utiliza MySQL junto con Prisma ORM.

Para actualizar el cliente de Prisma:

```bash
npx prisma generate
```

Para ejecutar migraciones:

```bash
npx prisma migrate dev
```

Para abrir Prisma Studio:

```bash
npx prisma studio
```

---

## Scripts principales

Frontend:

```bash
npm run dev
npm run build
npm run test
```

Backend:

```bash
npm run dev
npm run test
```

Comprobar TypeScript:

```bash
npx tsc --noEmit
```

---

## Testing

El proyecto utiliza diferentes niveles de pruebas.

### Unitarias

Prueban componentes, hooks y funciones de forma aislada.

### Integración

Comprueban la interacción entre distintas partes de la aplicación.

### End-to-End

Playwright se utiliza para validar flujos completos desde el navegador.

Ejemplo:

```bash
npx playwright test
```

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

## Diseño

CodeGym utiliza una interfaz moderna orientada a aplicaciones SaaS:

- Dark mode
- Sidebar de navegación
- Tarjetas limpias
- Bordes sutiles
- Acentos violetas y azules
- Diseño responsive
- Interfaz optimizada para escritorio, tablet y móvil

---

## Estado del proyecto

CodeGym está actualmente en desarrollo activo.

Las principales áreas ya implementadas incluyen:

- autenticación;
- progreso;
- sesiones de entrenamiento;
- historial;
- recuperación de sesión;
- dashboard;
- repaso;
- ejercicios interactivos;
- backend conectado a base de datos;
- sistema de tests.

---

## Próximas mejoras

Entre las mejoras previstas:

- más tecnologías;
- más sesiones y ejercicios;
- sistema de badges;
- estadísticas más avanzadas;
- mejoras en recomendaciones;
- mayor cobertura de tests;
- mejoras de rendimiento;
- ampliación del sistema de repaso.

---

## Autor

Desarrollado por **Carlos Hernández**.

Proyecto creado como plataforma de práctica de desarrollo web y programación.

---

## Licencia

Este proyecto está actualmente en desarrollo.

La licencia se definirá antes de su distribución pública.
