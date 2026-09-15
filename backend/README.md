# CodeGym Backend

Base HTTP endurecida de la Fase 2 de CodeGym, construida con Node.js, TypeScript y Express.

## Requisitos

- Node.js 22.13+ (rama 22), 24.x o 26+
- npm 10 o posterior

## Puesta en marcha

```bash
npm install
cp .env.example .env
npm run dev
```

`npm install` ejecuta `prisma generate` sin conectar a MySQL. El cliente generado no se versiona; `build`, `check` y `test:db` también lo regeneran para mantener esos flujos reproducibles.

El servidor escucha por defecto en `http://localhost:3000`. Los endpoints disponibles son:

```text
GET /health → 200 { "status": "ok" }
GET /health/db → 200 { "status": "ok" } | 503 { "status": "unavailable" }
POST /auth/register → crea un usuario sin iniciar sesión
```

## Configuración

| Variable | Predeterminado | Descripción |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test` o `production`. |
| `HOST` | `127.0.0.1` | Host o IP de escucha. Usar `0.0.0.0` exige configuración explícita. |
| `PORT` | `3000` | Puerto entre 1 y 65535. |
| `LOG_LEVEL` | según entorno | `debug` en development, `silent` en test e `info` en production; admite niveles Pino válidos. |
| `FRONTEND_ORIGINS` | vacío | Lista de orígenes HTTP(S) exactos, separada por comas. Obligatoria en producción. |
| `DB_HOST` | requerido | Host o IP de MySQL. |
| `DB_PORT` | `3306` | Puerto MySQL entre 1 y 65535. |
| `DB_NAME` | requerido | Base de datos de la aplicación. |
| `DB_USER` | requerido | Usuario runtime de mínimo privilegio. |
| `DB_PASSWORD` | requerido | Secreto de conexión; nunca se registra. |
| `DB_SSL` | según entorno | `false` por defecto fuera de producción; en producción usa TLS verificado y no puede desactivarse. |
| `ACCESS_TOKEN_SECRET` | requerido | 32 bytes aleatorios codificados como base64url sin padding. Nunca se registra. |
| `ACCESS_TOKEN_TTL_SECONDS` | `600` | Duración del JWT de acceso; entero entre 60 y 900 segundos. |
| `REFRESH_TOKEN_TTL_SECONDS` | `2592000` | Vida absoluta de la sesión refresh; entre 1 y 90 días. |
| `RESEND_API_KEY` | requerido fuera de test | API key privada de Resend; solo se utiliza en el backend y nunca se registra. |
| `MAIL_FROM` | requerido fuera de test | Remitente transaccional, por ejemplo `CodeGym <security@dominio-verificado.com>`. |

Genera `ACCESS_TOKEN_SECRET` localmente con Node.js y copia únicamente el resultado a tu `.env`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Las solicitudes sin cabecera `Origin` se aceptan para clientes no navegador. CORS no usa comodines ni credenciales; limita el acceso del navegador a `GET`, `POST` y la cabecera `Content-Type`.

La configuración se carga una sola vez durante el arranque, se valida antes de abrir el puerto y se expone como un objeto tipado e inmutable. Los orígenes se normalizan y deduplican; no se admiten credenciales, query, fragmentos ni paths. Los valores inválidos provocan un fallo de arranque sin imprimir su contenido.

### Email transaccional con Resend

El correo de recuperación utiliza Resend en `development` y `production`. Crea una API key en Resend, verifica el dominio o remitente autorizado y configura `RESEND_API_KEY` y `MAIL_FROM` únicamente en el entorno privado del backend. `NODE_ENV=test` deshabilita el proveedor real, por lo que la suite automatizada no necesita credenciales ni envía correos.

La conexión inicial a MySQL tiene un deadline de 10 segundos independiente del driver; si no queda verificada con `SELECT 1`, no se crea el listener. El runtime atiende `SIGINT` y `SIGTERM` con un cierre idempotente. Si HTTP o Prisma no cierran en 10 segundos, fuerza las conexiones HTTP y termina con código 1 para evitar procesos huérfanos. `uncaughtException`, `unhandledRejection` y errores del servidor siguen la misma ruta de cierre sin registrar el error crudo.

## Comandos

```bash
npm run dev        # desarrollo con recarga
npm run lint       # análisis estático
npm run typecheck  # validación TypeScript
npm test           # pruebas Vitest + Supertest
npm run build      # salida ESM en dist/
npm run start      # ejecuta el build
npm run check      # ejecuta todas las validaciones
npm run db:validate
npm run db:generate
npm run db:migrate:dev
npm run db:migrate:deploy
npm run db:status
npm run test:db
```

MySQL 8.4 LTS se ejecuta como servicio externo. El cliente Prisma se genera en `src/generated/prisma/`. T204 incorpora la primera migración real con `User`, `Attempt`, `CompletedSession` y `ConceptProgress`; no crea catálogo, datos seed ni recuperación de sesión activa. No usar `prisma db push` ni comandos de reset como sustituto de migraciones.

Las conexiones de producción exigen TLS con validación estricta del certificado y hostname (`DB_SSL` queda habilitado por defecto y `false` se rechaza). Para certificados privados, suministrar la CA mediante el trust store del runtime antes del despliegue; nunca desactivar la validación. El usuario MySQL de producción debe configurarse además con `REQUIRE SSL`.

Los tests unitarios no conectan a MySQL. La integración es opt-in mediante `npm run test:db`, exige `NODE_ENV=test` y un `DB_NAME` terminado en `_test`, aplica primero las migraciones pendientes con `migrate deploy` y falla si MySQL no está disponible. La limpieza elimina solo los usuarios ficticios creados por esa ejecución. Para SQL raw se permiten solo tagged templates parametrizados; quedan prohibidas las variantes `$queryRawUnsafe` y `$executeRawUnsafe`.

`db:migrate:dev` es exclusivamente manual, valida primero la configuración y rechaza `NODE_ENV=production`. Para una migración con características no representables en Prisma Schema Language, generar con `--create-only`, revisar el SQL y aplicarlo después. `db:migrate:deploy` pertenece al pipeline controlado y usa una identidad migradora separada; el backend nunca migra al arrancar.

### Overrides transitivos de seguridad

Prisma 7.10 fija versiones transitivas que el feed de `npm audit` considera vulnerables. Temporalmente se fuerzan `deepmerge-ts@8.0.2`, `mariadb@3.5.4` y `mysql2@3.24.4`. El responsable es backend/security; deben retirarse en cuanto una versión de Prisma incorpore versiones corregidas. La compatibilidad exigida en cada actualización es `npm ls`, `prisma validate`, `prisma generate`, `npm run check`, integración MySQL y `npm audit`. `deepmerge-ts` mitiga GHSA-ggr8-5vv4-36mx; los drivers se mantienen en releases corregidas indicadas por el feed de auditoría del 9 de septiembre de 2026.

## Persistencia T204

Los IDs internos son CUID2. Las referencias de contenido (`technologyId`, `topicId`, `conceptId`, `sessionId`, `exerciseId`) son strings canónicos y globalmente identificables; no tienen FK porque el catálogo continúa siendo propiedad del frontend. `accuracy` se deriva de numerador/denominador, y los contadores usan enteros unsigned con constraints cruzados en MySQL. El borrado de un usuario elimina en cascade sus tres colecciones dependientes.

T204 no contiene autenticación, hashing real, endpoints de negocio ni copias del catálogo frontend. Las decisiones y límites se detallan en [docs/architecture.md](docs/architecture.md).

## Seguridad base T205

`validateRequest({ body, params, query })` ofrece validación Zod reutilizable para las futuras rutas. Solo sustituye los bloques de request después de que todos los schemas configurados sean válidos y responde los fallos con un contrato `400 VALIDATION_ERROR` constante, sin publicar detalles internos de Zod.

Los errores de parsing JSON continúan separados como `INVALID_JSON`; un error genérico con estado 400 no se clasifica automáticamente como JSON inválido. La redacción recursiva del logger reconoce también nombres sensibles snake_case como `refresh_token`, `refresh_token_digest`, `client_secret`, `api_key`, `db_password`, `database_url` y `connection_string`.

CORS permanece limitado a `GET`, `POST`, `Content-Type` y sin credenciales. Rate limiting específico para registro sigue diferido a T222 y debe incorporarse antes de exponer el endpoint públicamente en producción.

## Authentication foundation T206

T206 prepara una arquitectura híbrida para la SPA: JWT de acceso HS256 de 10 minutos, conservado únicamente en memoria por el cliente, y refresh token opaco de 256 bits en cookie HttpOnly. El refresh se persiste exclusivamente como digest SHA-256 binario dentro de una `AuthSession` revocable; nunca se guarda el token plaintext ni se usa localStorage para credenciales.

Las contraseñas nuevas aceptan passphrases y Unicode, se normalizan a NFC y deben tener entre 15 y 128 code points, sin reglas de composición ni truncado. El servicio usa Argon2id v19 con 64 MiB, tres iteraciones, paralelismo 1 y hash de 32 bytes. Cada hash recibe salt aleatorio automático y puede evaluarse posteriormente con `needsRehash`.

La cookie futura `codegym_refresh` será host-only, `HttpOnly`, `SameSite=Strict`, path `/auth`, `Secure` en producción y tendrá un `Max-Age` coherente con la sesión. Esta política presupone SPA/API same-site. T209 deberá validar `Origin` en refresh/logout; un despliegue cross-site requerirá `SameSite=None; Secure` y protección CSRF explícita antes de habilitarse.

### Registro T207

`POST /auth/register` acepta exclusivamente `email`, `password` y `displayName` opcional. Email se recorta, pasa a minúsculas, valida formato y queda limitado a 254 caracteres; `displayName` se recorta y, si se proporciona, debe tener entre 1 y 100 caracteres. Password reutiliza sin duplicar la política Unicode/NFC de T206.

```json
{
  "email": "person@example.com",
  "password": "correct horse battery staple",
  "displayName": "Ada"
}
```

El endpoint responde `201` con `{ "user": <PublicUser> }`. Un body inválido devuelve `400 VALIDATION_ERROR`, un email existente devuelve `409 EMAIL_ALREADY_EXISTS` y cualquier fallo inesperado usa el fallback `500 INTERNAL_SERVER_ERROR`; ninguno publica detalles de Zod, Prisma o MySQL. La capa de servicio genera Argon2id antes de persistir, el repositorio recibe solo `passwordHash`, y una única operación Prisma selecciona explícitamente los campos públicos. No crea `AuthSession`, tokens ni cookies.

Todavía no existen login, refresh, logout, `/me` ni middleware Bearer. T207 está COMPLETE y T208 es NEXT — LOGIN.
