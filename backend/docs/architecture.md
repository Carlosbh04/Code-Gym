Arquitectura backend — T221

Estado

Configuración, persistencia, autenticación, autorización por rol, gestión de sesiones, ownership/IDOR, endurecimiento antiabuso y pruebas adversariales de seguridad implementados sobre el bootstrap T201. Este documento registra decisiones arquitectónicas implementadas hasta T221 y no crea por sí solo endpoints todavía inexistentes.

Decisiones de la Fase 2

Área

Decisión

Runtime

Node.js 22.13+ (rama 22), 24.x o 26+

Lenguaje

TypeScript estricto, módulos ESM/NodeNext

API

REST sobre Express

Validación

Zod

Logging

Pino

Pruebas

Vitest + Supertest

Base de datos

MySQL 8.4 LTS, no PostgreSQL

ORM

Prisma 7.10

Hash de contraseñas

Argon2id v19

T203 incorporó MySQL mediante Prisma 7.10 y el adaptador MariaDB oficial. T204 añadió el primer schema persistente y su migración versionada. T206 incorporó Argon2id y la entidad persistente de sesiones. T207–T217 construyeron el flujo completo de autenticación, autorización y gestión de sesiones. T218 fijó la política transversal de ownership/IDOR. T219 incorporó rate limiting específico por endpoint y validación explícita de Origin en operaciones autenticadas mediante refresh cookie. T220 sometió esas fronteras a pruebas adversariales y endureció el parsing de la refresh cookie frente a cookies duplicadas o ambiguas.

Modelo de datos inicial

User
├─ Attempt[]
├─ CompletedSession[]
├─ ConceptProgress[]
└─ AuthSession[]

User reserva ownership, email unique y exclusivamente passwordHash; no existe contraseña plaintext, login ni creación automática de sesión.

Attempt conserva metadatos mínimos del intento, sin respuestas ni código.

CompletedSession conserva un snapshot histórico con correctExercises y totalExercises; accuracy se deriva y no se almacena.

ConceptProgress es un agregado por concepto con unique (userId, conceptId). Las escrituras futuras deberán mantenerlo con increments atómicos dentro de una transacción junto a los eventos relacionados.

ActiveSessionRecovery queda fuera: antes de persistirla necesita contrato tipado, límites, versionado y política de retención. La recuperación continúa local hasta una tarea posterior.

Los IDs internos son CUID2 almacenados en VARCHAR(30). Los IDs de contenido son referencias canónicas ASCII/minúsculas con formato slug, por ejemplo javascript, js-arrays, js-array-iteration y js-arrays-map-vs-foreach-01. T221 formaliza este contrato con schemas Zod reutilizables y un límite máximo de 191 caracteres, alineado con las columnas VARCHAR(191) existentes. No se inventan IDs numéricos ni FK hacia un catálogo inexistente: el contenido sigue siendo propiedad del frontend y no se duplica en MySQL.

Las tablas y columnas usan snake_case mediante @@map/@map, mientras el cliente conserva modelos PascalCase y propiedades camelCase. Todas las tablas son InnoDB con utf8mb4_0900_ai_ci. Los timestamps usan DATETIME(3) y la conexión Prisma opera en UTC.

Todas las relaciones dependientes declaran onDelete: Cascade y onUpdate: Cascade. Los contadores y duraciones usan INT UNSIGNED; la migración añade además constraints nombrados para exigir sesiones con ejercicios y evitar valores correctos superiores al total. No hay unique de sesión completada porque una sesión puede repetirse.

Persistencia

MySQL 8.4 LTS, utf8mb4_0900_ai_ci y UTC son requisitos efectivos del schema T204.

Prisma administra su pool con defaults; solo se fija un timeout de conexión de 5 segundos.

El runtime conecta y verifica SELECT 1 antes de crear el listener. Un deadline explícito de 10 segundos limita incluso drivers que no resuelvan su propia promesa; después desconecta tras cerrar HTTP usando el deadline global de lifecycle.

/health continúa siendo liveness; /health/db ejecuta el tagged template estático SELECT 1 y responde 503 constante ante fallo.

La URL CLI se construye temporalmente desde DB_* validadas y nunca se almacena ni registra.

Producción obliga a TLS con validación estricta del certificado y hostname; DB_SSL=false solo se admite en development/test local.

El driver tiene desactivados debug, query/parameter logs y sus salidas directas; Prisma también usa log: [].

Producción debe separar el usuario runtime de mínimo privilegio del usuario migrador.

Se prohíben $queryRawUnsafe y $executeRawUnsafe; cualquier raw futuro debe ser un tagged template parametrizado.

La integración DB es opt-in, exige NODE_ENV=test y nombre terminado en _test, y nunca se ejecuta dentro de npm test.

test:db aplica primero migrate deploy tras validar esas dos guardas. Sus fixtures son identificables por ejecución y solo elimina los usuarios que creó; los hijos se limpian mediante las cascadas verificadas.

Migraciones

La migración init_core_schema fue generada con migrate dev --create-only, revisada y personalizada antes de aplicarse porque Prisma Schema Language no representa los CHECK de MySQL. Producción y CI aplican migraciones ya versionadas con migrate deploy y una identidad migradora separada. db:migrate:dev rechaza producción; no se usa db push, migrate reset, seed automático ni DDL durante el startup.

Configuración runtime

src/config/env.ts contiene el modelo AppConfig readonly y la función pura parseEnv(rawEnv). src/config/load-config.ts carga .env y constituye la única frontera que lee el entorno del proceso. El resultado y su array frontendOrigins quedan congelados.

Campo

Política

NODE_ENV

development, test o production; deriva los flags booleanos del entorno.

HOST

Hostname o IP válida; por defecto 127.0.0.1. La exposición mediante 0.0.0.0 debe ser explícita.

PORT

Entero de 1 a 65535; por defecto 3000.

FRONTEND_ORIGINS

Orígenes HTTP(S) exactos normalizados y deduplicados; obligatorio en producción.

LOG_LEVEL

Nivel Pino válido; defaults debug, silent e info para development, test y production.

Los errores ambientales solo identifican campos inválidos: nunca reproducen los valores recibidos.

Flujo HTTP

Helmet
→ CORS con allowlist exacta
→ parser JSON estricto (100 kb)
→ logging HTTP sin query ni cuerpos
→ rutas (validación → servicio → repositorio)
→ respuesta 404
→ manejador central de errores

createApp recibe configuración y logger sin hacer bind ni registrar handlers de proceso. En las pruebas, Supertest crea un listener local efímero para ejercitar la aplicación. src/runtime.ts crea el servidor, instala listeners de startup antes de listen y controla el lifecycle; src/server.ts es una entrada mínima. La validación ocurre antes de crear la app, el servidor o el listener.

Después del evento listening, el runtime registra una sola vez SIGINT, SIGTERM, uncaughtException y unhandledRejection. Todas las rutas usan una única promesa de shutdown y ejecutan server.close una sola vez. El deadline global de 10 segundos cubre HTTP y Prisma; al vencer marca fallo, llama closeAllConnections y usa terminación forzada para que un pool bloqueado no deje procesos huérfanos. Los handlers se eliminan al comenzar el cierre. No se usa process.exit en el flujo normal, solo al agotar ese deadline anómalo.

Seguridad base

La configuración se valida al arrancar; producción exige FRONTEND_ORIGINS explícito.

Solo se aceptan orígenes HTTP(S) exactos. No se habilitan wildcard ni credenciales CORS.

CORS publica los métodos GET, POST y DELETE, habilita credenciales para la cookie refresh y admite Content-Type y Authorization.

Las peticiones sin Origin permanecen disponibles para clientes no navegador y health checks.

Helmet establece cabeceras defensivas y Express no publica X-Powered-By.

Los errores inesperados se registran, pero la respuesta no revela detalles internos.

Pino produce logs JSON y aplica redacción iterativa, segura ante ciclos y sin límite fijo de profundidad para campos de authorization, cookies, passwords, hashes, tokens, secrets y API keys. El log HTTP excluye body y query string.

La redacción reconoce variantes camelCase y snake_case, incluidas credenciales futuras como refresh_token, refresh_token_digest, access_token, client_secret, jwt_secret, api_key, db_password, database_url y connection_string.

Los fallos fatales y de lifecycle se registran mediante códigos de evento, sin serializar errores o rechazos crudos.

trust proxy está deshabilitado hasta que una topología de despliegue futura lo justifique.

Validación de requests

T205 incorpora validateRequest({ body, params, query }) como middleware route-local reutilizable. Cada bloque configurado usa safeParse; los resultados se aplican de forma atómica únicamente cuando todos validan, por lo que transforms, coercions, defaults y stripping de Zod son los valores que reciben los handlers. Express 5 expone query mediante un getter, así que el middleware instala de forma explícita el resultado validado como propiedad propia.

Un fallo responde exactamente con 400 VALIDATION_ERROR y no expone issues, inputs, paths, stacks ni internals de Zod. La API es síncrona; futuros schemas con refinements asíncronos requerirán un contrato separado.

El error handler identifica JSON malformado solo con el discriminador entity.parse.failed y estado 400, y payload excesivo con entity.too.large y estado 413. Otros errores, aunque declaren status: 400, usan el fallback constante 500 INTERNAL_SERVER_ERROR hasta que exista una taxonomía de errores confiable.

Controles diferidos

CORS mantiene allowlist exacta y mínimo privilegio con methods: ['GET', 'POST', 'DELETE'], credentials: true y cabeceras Content-Type/Authorization. Las credenciales se requieren por refresh/logout con cookie HttpOnly. CORS no sustituye autenticación ni autorización.

T219 implementó rate limiting específico para register, login, refresh y logout, además de validación explícita de Origin en refresh y logout. Email verification no forma parte todavía del alcance. La cookie refresh usa SameSite Strict y el backend mantiene una allowlist CORS exacta; cualquier cambio futuro a una topología cross-site deberá reevaluar CSRF antes de habilitar SameSite=None.

Estado de fase

T205–T221 están COMPLETE. T216 se cerró como N/A porque todavía no existen endpoints administrativos. T218 formalizó la política de ownership/IDOR, T219 añadió controles antiabuso y Origin hardening, T220 verificó adversarialmente las fronteras de autenticación, sesión, autorización, ownership, cookies y proxy/IP y T221 formalizó el contrato backend de referencias al catálogo de contenido. T222 es NEXT — user progress model.

Al consumir los agregados persistentes, las tareas futuras deberán definir fronteras transaccionales para registrar intentos/finalizaciones y actualizar progreso sin read-modify-write concurrente.

Arquitectura de autenticación T206

SPA memory ── Authorization: Bearer <access JWT> ──> API
│
Host-only HttpOnly refresh cookie ──> /auth/* ──> AuthSession
│
└── User

Se adopta access token corto más refresh token opaco persistente, rotatorio y revocable. La SPA nunca debe guardar tokens en localStorage o sessionStorage. Aunque el JWT es criptográficamente stateless, requireAuth valida en cada petición la AuthSession backing mediante sid; por eso revocar la sesión invalida de inmediato el uso posterior de ese access token.

Passwords

Política inicial: 15–128 code points Unicode tras normalización NFC, máximo 512 bytes UTF-8, espacios significativos, sin trim, reglas de composición ni truncado.

Argon2id v19: memoryCost=65536 KiB, timeCost=3, parallelism=1, hashLength=32; el salt CSPRNG lo genera la librería.

verifyPassword solo admite PHC $argon2id$v=19$; no existe fallback débil. needsRehash permite elevar parámetros más adelante.

Una tarea futura deberá definir la dependencia y política de blocklist para contraseñas comunes o comprometidas; T207 no inventa ese contrato.

Access token

El access token usa JOSE/HS256 con clave aleatoria de exactamente 32 bytes, header typ=at+jwt, issuer codegym-backend y audience codegym-api. Sus únicas claims son sub (User ID), sid (AuthSession ID), iat y exp; no contiene email, perfil, roles ni datos sensibles. La verificación fija algoritmo, tipo, issuer, audience, claims y expiración, y devuelve un error genérico ante cualquier token inválido.

Las rutas protegidas usan Authorization: Bearer <access-token>. requireAuth verifica el JWT y la sesión backing activa antes de poblar request.auth con { userId, sessionId }.

Refresh sessions

Cada dispositivo/login tendrá una fila AuthSession relacionada 1 con User. Contiene únicamente un digest SHA-256 BINARY(32), expiración absoluta, timestamps de rotación/revocación y nunca token plaintext, IP o user-agent. El token se genera con 32 bytes CSPRNG y se entrega una sola vez.

T209 implementó la rotación mediante compare-and-swap sobre digest, estado activo y expiración. La rotación sustituye el digest, actualiza rotatedAt y establece una nueva expiración según el TTL configurado. Logout marca revokedAt; borrar un User elimina sus sesiones en cascade. Se permiten múltiples filas por usuario para múltiples dispositivos.

No se conserva historial de digests ni detección familiar de replay. Un refresh token anterior deja de localizar una sesión después de la rotación. Una futura detección de replay familiar requeriría un diseño y migración específicos.

Cookie y CSRF

codegym_refresh es host-only, HttpOnly, SameSite Strict, path /auth, Secure solo en producción y Max-Age igual al TTL refresh. En localhost development/test se omite Secure para permitir HTTP; producción exige HTTPS y una topología SPA/API schemeful same-site.

La cookie refresh es HttpOnly, host-only, SameSite Strict y limitada a /auth. La allowlist CORS es exacta y las operaciones refresh/logout usan POST. Si la topología futura pasa a cross-site, deberá revisarse CSRF antes de usar SameSite=None.

T220 endureció además el parser de Cookie: solo se acepta una única ocurrencia exacta de codegym_refresh. Una cookie duplicada, vacía o ambigua no se interpreta seleccionando arbitrariamente el primer valor. Los nombres parecidos, como codegym_refresh_evil, no coinciden con la cookie de autenticación.

Para refresh, una cookie duplicada, ausente o inválida se trata como sesión refresh inválida y no debe alcanzar la lógica de rotación con un token ambiguo.

Para logout, la ausencia o ambigüedad de cookie conserva el contrato idempotente: la operación continúa siendo segura y devuelve 204 sin asumir una identidad de sesión proporcionada por una cookie ambigua.

Enumeración y DTO público

T208 responde igual para email inexistente y password incorrecto y ejecuta siempre una verificación Argon2id, usando un dummy hash equivalente cuando no existe usuario. No se promete tiempo exactamente constante y nunca se registran passwords, hashes o tokens crudos. El mapper público usa allowlist explícita de id, email, displayName, role, createdAt y updatedAt; passwordHash y sesiones no forman parte del DTO.

T219 implementó rate limiting específico para register/login/refresh/logout. Los endpoints Bearer, cookies refresh y middleware de autenticación permanecen integrados con esos controles.

Registro T207

POST /auth/register
→ schema Zod estricto + normalización
→ UserService + Argon2id
→ UserRepository
→ Prisma User.create (select público explícito)

El schema acepta solo email, password y displayName opcional. Email usa una canonicalización conservadora (trim + minúsculas), valida formato y máximo 254; displayName usa trim y 1–100 caracteres. Password pasa por validatePassword, conservando espacios significativos y la normalización NFC de T206.

El servicio entrega al repositorio únicamente email, passwordHash y displayName; plaintext nunca cruza la frontera de persistencia. El repositorio ejecuta un solo insert, sin prelectura ni transacción, y deja la carrera de duplicados a users_email_key. Un P2002 identificado mediante metadata estructurada de campo/índice se traduce a 409 EMAIL_ALREADY_EXISTS; otros fallos llegan al 500 constante global. La respuesta 201 usa toPublicUser, por lo que nunca incluye hashes ni relaciones. El runtime compone health y registro sobre una sola instancia Prisma.

Autenticación y autorización implementadas T208–T217

Login, refresh y logout

POST /auth/login crea una AuthSession, devuelve el usuario público y un access token, y entrega el refresh token únicamente mediante cookie HttpOnly.

POST /auth/refresh rota el refresh token y devuelve un access token nuevo.

POST /auth/logout limpia la cookie y revoca la sesión asociada de forma idempotente.

Email desconocido y contraseña incorrecta comparten el mismo contrato 401 INVALID_CREDENTIALS.

requireAuth

Toda ruta protegida exige un único header Bearer válido. Después de verificar el JWT, requireAuth carga la sesión indicada por sid y exige:

session existe

session.userId === claims.sub

session.revokedAt === null

session.expiresAt > now

Solo entonces instala:

request.auth = Object.freeze({
userId: claims.sub,
sessionId: claims.sid,
});

Una sesión revocada invalida inmediatamente el uso posterior de su access token.

/auth/me

GET /auth/me usa exclusivamente request.auth.userId para cargar al usuario actual. El frontend nunca decide qué usuario representa el token.

Roles

User.role admite USER y ADMIN.

El rol no se incluye en el JWT. requireRole(...allowedRoles) consulta el rol actual en MySQL en cada petición protegida, de modo que un cambio de privilegios tiene efecto inmediato.

T216 se cerró como N/A porque todavía no existen rutas /admin/*. Toda ruta administrativa futura deberá aplicar:

requireAuth
→ requireRole('ADMIN')
→ handler

Gestión de sesiones T217

Endpoints implementados:

GET    /auth/sessions
DELETE /auth/sessions/others
DELETE /auth/sessions/:sessionId

El listado público contiene únicamente:

{
id,
createdAt,
expiresAt,
rotatedAt,
isCurrent,
}

Nunca expone userId, refreshTokenDigest ni revokedAt.

Revocar una sesión concreta usa ownership atómico:

where: {
id: sessionId,
userId: authenticatedUserId,
revokedAt: null,
}

El endpoint responde siempre 204, aunque el ID no exista, pertenezca a otro usuario o ya esté revocado.

DELETE /auth/sessions/others revoca las demás sesiones del usuario autenticado y conserva la sesión actual.

Ownership e IDOR — T218

Regla central

Ningún ID recibido del cliente establece ownership.

El propietario de un recurso privado se obtiene exclusivamente de:

request.auth.userId

Nunca se acepta un userId procedente de body, params, query o headers personalizados como autoridad de ownership.

Lecturas

Patrón prohibido:

const resource =
await prisma.attempt.findUnique({
where: {
id: attemptId,
},
});

// Comprobar userId después separa acceso y autorización.

Patrón obligatorio:

const resource =
await prisma.attempt.findFirst({
where: {
id: attemptId,
userId: authenticatedUserId,
},
});

Las listas privadas filtran siempre por el usuario autenticado:

await prisma.attempt.findMany({
where: {
userId: authenticatedUserId,
},
});

Updates y deletes

Las mutaciones privadas deben aplicar ownership en la misma operación:

await prisma.attempt.updateMany({
where: {
id: attemptId,
userId: authenticatedUserId,
},
data: {
// cambios permitidos
},
});

o:

await prisma.attempt.deleteMany({
where: {
id: attemptId,
userId: authenticatedUserId,
},
});

Cuando revelar existencia pueda permitir enumeración, count === 0 no debe distinguir entre recurso inexistente y recurso ajeno.

Recursos sujetos a ownership

La política es obligatoria para:

AuthSession

Attempt

CompletedSession

ConceptProgress

y para cualquier modelo futuro relacionado con User.

Attempt

Las operaciones futuras nunca aceptarán userId del frontend como propietario. El servidor asignará:

userId: request.auth.userId

Las lecturas, updates y deletes deberán incluir ese mismo userId.

CompletedSession

La creación y consulta de historial usarán siempre el userId autenticado. Un sessionId de contenido no implica propiedad.

ConceptProgress

La identidad lógica del progreso es:

(userId, conceptId)

El schema ya exige:

@@unique([userId, conceptId])

Los upserts futuros deberán usar la clave compuesta; nunca conceptId de forma aislada.

Respuestas no enumerables

Cuando sea relevante, la API no distinguirá entre:

recurso inexistente;

recurso perteneciente a otro usuario.

Puede utilizarse un 404 genérico o un 204 idempotente según el contrato del endpoint.

Nunca se responderá con mensajes como:

This resource belongs to another user

Pruebas obligatorias

Cada nueva capa que maneje recursos de usuario deberá cubrir:

acceso al recurso propio;

intento de acceso al recurso de otro usuario;

comprobación de que el recurso ajeno permanece intacto;

ausencia de filtración de ownership/existencia;

integración MySQL para las fronteras de seguridad críticas.

T217 ya proporciona la primera prueba IDOR real: un usuario no puede revocar la AuthSession de otro aunque conozca su sessionId.

Alcance de T218

T218 no crea prematuramente endpoints para Attempt, CompletedSession ni ConceptProgress.

La política anterior queda como requisito arquitectónico obligatorio para T221–T225.

Rate limiting y security hardening — T219

Dependencia y alcance

T219 incorpora express-rate-limit como middleware especializado. No se implementa un contador propio para evitar duplicar lógica sensible de ventanas, headers y claves de cliente.

Los limiters se crean una sola vez al construir createAuthRouter() y se aplican únicamente a operaciones de autenticación expuestas a abuso:

POST /auth/register

POST /auth/login

POST /auth/refresh

POST /auth/logout

No se aplica un limiter agresivo global a:

GET    /auth/me

GET    /auth/sessions

DELETE /auth/sessions/others

DELETE /auth/sessions/:sessionId

GET    /health

GET    /health/db

Límites actuales

Ventana común:

15 minutos

Límites:

POST /auth/register   20 solicitudes / 15 min

POST /auth/login      20 solicitudes / 15 min

POST /auth/refresh    60 solicitudes / 15 min

POST /auth/logout     60 solicitudes / 15 min

Los cuatro contadores son independientes. Alcanzar el límite de una ruta no consume ni bloquea el contador de otra.

La respuesta al superar un límite es constante:

{
"error": {
"code": "RATE_LIMITED",
"message": "Too many requests"
}
}

Se usan headers estándar modernos de rate limiting y se deshabilitan los headers legacy X-RateLimit-*.

Identidad IP y proxies

trust proxy continúa explícitamente en false.

El rate limiter no lee ni confía manualmente en X-Forwarded-For. La clave usa request.ip y, como fallback defensivo de tipado/runtime, request.socket.remoteAddress.

Mientras no exista una topología de despliegue con reverse proxy conocida y documentada, no se habilitará trust proxy. Hacerlo sin definir proxies confiables permitiría falsear la identidad IP y degradar el rate limiting.

Cuando producción se despliegue detrás de un proxy real, la configuración de trust proxy deberá revisarse junto con tests específicos de forwarding.

Origin hardening para refresh/logout

POST /auth/refresh y POST /auth/logout actúan sobre la refresh cookie HttpOnly. Además de SameSite=Strict y CORS con allowlist exacta, T219 incorpora createRequireTrustedOrigin().

Política:

Origin ausente                 → permitir

Origin exactamente permitido   → permitir

Origin presente no permitido   → 403

Origin: null                   → 403

Las peticiones sin Origin continúan disponibles para clientes no navegador. Un navegador que sí envía Origin debe coincidir exactamente con config.frontendOrigins.

La respuesta de rechazo es:

{
"error": {
"code": "UNTRUSTED_ORIGIN",
"message": "Request origin is not allowed"
}
}

El middleware se ejecuta antes de refreshService y logoutService, por lo que un Origin no confiable no alcanza la lógica de rotación o revocación de sesión.

CORS por sí solo no se considera control de autorización: una petición cross-origin puede alcanzar el servidor aunque el navegador no exponga su respuesta. Por eso refresh y logout tienen esta comprobación explícita adicional.

Relación con CSRF

La defensa actual combina:

host-only cookie

HttpOnly

SameSite=Strict

Path=/auth

Secure en producción

CORS allowlist exacta

Origin check en refresh/logout

POST para mutaciones de refresh/logout

La topología asumida sigue siendo schemeful same-site entre SPA y API.

Si una arquitectura futura requiere SameSite=None o frontend/API realmente cross-site, esta estrategia deberá revisarse y probablemente incorporar un token CSRF explícito antes del despliegue.

Tests T219

tests/auth-rate-limit.test.ts verifica:

aceptación hasta el límite;

429 RATE_LIMITED al excederlo;

ausencia de headers legacy;

independencia entre register/login;

independencia entre refresh/logout.

tests/refresh-http.test.ts verifica además que un Origin no permitido devuelve 403 UNTRUSTED_ORIGIN, no ejecuta refreshService y no emite una cookie refresh nueva.

tests/logout-http.test.ts verifica que un Origin no permitido devuelve 403 UNTRUSTED_ORIGIN y no ejecuta logoutService.

Validación de cierre de T219:

npm run typecheck
→ 0 errores

ESLint focalizado T219
→ 0 errores

tests T219 focalizados
→ 21/21

npm test
→ 29 archivos
→ 278/278 tests

NODE_ENV=test DB_NAME=codegym_test npm run test:db
→ 8 archivos
→ 38/38 tests
→ 3 migraciones
→ 0 migraciones pendientes

El npm run check global continúa bloqueado por deuda de lint preexistente en archivos ajenos a T219. Los archivos introducidos o modificados por T219 pasan su lint focalizado sin errores. Esa deuda no se oculta ni se atribuye a T219.

Attack/security tests — T220

Objetivo

T220 no añadió nuevas capacidades de producto. Su función fue atacar deliberadamente las fronteras de seguridad implementadas entre T206 y T219 y demostrar que los fallos continúan utilizando contratos seguros.

Cobertura adversarial

tests/access-token-attacks.test.ts cubre:

JWT con issuer incorrecto;

JWT con audience incorrecta;

JWT sin sid;

JWT sin sub;

sid con tipo inválido.

tests/authorization-header-attacks.test.ts cubre:

Authorization duplicado;

varios Bearer dentro de un único header;

credenciales combinadas mediante coma;

control con un único Bearer válido.

tests/trusted-origin-attacks.test.ts cubre:

Origin: null;

subdominio visualmente similar;

prefijo controlado por atacante;

scheme diferente;

puerto diferente;

origin exacto permitido;

cliente no navegador sin Origin.

tests/rate-limit-proxy-attacks.test.ts cubre:

cambiar X-Forwarded-For no permite evadir el rate limiter mientras trust proxy=false;

el harness mantiene trust proxy=false.

tests/session-idor-attacks.test.ts cubre:

userId falso en query al revocar una sesión;

userId falso en body;

identidad falsa mediante headers;

misma respuesta 204 para sessionId desconocido y potencialmente perteneciente a otro usuario;

spoofing de identidad sobre /auth/sessions/others;

spoofing de identidad al listar sesiones;

la ruta literal /auth/sessions/others no cae accidentalmente en /auth/sessions/:sessionId.

Refresh y logout

tests/refresh-http.test.ts y tests/logout-http.test.ts se ampliaron para cubrir cookies refresh hostiles o ambiguas.

El parser de cookies no selecciona silenciosamente la primera coincidencia cuando existen varias cookies codegym_refresh.

Se rechazan como entrada autenticable:

codegym_refresh duplicada;

codegym_refresh vacía;

token refresh malformado;

nombres de cookie similares que no coinciden exactamente.

Ejemplo de nombre que no coincide:

codegym_refresh_evil

En refresh, una cookie duplicada o ausente produce el contrato genérico de sesión refresh inválida antes de invocar refreshService con un valor ambiguo.

En logout, el contrato sigue siendo idempotente: ante ausencia o ambigüedad de cookie se invoca la lógica equivalente a una sesión no identificada y la respuesta permanece en 204.

Refresh replay

Las capas existentes más las pruebas T220 cubren:

refresh token malformado;

token desconocido;

sesión revocada;

sesión expirada;

compare-and-swap que pierde una carrera;

reutilización de un refresh token antiguo;

rotación concurrente donde solo una operación puede ganar.

Authorization

requireAuth exige exactamente un Authorization válido.

No se aceptan:

headers Authorization duplicados;

múltiples credenciales Bearer concatenadas;

credenciales separadas por coma;

claims estructuralmente inválidas.

Después de verificar la firma JWT, siguen siendo obligatorias todas las comprobaciones de la AuthSession backing.

Origin

La comparación de Origin sigue siendo exacta.

No se permiten equivalencias aproximadas basadas en:

subdominios;

prefijos;

puertos;

protocolos;

strings visualmente parecidos.

Origin: null continúa considerándose un origin presente no confiable.

Una petición sin Origin sigue admitiéndose para clientes no navegador.

Proxy spoofing

trust proxy permanece false.

Modificar X-Forwarded-For no cambia la identidad de cliente usada por el rate limiter bajo la topología actual.

No deberá habilitarse trust proxy sin documentar primero la topología real de proxies confiables y añadir pruebas adecuadas.

Secretos y errores

Los contratos de error continúan sin exponer:

passwords;

passwordHash;

refresh tokens;

refreshTokenDigest;

access tokens;

Authorization;

Cookie;

query values sensibles;

stacks o detalles internos inesperados.

El error handler no serializa el objeto Error en respuestas y utiliza el contrato constante:

{
"error": {
"code": "INTERNAL_SERVER_ERROR",
"message": "An unexpected error occurred"
}
}

El logger mantiene redacción recursiva, cycle-safe y sin límite fijo de profundidad para nombres sensibles.

Validación de cierre de T220

ESLint focalizado sobre archivos T220 y afectados:
→ 0 errores

tests adversariales/afectados:
→ 7 archivos
→ 47/47 tests

npm run typecheck
→ 0 errores

npm test
→ 34 archivos
→ 308/308 tests

NODE_ENV=test DB_NAME=codegym_test npm run test:db
→ 8 archivos
→ 38/38 tests
→ 3 migraciones
→ 0 migraciones pendientes

El npm run check global continúa teniendo deuda de lint preexistente en archivos anteriores a T219/T220. Esa deuda no se atribuye a T220. Los archivos propios o modificados como parte de T220 pasan su lint focalizado.

Resultado de T220

T220 queda COMPLETE.

Las pruebas adversariales confirmaron que las fronteras de autenticación, autorización, sesiones, ownership, Origin y rate limiting fallan mediante contratos seguros ante los casos cubiertos.

T220 detectó además una ambigüedad real en el parsing de cookies duplicadas. El comportamiento fue corregido para no elegir arbitrariamente el primer codegym_refresh recibido.

La corrección no añade estado persistente nuevo, no cambia el schema Prisma y no crea nuevas capacidades de producto.

Content model — T221

Objetivo

T221 formaliza la frontera entre el catálogo estático del frontend y las referencias de contenido persistidas por el backend.

Decisión arquitectónica

Se adopta la dirección B:

el frontend continúa siendo propietario del catálogo de contenido;

el backend no duplica Technology, Topic, Concept, ExerciseSession ni Exercise en MySQL;

no se crean FK hacia un catálogo backend inexistente;

MySQL conserva únicamente IDs canónicos necesarios para progreso e historial;

T221 no añade tablas, columnas, migraciones ni endpoints.

Jerarquía del catálogo frontend

El catálogo actual sigue la jerarquía:

Technology

→ Topic

→ Concept

→ ExerciseSession

→ ExerciseStep

El backend no reproduce esta jerarquía como modelos persistentes.

Contrato de IDs

src/content/content-id.ts define schemas Zod reutilizables para:

technologyId

topicId

conceptId

sessionId mediante contentSessionIdSchema

exerciseId

Los IDs:

son strings;

usan ASCII en minúsculas;

siguen formato slug con segmentos alfanuméricos separados por un único guion;

no se normalizan silenciosamente;

tienen un máximo de 191 caracteres para respetar las columnas VARCHAR(191) existentes;

rechazan espacios, mayúsculas, underscores, puntos, barras, traversal, separadores repetidos, Unicode fuera del contrato y otros formatos no canónicos;

reservan identificadores problemáticos como constructor y prototype.

Ejemplos canónicos:

javascript

js-arrays

js-array-iteration

js-arrays-map-vs-foreach-01

step-1

Los tipos inferidos están branded para distinguir TechnologyId, TopicId, ConceptId, ContentSessionId y ExerciseId en las fronteras TypeScript.

Sintaxis frente a existencia

T221 valida únicamente la sintaxis de una referencia.

Un ID como:

js-future-valid-concept

puede ser sintácticamente válido aunque no exista en el catálogo frontend.

Por tanto:

validación sintáctica != validación de pertenencia al catálogo.

El backend no debe afirmar que un ID existe únicamente porque content-id.ts lo acepte.

Si tareas posteriores necesitan verificar existencia, versión o integridad del catálogo de forma independiente, será necesario introducir una autoridad backend-consumible, por ejemplo un manifest generado o un contrato compartido versionado. T221 no introduce prematuramente esa infraestructura.

Relación con Attempt.exerciseId

El catálogo frontend no posee actualmente una entidad Exercise independiente: ExerciseSession contiene ExerciseStep[].

En la persistencia existente, Attempt.exerciseId representa la referencia estable al ejercicio/paso intentado dentro de una sesión. T221 conserva el nombre persistente existente y formaliza su sintaxis sin crear una tabla Exercise.

Frontera de confianza para T222–T225

El contrato de IDs no convierte en confiables los resultados enviados por el cliente.

Las tareas de progreso posteriores no deberán asumir automáticamente como autoridad valores enviados por frontend tales como:

isCorrect;

totalExercises;

correctExercises;

finalización de una sesión;

pertenencia real de un ID al catálogo.

Antes de persistir mutaciones cuyo significado dependa de la corrección o existencia real del contenido, T222–T225 deberán definir explícitamente qué datos puede verificar el backend y cuál es la autoridad de contenido disponible.

Resultado de T221

T221 queda COMPLETE.

El frontend continúa siendo propietario del catálogo. El backend dispone ahora de un contrato reutilizable y tipado para las referencias de contenido que persistirá en las tareas de progreso.

T222 — user progress model queda como NEXT.

Estado del roadmap

T206 Auth foundation              COMPLETE
T207 Register                     COMPLETE
T208 Login                        COMPLETE
T209 Refresh/session rotation     COMPLETE
T210 Logout secure                COMPLETE
T211 requireAuth                  COMPLETE
T212 /auth/me                     COMPLETE
T213 active-session validation    COMPLETE
T214 roles USER/ADMIN             COMPLETE
T215 requireRole                  COMPLETE
T216 admin protection             COMPLETE / N/A
T217 session management           COMPLETE
T218 IDOR / ownership             COMPLETE
T219 rate limiting/hardening      COMPLETE
T220 attack/security tests        COMPLETE
T221 content model                       COMPLETE
T222 user progress model COMPLETE
T223 completed sessions
T224 concept progress NEXT
T225 attempt/history
T226 review/repetition
T227 badges
T228 dashboard API
T229 frontend-backend sync
T230 isolation tests

T220 queda formalmente cerrado con pruebas adversariales de access tokens, Authorization headers, Origin, proxy spoofing, IDOR, refresh/logout cookies y replay, además del endurecimiento del parsing de codegym_refresh.

T221 resolvió la frontera de ownership del contenido sin modificar Prisma: el frontend continúa siendo propietario del catálogo y el backend mantiene únicamente referencias canónicas validadas. T222 deberá respetar esta frontera al diseñar las escrituras de progreso.

## Completed sessions — T223

T223 implementa la persistencia interna de sesiones completadas sin abrir todavía una frontera HTTP de escritura desde el navegador.

`CompletedSession` es un evento histórico propiedad de un usuario. Conserva:

- `sessionId`
- `technologyId`
- `topicId`
- `conceptId`
- `totalExercises`
- `correctExercises`
- `durationMs`
- `hintsUsed`
- `completedAt`

`accuracy` continúa siendo un valor derivado de `correctExercises / totalExercises`; no se persiste.

La migración `20260912072114_add_completed_session_concept_id` añade `concept_id` a `completed_sessions`.

La columna es nullable en persistencia para mantener compatibilidad con filas históricas creadas antes de T223. Las nuevas finalizaciones creadas por `CompletedSessionService.recordTrustedCompletion()` exigen un `conceptId` válido.

`CompletedSessionRepository` aplica ownership en todas las lecturas:

- latest: `userId + sessionId`
- recientes: `userId`

Nunca se realiza una búsqueda privada únicamente por `sessionId`.

Una misma sesión de contenido puede completarse varias veces. El historial conserva todas las finalizaciones y `findLatestByUserAndSessionId()` devuelve la más reciente.

`recordTrustedCompletion()` constituye una frontera interna de confianza. No significa que las métricas enviadas por un navegador sean autoritativas. Un futuro endpoint HTTP no debe reenviar directamente valores controlados por el cliente como:

- `correctExercises`
- `totalExercises`
- `hintsUsed`
- afirmaciones de finalización

El backend todavía no posee el catálogo/soluciones necesario para verificar de forma independiente la corrección de las respuestas del frontend. Por tanto T223 no crea `POST /completed-sessions`.

T223 tampoco actualiza `ConceptProgress`; esa responsabilidad corresponde a T224.

Estado al cerrar T223:

- repository de CompletedSession: COMPLETE
- service de CompletedSession: COMPLETE
- ownership: COMPLETE
- historial múltiple: COMPLETE
- lectura latest/recent: COMPLETE
- `conceptId` histórico: COMPLETE
- accuracy derivada: COMPLETE
- migración Prisma: COMPLETE
- escritura HTTP pública: deliberadamente no implementada
- frontend: sin cambios
- T224 concept progress: NEXT
