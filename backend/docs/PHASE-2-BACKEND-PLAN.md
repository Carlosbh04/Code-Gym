# Plan backend — Fase 2

## T203 — MySQL + Prisma foundation

MySQL 8.4 LTS se instala como servicio externo; no se añadió Compose porque Docker no está disponible. Configurar `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`, ejecutar `npm run db:validate` y `npm run db:generate`, y comprobar `GET /health/db`.

Producción añade `DB_SSL=true` de manera obligatoria y exige certificado/hostname válidos; el usuario del servidor debe usar `REQUIRE SSL`. Development/test local puede usar `DB_SSL=false`. La integración con una CA privada debe incorporar esa CA al trust store, nunca relajar `rejectUnauthorized`.

T203 dejó el schema vacío para que T204 definiera el dominio con revisión explícita. Desarrollo usa `db:migrate:dev`; despliegues usan `db:migrate:deploy` con credenciales migradoras separadas. No usar `db push`, reset ni raw unsafe.

La suite `npm run test:db` es explícita y solo acepta `NODE_ENV=test` con una base terminada en `_test`. La indisponibilidad de MySQL es un fallo real, nunca un skip verde.

## T204 — Initial database schema

T204 crea `User`, `Attempt`, `CompletedSession` y `ConceptProgress`, relacionados por ownership de usuario y borrado cascade. Los IDs internos son CUID2; las referencias al contenido son strings canónicos sin FK y el catálogo frontend no se duplica. `accuracy` se calcula a partir de valores enteros, y la migración impone los invariantes de contadores con `UNSIGNED` y `CHECK` de MySQL.

La primera migración, `init_core_schema`, se genera con `--create-only`, se revisa y luego se despliega. No contiene seed. `test:db` aplica las migraciones sobre una base protegida y verifica tablas, uniques, relaciones, constraints, timestamps y cascadas.

T205/T206 deberán seguir sus futuras especificaciones inline. Cualquier capa de escritura tendrá que actualizar eventos y agregados mediante transacciones e incrementos atómicos. Auth, endpoints de negocio y recuperación activa siguen diferidos.

## T205 — Security baseline expansion — COMPLETE

T205 añade middleware Zod reutilizable para `body`, `params` y `query`, con sustitución atómica de valores parseados y contrato público constante. El error handler diferencia parsing JSON, payload excesivo y errores desconocidos sin confiar únicamente en un status duck-typed. El logger amplía la redacción recursiva a variantes sensibles snake_case.

CORS continúa limitado a `GET` y sin credenciales. No se incorporan endpoints, auth, rate limiting ni CSRF, y no cambia Prisma/MySQL.

## T206 — Authentication foundation — COMPLETE

T206 establece access JWT HS256 corto y refresh opaco en cookie HttpOnly respaldado por `AuthSession`. Incorpora Argon2id, política de password Unicode/NFC, configuración fail-fast, helpers de token/cookie y mapper User público. La sesión almacena solo digest SHA-256, admite revocación y múltiples dispositivos; la rotación transaccional se implementará en T209.

CORS permanece sin credenciales y limitado a GET hasta que una ruta emita cookies. CSRF se reevalúa en T209 junto a refresh/logout. Rate limiting específico sigue reservado para T222.

## T207 — Register — COMPLETE

T207 implementa `POST /auth/register` con schema Zod estricto, normalización conservadora de email, política de password y Argon2id de T206, servicio y repositorio separados, insert único con select público explícito y traducción segura de la unique constraint a `409 EMAIL_ALREADY_EXISTS`. No crea sesiones, tokens ni cookies. CORS admite ahora solo `GET`/`POST`, `Content-Type` y continúa sin credenciales. El rate limit de registro permanece reservado para T222 y será necesario antes de exposición pública.

## T208 — Login — NEXT

T208 implementará login con política anti-enumeración y T209 añadirá refresh/logout, rotación atómica, comprobación de Origin y la ampliación CORS mínima necesaria.
