# Dashboard Visual Exploration

> **Fase de exploración.** No implementa nada. No modifica `src/`, ni el router,
> ni los tokens, ni los componentes, ni el Master Plan. No inicia T016.
> Los prototipos viven en `design-lab/visual/`, fuera del build, del lint y del
> type-check. Verificado: ESLint solo cubre `src/**/*.{ts,tsx}` y `*.config.js`,
> `tsc -b` solo incluye `src`, y el `content` de Tailwind solo `index.html` y
> `src/**`.
>
> **Alcance:** exclusivamente el Dashboard (`/dashboard`, «Progreso» en la
> navegación). No se rediseña Home, práctica, sesión ni resultados.

---

## 1. Problemas actuales

El punto de partida del encargo es que el dashboard se siente genérico, basado
en tarjetas, previsible y poco memorable. La exploración lo traduce a cinco
problemas concretos y accionables:

| # | Problema | Qué lo causa |
|---|---|---|
| P1 | **La tarjeta como unidad por defecto** | Cuando toda la información se mete en cajas con borde y fondo, ninguna destaca. La jerarquía se delega al tamaño de la caja, que es el mecanismo más débil que existe. |
| P2 | **El grid simétrico** | Un grid regular comunica que todo pesa lo mismo. En CodeGym no es cierto: el concepto en el que fallas importa mucho más que el tiempo total acumulado. |
| P3 | **La barra de progreso para toda métrica** | Usar el mismo signo visual para dominio, precisión, racha y dificultad borra las diferencias entre magnitudes que no son comparables. |
| P4 | **El dashboard que informa pero no concluye** | Mostrar cinco métricas no es lo mismo que decirle al usuario qué le pasa. Un panel que exige interpretación deja el trabajo sin terminar. |
| P5 | **La ausencia del código** | §10 pide «code presentation excellence» y el producto entero gira alrededor de leer código. Un dashboard sin una sola línea de código podría ser de cualquier SaaS. |

---

## 2. Principios de diseño

Derivados de los problemas anteriores y del Master Plan, **cinco reglas** que
todas las direcciones debían respetar:

1. **La unidad de composición se declara y se justifica.** Banda, columna,
   carril, placa, línea de diff, pieza de código: cada dirección elige una y la
   usa con coherencia. Ninguna usa «la tarjeta» por defecto.
2. **La jerarquía se construye con una variable dominante**, no con cinco a la
   vez. Numeración (D04), altura de banda (D03), severidad (D07), tamaño
   tipográfico (D09), posición temporal (D08), posición espacial (D02).
3. **El color tiene un solo trabajo por dirección.** Ninguna usa color para
   decorar. Diez paletas distintas, ninguna dark+indigo por defecto.
4. **Ningún dato se codifica solo con color.** Siempre hay numeral, marca
   textual o posición que lo desambigüe.
5. **El estado vacío es contenido, no un hueco.** Las diez responden de forma
   distinta —y honesta— cuando no hay datos suficientes.

### 2.1 Restricciones del Master Plan y su coste

Tres decisiones del plan chocan con lo que el encargo pide explorar. No se han
ignorado: se han marcado. En cualquier prototipo, el botón **«marcar coste»**
resalta en ámbar los elementos afectados.

| Restricción | Dónde | Qué dirección la toca |
|---|---|---|
| **Dark-first** (§10) y paleta fija (§12, D007/D008) | Fondo `#0a0a0f`, acento `#6366f1` | Las diez cambian de paleta. **D01 va más lejos: es clara.** §4 excluye incluso el toggle claro/oscuro. |
| **Racha fuera del MVP** (§4, §23: «no implementar streaks») | — | Nueve de diez la muestran. Es *derivable* de `CompletedSession[].completedAt` sin persistir nada, y §22 ya pondera la constancia al 10%. Aun así, mostrarla exige **un ADR que module §4/§23**. |
| **Sin prerrequisitos entre conceptos** (§17) | `Concept` solo tiene `topicId` y `technologyId` | **D02** dibuja un grafo. Sus líneas son *pertenencia a un topic*, nunca dependencias: dibujar prerrequisitos exigiría un campo nuevo. Está escrito dentro del propio prototipo. |

Adopción del fondo claro de D01: implicaría una excepción escrita a §10 o
adelantar el toggle de Fase 3. Es la decisión de producto más cara de la
exploración y no debe tomarse por gusto estético.

### 2.2 Datos: todo derivable, ninguna entidad nueva

Las diez direcciones se alimentan de `ConceptProgress`, `Attempt` y
`CompletedSession` (§17) más `sessionStorage` (§21). Dos matices honestos:

- **La recomendación no es spaced repetition.** §5 sitúa el repaso inteligente
  en Fase 2. Aquí es una ordenación determinista: `domain` ascendente, desempate
  por `lastPracticed` más antiguo y `recentErrors` más recientes.
- **D05 necesita histórico.** §17 no guarda evolución de `domain`. El estado
  «hace 7 días» es recalculable filtrando `Attempt.createdAt`, pero implica
  recomputar el dominio sobre una ventana temporal. No es gratis.

### 2.3 Anti-template review (§21)

Cuatro direcciones se descartaron **en fase de ideación**, antes de prototipar,
por fallar la pregunta «¿esta estructura podría pertenecer a cualquier producto?»:

| Descartada | Por qué |
|---|---|
| **Bento personalizado** | Es literalmente el patrón que el encargo prohíbe. Su retícula serviría igual para un CRM. |
| **Hero + fila de 4 KPIs + gráfico** | La plantilla SaaS por defecto. Ya se exploró como C4 en la ronda anterior y quedó última. |
| **Kanban de conceptos** (por dominar / en progreso / dominado) | Convierte aprender en gestionar tareas. No dice nada sobre programación y es un tablero genérico. |
| **Tarjeta de perfil con avatar y estadísticas** | Patrón de red social. §4 excluye lo social, y la estructura es intercambiable con cualquier producto con usuarios. |

Las diez que sí se prototiparon pasan la prueba: **ninguna funcionaría sin
cambios para un producto que no sea CodeGym**, y tres (D05, D07, D10) serían
directamente absurdas fuera de un contexto de programación.

---

## 3. Las diez direcciones

Medido sobre los prototipos reales, estado «completo», Chromium:

| | nodos | superficies | interactivos | alto @1280 | alto @390 | contraste fg/bg |
|---|---:|---:|---:|---:|---:|---:|
| D01 Registro | 194 | 8 | 20 | 1365 | 2235 | 16,30 |
| D02 Constelación | 176 | 5 | 24 | 900 | 1124 | 16,38 |
| D03 Estación | 280 | 10 | 10 | 905 | 1415 | 16,51 |
| D04 Índice | 252 | **3** | 30 | 2092 | 2686 | 14,58 |
| D05 Diff | 168 | 14 | 22 | 1430 | 2070 | 16,02 |
| D06 Pila | 124 | 39* | 24 | 972 | 1279 | 16,68 |
| D07 Telemetría | **105** | **3** | 10 | 1303 | 1732 | 16,91 |
| D08 Cinta | 164 | 4 | 40 | 900 | 1113 | 15,71 |
| D09 Marcador | **74** | **1** | 10 | 1376 | 1453 | 15,03 |
| D10 Banco | 137 | 12 | 7 | 900 | 1541 | 15,26 |

\* Las 39 «superficies» de D06 son las 21 placas de la pila: son la
visualización, no contenedores. La métrica cuenta cajas, no distingue intención.

---

### D01 · REGISTRO

**Idea.** El dashboard es un **libro de registro contable**. Cada sesión es un
asiento con fecha, resultado y variación de dominio. La composición es la de un
balance: columna de metadatos en monoespaciada a la izquierda, cifras alineadas
a la derecha, guías de puntos, reglas de distinto grosor como única jerarquía.

**Fondo y color.** Papel cálido claro (`#f4f2ec`). **La única dirección clara.**
Tinta monocroma más un rojo funcional de tinta (`#8f2a1c`). Ni indigo ni verde
de UI: los estados usan tonos de tinta.

**Estructura.** Cabecera con regla gruesa → balance de cinco cifras separadas
por filetes verticales → tabla de asientos recientes → dos columnas: balance
por concepto con guías de puntos + observaciones al margen con filete de acento
→ «próxima entrada» como el asiento en blanco que toca rellenar.

**Jerarquía.** 1.º el balance de cinco cifras. 2.º los asientos. 3.º el
detalle por concepto. La acción cierra el libro, no lo abre.

**Progreso.** Como **saldo**: numerales con signo (+3, −4, 0). Ninguna barra.

**Errores.** Como **observaciones al margen**, con filete de acento: la
convención tipográfica de la anotación editorial.

**Responsive.** Móvil: la tabla **no se encoge, se reescribe** — cada fila pasa
a bloque de dos líneas con el delta anclado a la derecha; el encabezado
desaparece porque cada dato lleva ya su contexto. Tablet: balance a cinco
columnas. Desktop: dos columnas para balance + observaciones.

**Fortaleza.** Claridad total y una personalidad que ningún dashboard oscuro
tiene. Tabla semántica real: excelente para lectores de pantalla.
**Riesgo.** El fondo claro contradice §10 frontalmente. Scroll de 2235 px en
móvil, el segundo más largo.

---

### D02 · CONSTELACIÓN

**Idea.** El conocimiento tiene **forma**. Cada concepto ocupa una posición
estable en un lienzo; te orientas espacialmente en vez de leer una lista. Radio
= intentos, relleno = dominio, anillo = estado. **Es interactivo**: seleccionar
un nodo reescribe el panel de detalle.

**Fondo y color.** Near-black neutro con retícula de puntos de 1 px —referencia
espacial, no decoración—. Teal (`#4ec9b0`) como único acento.

**Estructura.** Lienzo dominante (asimétrico, a la izquierda) + panel contextual
de 300 px a la derecha con dominio global, detalle del nodo seleccionado,
leyenda y huecos del mapa.

**Jerarquía.** 1.º el lienzo. 2.º el nodo seleccionado. 3.º los huecos.

**Progreso.** Como **mapa**: brillo y tamaño de cada nodo. Cero barras, cero
porcentajes en la vista principal.

**Responsive.** Móvil: el mapa **no se escala** —escalarlo dejaría las etiquetas
en 4 px y los nodos en 25 px de área táctil—. Se mantiene a 1:1 y **se recorre
en horizontal**, como cualquier mapa. El panel pasa debajo.

**Fortaleza.** La más original y la más agradable de explorar.
**Riesgo.** Hay que **aprender a leerlo**. Escalabilidad mala: con 3 tecnologías
y 60 conceptos se satura, y el modelo no tiene prerrequisitos que dibujar.

---

### D03 · ESTACIÓN

**Idea.** Una **consola de estación de entrenamiento**. La unidad no es la
tarjeta ni la columna: es la **banda horizontal a sangre completa**. Cada banda
es un canal con su etiqueta en un canalón fijo de 96 px y los datos fluyendo a
la derecha.

**Fondo y color.** Bandas de **luminancia distinta** sobre neutro oscuro: la
estructura se ve sin dibujar una sola caja. Casi monocromo con un único color
de señal (ámbar) reservado a «esto requiere atención».

**Estructura.** Lectura → maestro → canales → atención → registro → transporte.
Seis bandas, altura variable según importancia.

**Jerarquía.** Altura de banda + luminancia. La banda de transporte (la acción)
es la más alta después de la de lectura.

**Progreso.** **Medidores segmentados de 20 tramos**, tipo vúmetro. No son
barras: el tramo encendido es discreto y contable.

**Responsive.** Las bandas apilan sin reorganizarse: es la arquitectura más
naturalmente responsive de las diez. El canalón de etiqueta pasa de columna a
línea superior por debajo de 1024 px.

**Fortaleza.** Legible, ordenada, con carácter de instrumento.
**Riesgo.** Los canales funcionan para 7 topics; **no para 21 conceptos**. El
registro de sesiones en tira se corta mal.

---

### D04 · ÍNDICE

**Idea.** El **índice de un manual técnico** cuyo tema eres tú. La jerarquía la
construye la **numeración de secciones** (§1…§8), no el tamaño ni el color.
Sangrías francesas, guías de puntos, numerales a la derecha como si fueran
páginas.

**Fondo y color.** Pizarra fría uniforme. **Una sola superficie en toda la
página** —tres, medidas— y **monocromo estricto: ningún color de marca**. El
estado se comunica con el numeral y una marca textual («sin abrir»), nunca con
tinte.

**Estructura.** Portada → colofón de cifras en una línea → sumario fijo a la
izquierda + cuerpo con los 8 capítulos **ordenados por el que peor llevas** →
§8 Erratas → «capítulo siguiente» como addendum.

**Jerarquía.** 1.º la portada. 2.º el capítulo §7 (el más flojo, primero por la
regla de orden). 3.º las erratas.

**Progreso.** Como **numeral de página**. Sin ninguna representación gráfica.

**Errores.** Como **sección de erratas**, con la relación causal escrita:
«corregir §4 arreglaría además dos entradas de §3».

**Responsive.** El sumario pasa de columna fija a bloque superior. Nada más
cambia: es una columna de texto.

**Fortaleza.** **La más accesible de las diez** por construcción: monocroma,
semántica, sin nada codificado por color. Escala perfectamente —un índice crece
por definición—.
**Riesgo.** 2686 px en móvil, **el scroll más largo**. Y es la que peor entra
por los ojos en una captura de portfolio.

---

### D05 · DIFF

**Idea.** El dashboard es un **diff de ti mismo**. No muestra un estado: muestra
un **cambio**. Es la única que responde «¿estoy mejorando?» en lugar de «¿cómo
estoy?». Árbol de topics con recuento de cambios, como el panel de archivos de
una revisión de código. **Interactivo**: filtra los hunks.

**Fondo y color.** Superficie de editor real: `#0d1117`, que es exactamente el
`--code-bg` de §12. Es la única dirección que puede justificar ese fondo,
porque la página **es** un editor. Verde y rojo de diff, exclusivamente
funcionales, siempre acompañados del signo `+` / `−`.

**Estructura.** Barra de revisión → árbol → hunks por topic → resumen →
conflictos sin resolver → siguiente commit.

**Progreso.** Como **delta**: `74 → 82`. Ninguna otra dirección lo hace.

**Errores.** Como **conflictos sin resolver**, con la nota de dónde reaparecen.

**Responsive.** El árbol pasa arriba como barra horizontal; los hunks siguen
siendo filas de texto que fluyen.

**Fortaleza.** Personalidad altísima para el público objetivo y una pregunta
que ninguna otra responde.
**Riesgo.** ⚠ **Coste de datos real:** exige recomputar el dominio sobre una
ventana temporal. Y no dice nada útil el primer día.

---

### D06 · PILA

**Idea.** Todas las demás se leen de arriba abajo. Esta **invierte el eje**: el
elemento dominante es una **pila vertical de 21 placas** —una por concepto— que
ocupa el alto del viewport a la izquierda. El contenido de la derecha se alinea
con placas concretas: la relación entre dato y acción es **espacial**.

**Fondo y color.** Neutro cálido muy oscuro, una sola superficie. Monocromo en
grises cálidos + **un solo naranja** para la placa que bloquea y la acción.

**Estructura.** Pila fija a la izquierda (con la carga total arriba) + titular
diagnóstico → cifras → placas que bloquean → serie siguiente → registro.

**Progreso.** Como **carga física**: el perfil de la pila. Ni barras ni
porcentajes en el elemento principal.

**Responsive.** Por debajo de 1024 px la pila **deja de ser el control**: 21
placas de 44 px serían 990 px de scroll. Se sustituye por un **perfil compacto
horizontal no interactivo**, y la interacción se traslada a la lista de placas
bloqueantes, que ya tiene filas de 48 px.

**Fortaleza.** La composición vertical es genuinamente rara y el titular
diagnóstico («Tres placas te están bloqueando la pila») es fuerte.
**Riesgo.** **La pila es visualmente muda sin interacción**: 21 enlaces cuyo
texto solo aparece al pasar por encima. Correcto para lector de pantalla,
insuficiente para un usuario que mira.

---

### D07 · TELEMETRÍA

**Idea.** El dashboard **no informa: diagnostica**. Abre con un **veredicto** en
una frase y una severidad; debajo, la evidencia en formato de salida de linter,
con sangría como jerarquía y rutas de fichero. El progreso queda relegado a una
línea de pie, como el summary de un test runner. Es lo contrario de un panel de
métricas: **aquí las métricas son la prueba de una conclusión**, no el contenido.

**Fondo y color.** Negro neutro puro (`#0a0a0a`), sin tinte azul. **Ningún color
de marca en toda la página**: solo escala de severidad. El botón de acción usa
el color de la severidad que resuelve.

**Estructura.** Cabecera de ejecución → veredicto con etiqueta de severidad →
hallazgos agrupados por carpeta → resumen tipo test runner → «corregir primero»
→ progreso, en una línea, al final.

**Jerarquía.** Inequívoca: veredicto → evidencia → acción → progreso.

**Progreso.** Deliberadamente **último y en una línea**. Es la decisión más
arriesgada y la más coherente con la tesis.

**Errores.** **Son el contenido entero.**

**Responsive.** Una columna de texto monoespaciado. La única adaptación es la
sangría de los hallazgos. No hay nada que reorganizar.

**Fortaleza.** Responde «¿en qué fallo?» mejor que ninguna, y encadena
directamente a la corrección. **105 nodos y 3 superficies: la más barata.**
**Riesgo.** El veredicto exige **copy escrito por combinación de error
dominante** —no es texto generado—. Y con pocos datos solo puede decir «muestra
insuficiente», que es honesto pero árido.

---

### D08 · CINTA

**Idea.** Las demás organizan por categoría. Esta organiza por **eje temporal**.
Una regla de tiempo cruza la página; debajo, un carril por topic donde cada
sesión es una marca en su fecha. **Los huecos informan tanto como las marcas.**
El futuro —la sesión siguiente— ocupa el tramo a la derecha de «hoy».

**Fondo y color.** Azul-gris muy oscuro con separadores semanales verticales: la
retícula temporal **es** la estructura. Ámbar reservado a hoy y al futuro; todo
lo pasado es frío. **El color codifica tiempo, no estado.**

**Progreso.** Como **trayectoria**: dónde y cuándo dejaste marcas.

**Errores.** Como **carriles muertos**: «Errores · 34 días sin tocar».

**Responsive.** ⚠ Por debajo de 768 px el eje temporal **no sobrevive**. No se
comprime: se sustituye por la lectura por carril, con la última marca y el hueco
como datos textuales. Se pierde la forma, se conserva la información.

**Fortaleza.** La única que hace visible el **abandono**, que es el fracaso real
de una plataforma de entrenamiento.
**Riesgo.** Es la que peor sobrevive a móvil de las diez, y no responde bien a
«¿qué entreno ahora?».

---

### D09 · MARCADOR

**Idea.** **La tipografía es el layout.** Sin contenedores, sin reglas, sin
iconos. La composición la construyen tamaño, peso y posición sobre una retícula
**deliberadamente asimétrica**: nada se alinea con nada por defecto, y cuando
dos cosas se alinean es porque significan lo mismo. El criterio del tamaño es la
decisión de diseño: **el número más grande no es el mejor, es el que más te
afecta hoy** —por eso el `22` de Promise.all() es mayor que el `54` global—.

**Fondo y color.** **Tono medio** (`#1c1e22`), ni negro ni blanco: obliga a
resolver la jerarquía con peso tipográfico en vez de con contraste de
superficie. Casi monocromo, un solo rojo para el dato que exige acción.

**Progreso.** Como **cifra pura**, con la escala como significado.

**Responsive.** Los desplazamientos porcentuales que crean la asimetría se
anulan por debajo de 900 px y todo cae a un eje único. Es la dirección con
**menor variación desktop↔móvil** (1376 → 1453 px).

**Fortaleza.** **74 nodos y 1 superficie: la más barata de las diez.** Jerarquía
perfecta y muy fotogénica.
**Riesgo.** La asimetría está **calculada para estos datos concretos**. Añadir
un bloque la rompe: es la peor en escalabilidad junto con D02.

---

### D10 · BANCO

**Idea.** **Ningún otro producto puede tener este dashboard**, porque su objeto
central es **el código**. En el banco de trabajo hay una pieza: el fragmento que
vas a enfrentar ahora, con **las líneas que te delatan marcadas**. Todo lo demás
son anotaciones al margen sobre esa pieza. Tu historial no se cuenta aparte: se
cuenta señalando el código.

**Fondo y color.** Dos planos: página en gris-azul, la pieza sobre `--code-bg`.
**La paleta de interfaz es la del resaltado de sintaxis que el proyecto ya
tiene** en `index.css`. No se inventa ni un color.

**Estructura.** Cabecera → barra de fichero → la pieza con líneas marcadas →
pregunta y acción → otras piezas esperando · marginalia a la derecha: esta
pieza, el banco entero, marcas en el filo, horas de banco.

**Jerarquía.** 1.º la pieza. 2.º la anotación «esta pieza: 22». 3.º el resto.

**Progreso.** Como **anotación sobre un artefacto concreto**, nunca en
abstracto.

**Responsive.** La marginalia pasa debajo de la pieza; el código conserva su
propio scroll horizontal (§11 lo exige para bloques de código).

**Fortaleza.** La más específica de CodeGym con diferencia. Cumple §10 («code
presentation excellence») convirtiéndolo en estructura, no en adorno. Convence
antes de pulsar: ves exactamente a qué te enfrentas.
**Riesgo.** Necesita **cargar el primer step de la sesión recomendada** en el
dashboard: una petición de contenido extra (encaja con el lazy loading de D005,
pero es trabajo). Y una sola pieza no representa el progreso global.

---

## 4. Comparación

Escala 1–10. «Complejidad» puntúa **inversamente**: 10 = barato de construir y
mantener. Media simple, sin pesos: el encargo pide valorar, no ponderar.

| Criterio | D01 | D02 | D03 | D04 | D05 | D06 | D07 | D08 | D09 | D10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Personalidad | 9 | 9 | 8 | 9 | **10** | 9 | **10** | 8 | 9 | **10** |
| Diferenciación | 9 | **10** | 8 | 9 | **10** | 9 | **10** | 9 | 8 | **10** |
| UX | 8 | 7 | 8 | 8 | 8 | 6 | **9** | 7 | 8 | **9** |
| Jerarquía | 8 | 7 | 8 | 9 | 8 | 7 | **10** | 7 | **10** | 9 |
| Claridad | 9 | 6 | 8 | 9 | 8 | 6 | 9 | 7 | 9 | 9 |
| Responsive | 8 | 6 | 8 | 8 | 7 | 7 | **9** | 5 | **9** | 8 |
| Accesibilidad | 9 | 6 | 8 | **10** | 7 | 6 | 9 | 6 | 8 | 8 |
| Performance | 9 | 7 | 8 | 9 | 8 | 8 | **10** | 8 | **10** | 8 |
| Complejidad | 8 | 5 | 7 | 9 | 4 | 7 | 7 | 6 | 9 | 7 |
| Escalabilidad | 8 | 4 | 7 | **9** | 8 | 5 | **9** | 7 | 5 | 8 |
| Portfolio | 9 | 9 | 8 | 8 | **10** | 8 | 9 | 8 | 9 | **10** |
| **MEDIA** | **8,55** | **6,91** | **7,82** | **8,82** | **8,00** | **7,09** | **9,18** | **7,09** | **8,55** | **8,73** |

**Ranking:** D07 (9,18) · D04 (8,82) · D10 (8,73) · D01 y D09 (8,55) ·
D05 (8,00) · D03 (7,82) · D06 y D08 (7,09) · D02 (6,91).

### Notas sobre las puntuaciones discutibles

- **D05 · Complejidad 4.** No es la UI, que es sencilla. Es que exige recomputar
  el dominio sobre una ventana temporal porque §17 no guarda histórico.
- **D02 · Escalabilidad 4.** El mapa se satura pasando de una tecnología, y las
  aristas no pueden representar prerrequisitos porque el modelo no los tiene.
- **D04 · Accesibilidad 10.** Monocromo estricto: es imposible que codifique
  información con color porque no tiene color. Semántica de secciones real.
- **D08 · Responsive 5.** Es la única en la que la propuesta **desaparece** en
  móvil. La sustitución funciona, pero deja de ser esta dirección.
- **D06 · UX 6.** La pila es visualmente muda hasta que interactúas.
- **D07 · Complejidad 7.** `errorType` ya existe en `ErrorRecord`, así que los
  hallazgos son agrupables sin modelo nuevo. Lo que cuesta es el **copy del
  veredicto**, que hay que escribir por combinación de error dominante.

### Diferenciación real

| Dimensión | D01 | D02 | D03 | D04 | D05 | D06 | D07 | D08 | D09 | D10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Unidad de composición | asiento | nodo | banda | entrada | línea de diff | placa | hallazgo | marca | número | pieza |
| Eje | vertical | espacial | horizontal | vertical | vertical | **vertical dominante** | vertical | **temporal** | asimétrico | ancla central |
| Fondo | **claro cálido** | near-black + retícula | bandas de luminancia | pizarra uniforme | **editor** | neutro cálido | negro puro | azul-gris + retícula | **tono medio** | dos planos |
| Color | tinta + rojo | teal | ámbar de señal | **ninguno** | diff | naranja único | **solo severidad** | tiempo | rojo único | sintaxis |
| Progreso como | saldo | mapa | vúmetro | numeral | **delta** | carga | pie de línea | trayectoria | cifra | anotación |
| Errores como | observaciones | huecos | canal en señal | erratas | conflictos | placas que bloquean | **hallazgos** | carriles muertos | ranking | marcas en el filo |
| Siguiente sesión | asiento en blanco | nodo + panel | banda de transporte | addendum | commit | serie | corrección | tramo futuro | resultado | la pieza |
| Cards | no | 1 panel | no | **no** | no | no | **no** | no | **no** | 1 pieza |
| Grid | no | no | no | no | 2 col | 2 col | no | carriles | **asimétrico** | 2 col |

Ninguna comparte unidad de composición, eje, tratamiento de fondo, estrategia de
color ni representación de progreso con otra.

---

## 5. TOP 3

### 🥇 D07 · TELEMETRÍA — 9,18

**Qué la diferencia.** Es la única que **concluye** en lugar de mostrar. Abre
con una frase que es un diagnóstico —«Fallas por mutar lo que deberías
copiar»— y todo lo demás es la prueba. Invierte la convención entera: el
progreso, que en los otros nueve es el protagonista, aquí es una línea de pie.

**Qué problema resuelve.** P4 directamente: el dashboard que informa pero no
concluye. Y P1 y P3 por descarte: no hay tarjetas ni barras porque el formato
—salida de linter— no las admite.

**Qué tiene de memorable.** Un dashboard que te dice a la cara en qué fallas, con
tipografía de terminal y una etiqueta roja de `ERROR`, no se olvida. Y el uso
del color es una declaración: **ningún color de marca en toda la página**.

**Riesgo.** El veredicto es **copy escrito**, no generado: hace falta una tabla
de frases por combinación de error dominante. Con pocos datos solo puede decir
«muestra insuficiente». Y hay un riesgo de tono: un producto que siempre te
regaña puede desgastar.

**Qué conservaría.** La estructura completa: veredicto → evidencia → acción →
progreso al pie. La ausencia total de color de marca. Los 105 nodos.

**Qué cambiaría.** El tono, para que la severidad no sea siempre negativa: si
la semana ha ido bien, el veredicto debería poder ser `OK` con el mismo formato.
Y añadiría el código —ver el híbrido—.

---

### 🥈 D04 · ÍNDICE — 8,82

**Qué la diferencia.** Construye toda la jerarquía con **numeración de
secciones**. Es el único mecanismo de jerarquía de la exploración que no depende
ni del tamaño ni del color ni de la posición: depende del orden.

**Qué problema resuelve.** P1 y P2 de raíz: sin cajas y sin grid no hay
simetría que romper. Y es la respuesta más limpia a P3.

**Qué tiene de memorable.** Es **monocroma estricta**. En un mercado donde todo
dashboard tiene un color de marca, no tener ninguno es la decisión más audaz de
las diez. Las guías de puntos y los numerales a la derecha son de imprenta, no
de software.

**Riesgo.** 2686 px de scroll en móvil, el más largo. Y su virtud es su límite:
un índice es sobrio, y sobrio puede leerse como frío o como poco trabajado por
alguien que no sabe qué está mirando.

**Qué conservaría.** El orden por «el capítulo que peor llevas» —una regla de
ordenación que es en sí misma un diagnóstico—, la sección de erratas con la
relación causal escrita, y la marca textual de estado en vez de tinte.

**Qué cambiaría.** El scroll: los capítulos sólidos deberían venir plegados. Y
subiría la acción, que ahora está al final de 2000 px.

---

### 🥉 D10 · BANCO — 8,73

**Qué la diferencia.** Es la única cuyo objeto central es **el código**. Las
otras nueve podrían, con esfuerzo, adaptarse a otro producto de aprendizaje.
Esta no: sin código no existe.

**Qué problema resuelve.** P5 por completo, y P4 en buena medida: al marcar las
líneas concretas que has fallado, el diagnóstico deja de ser una estadística y
pasa a ser señalable.

**Qué tiene de memorable.** «Las líneas 4 y 8 son las que has fallado tres
veces» es la frase más específica de toda la exploración. Y la paleta de
interfaz es la del resaltado de sintaxis: **el producto se pinta con sus propios
colores**.

**Riesgo.** Una pieza no representa el progreso global: la marginalia tiene que
cargar con todo el contexto y puede quedarse corta. Requiere cargar el primer
step de la sesión recomendada en el dashboard.

**Qué conservaría.** La pieza con líneas marcadas, la marginalia como forma de
anotar progreso, y «otras piezas esperando» como lista de conceptos débiles.

**Qué cambiaría.** Daría más peso al estado global: hoy el `54` de «el banco
entero» está enterrado en la tercera anotación.

---

## 6. Dirección ganadora

**D07 · TELEMETRÍA**, con una condición que desarrolla el apartado 7.

No gana por impacto visual —D05 y D10 son más espectaculares en una captura—
sino porque equilibra las nueve dimensiones que pide el encargo:

| | Por qué |
|---|---|
| **Identidad** | Un dashboard sin color de marca, que abre con un veredicto de severidad. Es reconocible en una miniatura. |
| **UX** | Es el único que responde «¿en qué fallo?» y encadena directamente a «corrige esto». Cuatro pasos de lectura, uno de acción. |
| **Claridad** | Jerarquía inequívoca. No hay dos elementos compitiendo en ningún punto de la página. |
| **Responsive** | Una columna de texto. No hay nada que reorganizar; ninguna decisión se pierde en móvil. |
| **Accesibilidad** | Severidad con **etiqueta textual** (`ERROR`, `aviso`, `ok`), nunca solo color. Contraste 16,91:1. Solo 10 elementos interactivos: orden de tabulación cortísimo. |
| **Performance** | 105 nodos y 3 superficies. La más barata de renderizar de las diez. |
| **Escalabilidad** | Más datos = más hallazgos. El formato de salida de linter absorbe volumen sin rediseñarse: es literalmente para lo que se inventó. |
| **Mantenimiento** | Sin gráficos, sin SVG de datos, sin posicionamiento calculado, sin excepciones de layout. Cabe en los 900 px de §11. |
| **Personalidad** | Alta y, sobre todo, **defendible**: cada decisión —el negro neutro, la ausencia de marca, el progreso al pie— responde a la tesis. |

### Lo que se sacrifica al elegirla

- **La narrativa de progreso.** El `54` acaba en una línea de pie. Si el
  objetivo del producto fuera motivar mostrando avance, esta es la peor elección
  de las diez.
- **El placer de explorar.** D02 invita a curiosear; D07 te da un parte.
- **El tono.** Un panel que siempre abre con `ERROR` puede cansar. Se mitiga
  haciendo que la severidad sea real: si no hay hallazgos, el veredicto es `OK`.
- **La forma.** Es la dirección con menos «imagen»: casi todo es texto.

---

## 7. Hybrid Direction

Sí, hay un híbrido que mejora al ganador, y es **D07 + D10**.

### Por qué combinarlos

D07 tiene el mejor **razonamiento** y D10 la mejor **evidencia**. Telemetría
dice «fallas por mutar lo que deberías copiar»; Banco enseña **las dos líneas
exactas** donde lo haces. Juntos cierran el argumento: afirmación → prueba →
corrección. Separados, a D07 le falta concreción y a D10 le falta conclusión.

Además son técnicamente compatibles: los dos son una columna de texto sobre
fondo oscuro neutro, los dos caben en 900 px y ninguno necesita gráficos.

### Qué se toma exactamente de cada uno

| De | Qué exactamente | Por qué |
|---|---|---|
| **D07** | La **estructura completa**: cabecera de ejecución → veredicto con severidad → hallazgos agrupados → resumen → acción → progreso al pie | Es la jerarquía mejor puntuada de la exploración (10) |
| **D07** | El **negro neutro puro** y la **ausencia total de color de marca**; solo escala de severidad | Es la decisión de identidad más fuerte y la que mejor cumple «el color tiene un solo trabajo» |
| **D07** | La **etiqueta textual de severidad** (`ERROR` / `aviso` / `ok`) | Cumple «nada codificado solo por color» sin esfuerzo |
| **D07** | El **progreso al pie, en una línea** | Es la decisión que define la tesis; quitarla lo convierte en otro panel |
| **D10** | La **pieza de código con las líneas marcadas**, insertada **como evidencia del hallazgo principal** | Es lo que hace el diagnóstico específico y verificable. Y cumple §10 |
| **D10** | La **marginalia** como forma de anotar: cada cifra pegada a lo que explica | Evita que las métricas vuelvan a ser una fila de KPIs |
| **D04** | La **marca textual de estado** (`sin abrir`) y el orden por «el que peor llevas» | Refuerza la accesibilidad y da una regla de ordenación que ya es diagnóstico |
| **D01** | El **registro de sesiones como asientos** con su Δ dominio, en el pie | Cuenta la historia reciente sin ocupar jerarquía |

### Estructura del híbrido

```
codegym diagnose --tech=javascript · 312 intentos · 1 sep 09:41
──────────────────────────────────────────────────────────────
[ERROR]  Fallas por mutar lo que deberías copiar.               ← D07
         El 56% de tus fallos son de dos tipos que comparten
         raíz. Aparecen en tres topics: no es un problema de
         Promesas, es un patrón tuyo.

         promesas/promise-all-swallow.json · paso 1 de 5        ← D10
         ┌──────────────────────────────────────────┐
         │ 3   Promise.resolve('ok'),               │
       ▌ │ 4   Promise.reject(new Error('falla')),  │  ← la evidencia
         │ 7                                        │
       ▌ │ 8   const r = await Promise.all(tareas); │
         └──────────────────────────────────────────┘
         Has fallado estas dos líneas tres veces.
         [ Corregir → ]  [ Ver otro hallazgo ]

HALLAZGOS POR SEVERIDAD                                          ← D07
  promesas/ · dominio 37
    error   Promise.all()  · dominio 22 · precisión 33%
            async · 3 fallos en 9 intentos · último ayer
    aviso   async / await  · dominio 51
  arrays/ · dominio 78
    error   Array.reduce() · dominio 41 · mutación · regresión
    ok      Array.filter() · Array.map() · Array.find()
  …
  3 errores · 2 avisos · 14 sin hallazgos · 2 sin intentos       ← D07

REGISTRO                                                         ← D01
  01 SEP  Filter no debería mutar    Arrays    5/5   +3
  31 AGO  map vs forEach             Arrays    4/5   +1
  31 AGO  Promise.all y errores      Promesas  2/5   −4

progreso  dominio 54 (+6) · precisión 73% (+4,1) · 47 sesiones   ← D07
```

**Lo que gana el híbrido sobre D07 solo:** la evidencia deja de ser una cifra y
pasa a ser código señalable, la acción sube al primer tercio de la página en
lugar de estar tras 1300 px, y el registro da la historia reciente que D07 no
tenía. **Lo que cuesta:** una carga de contenido adicional (el primer step de la
sesión recomendada) y una superficie más —el bloque de código—, que pasa de 3 a
4. Es el único punto donde el híbrido empeora una métrica del ganador, y está
justificado: es la única superficie de la página y por eso concentra la atención
justo donde debe.

**Nombre propuesto:** `Diagnóstico con pieza`.

---

## 8. Responsive Strategy

Cada dirección se pensó en los tres tamaños desde el principio. Las
transformaciones importantes —las que **no** son «encoger el desktop»— son:

| Dirección | Mobile (320–639) | Tablet (640–1023) | Desktop (1024+) |
|---|---|---|---|
| D01 | La tabla **se reescribe**: cada asiento pasa a bloque de dos líneas con el Δ anclado; el `<thead>` se oculta | Balance a 5 columnas | Dos columnas: balance + observaciones |
| D02 | El mapa **no se escala**: se mantiene a 1:1 y se recorre en horizontal | Mapa arriba, panel debajo | Lienzo + panel fijo de 300 px |
| D03 | Bandas apiladas, canalón de etiqueta como línea superior | Igual | Canalón de 96 px como columna |
| D04 | Sumario como bloque superior | Igual | Sumario fijo de 190 px |
| D05 | Árbol como barra horizontal arriba | Igual | Árbol de 230 px + diff |
| D06 | La pila **deja de ser el control**: perfil compacto horizontal no interactivo; la interacción baja a la lista de placas | Igual | Pila vertical fija e interactiva |
| D07 | Sin cambios estructurales | Sin cambios | Sin cambios |
| D08 | El eje temporal **se sustituye** por lectura por carril con hueco y última marca como texto | Cinta con scroll | Cinta completa + carriles |
| D09 | Los desplazamientos asimétricos se anulan; eje único | Asimetría parcial | Asimetría completa |
| D10 | Marginalia debajo de la pieza; el código conserva su scroll propio | Igual | Pieza + marginalia fija de 268 px |

**Del ganador (híbrido):** una sola columna de texto en los cinco anchos. La
única adaptación es la sangría de los hallazgos y el scroll horizontal propio del
bloque de código, que §11 exige. **Ninguna decisión de diseño se pierde en
móvil**, que es la razón principal de su nota de responsive.

### Verificación ejecutada

10 direcciones × 5 breakpoints (320 · 390 · 768 · 1024 · 1280) × 3 estados
(completo · inicial · vacío), en Chromium:

- **Cero desbordamiento horizontal** del documento en las 150 combinaciones. El
  contenido ancho (tabla, mapa, código, cinta) se desplaza dentro de su propio
  contenedor.
- **Los 30 estados pintan contenido**: ninguno deja la página en blanco.
- **Objetivos táctiles ≥44 px** (§14). La primera pasada encontró **90
  infracciones**; todas corregidas. Dos exigieron rearquitectura, no un ajuste:
  la pila de D06 y la cinta de D08 dejan de ser interactivas en móvil y ceden la
  interacción a listas de 48–52 px.

---

## 9. Motion Strategy

Evaluado conceptualmente con `animation-performance-engineering`. **Nada
implementado.**

### Reglas transversales

1. **Solo `transform` y `opacity` se componen.** Todo lo demás cuesta layout o
   paint y hay que justificarlo.
2. **`width` en una barra provoca layout.** §13 define `progressFill` con
   `width`; la alternativa correcta es `scaleX` con `transform-origin: left`
   sobre un hijo interior dentro de un contenedor con `overflow: hidden`, para
   que el radio no se deforme.
3. **Nunca animar colecciones grandes elemento a elemento.** Las 21 placas de
   D06, los 19 nodos de D02, las 40 marcas de D08: se anima **el contenedor**.
4. **Techo del stagger:** ≤8 elementos, retardo ≤40 ms, total ≤320 ms.
5. **React:** entrada por clase CSS al montar, nunca estado por fotograma. Los
   contadores se escriben con `requestAnimationFrame` sobre un nodo
   referenciado; los valores viajan como custom properties.
6. **`will-change` se retira en `animationend`.** Dejarlo fijo reserva memoria
   de GPU permanentemente.
7. **`prefers-reduced-motion`:** el bloque global de §13 lleva las duraciones a
   0,01 ms, lo que hace **saltar al estado final**. Correcto para revelados y
   barras; insuficiente para celebraciones, que necesitan un estado estático
   alternativo.

### Candidatas del ganador (híbrido)

| Interacción | Qué ocurre | Propiedad | Coste | Móvil | reduced-motion |
|---|---|---|---|---|---|
| `verdictEnter` | La etiqueta de severidad y la frase entran juntas, 200 ms | `opacity` + `translateY(6px)` | Compositing, 2 capas | Barato | Estado final |
| `evidenceReveal` | La pieza de código aparece 120 ms después del veredicto | `opacity` del bloque | Compositing, **1 capa**. Nunca línea a línea: el resaltado genera decenas de `<span>` | Barato como bloque | Visible de inmediato |
| `markedLines` | Las dos líneas marcadas pulsan una vez al entrar | `opacity` de un pseudo-elemento con el fondo ya pintado | Compositing. **No** animar `background-color`: es paint | Barato | Marcadas sin pulso |
| `findingsStagger` | Los grupos de hallazgos entran escalonados | `opacity` + `translateY`, **máximo 5 grupos**, 40 ms | Compositing, dentro del techo | Barato | Estado final |
| `footCount` | Las cifras del pie cuentan hasta su valor | `textContent` vía rAF | Layout+paint del nodo. **`tabular-nums` es obligatorio** o los hermanos se recolocan | Un solo nodo por cifra | Valores finales |

### Lo que NO se anima, y por qué

- **La reordenación de hallazgos.** Requeriría FLIP: leer
  `getBoundingClientRect` de cada fila fuerza layout síncrono. No compensa.
- **El resaltado de sintaxis.** Es paint puro sobre muchos nodos.
- **El progreso del pie.** Es una línea de texto; animarla contradiría su papel
  deliberadamente secundario.

### Riesgos detectados en los propios prototipos

Dos deudas que la implementación debe corregir si adopta esas direcciones:
`.plate:hover { transform: translateX() }` en D06 está bien, pero
`.c5-list a:hover { padding-left }` del laboratorio anterior y cualquier hover
que mueva con `padding` o `margin` **provoca layout**; debe ser `transform`.

---

## 10. Accessibility

### Auditoría de contraste ejecutada

Las diez paletas se midieron sobre los valores resueltos en el navegador
(WCAG 2.1, texto normal ≥4,5:1; elemento no textual ≥3:1):

| | fg/bg | dim/bg | accent/bg | ink/accent | ok | warn | bad |
|---|---:|---:|---:|---:|---:|---:|---:|
| D01 Registro | 16,30 | 7,53 | 7,46 | 7,46 | 6,37 | 5,38 | 6,46 |
| D02 Constelación | 16,38 | 7,50 | 9,60 | 8,14 | 9,60 | 10,26 | 5,66 |
| D03 Estación | 16,51 | 6,80 | 8,48 | 8,25 | 8,84 | 8,48 | 6,51 |
| D04 Índice | 14,58 | 7,00 | 14,58 | 14,58 | 14,58 | 14,58 | 14,58 |
| D05 Diff | 16,02 | 6,15 | 7,49 | 7,48 | 7,45 | 7,50 | 5,65 |
| D06 Pila | 16,68 | 6,82 | 6,75 | 6,92 | 16,68 | 6,75 | 6,75 |
| D07 Telemetría | 16,91 | 7,04 | 15,57 | 15,57 | 10,55 | 10,83 | 6,62 |
| D08 Cinta | 15,71 | 6,97 | 12,88 | 12,16 | 10,65 | 12,88 | 7,08 |
| D09 Marcador | 15,03 | 7,49 | 5,51 | 6,50 | 15,03 | 5,51 | 5,51 |
| D10 Banco | 15,26 | 6,93 | 9,27 | 9,74 | 11,68 | 9,27 | 7,12 |

**Cero incumplimientos.** Explorar diez paletas fuera de §12 —incluida una
clara— **no ha costado accesibilidad**. Único matiz: `--faint` se mueve entre
3,13 y 4,12 y por eso está reservado a contenido decorativo, exactamente como
`--text-muted` en el proyecto real (D007).

### Requisitos que cumplen las diez

- Foco visible con el acento de la dirección, `offset: 2px`.
- Objetivos táctiles ≥44 px, verificados en 390 px.
- Ningún dato codificado solo con color: siempre numeral, signo (`+`/`−`),
  etiqueta textual (`sin abrir`, `ERROR`) o posición.
- `prefers-reduced-motion` respetado globalmente.
- HTML semántico: `<table>` real en D01, `<section aria-labelledby>` en todas,
  `role="img"` con `aria-label` completo en cada visualización.
- Un solo `<h1>` por página; el `<main>` lo aporta el `AppLayout` (§16).

### Debilidades específicas registradas

| Dirección | Debilidad |
|---|---|
| D02 | 19 nodos en el orden de tabulación; el mapa no tiene alternativa textual completa |
| D06 | 21 enlaces con texto visible solo al pasar por encima: correcto para lector de pantalla, mudo para quien mira |
| D08 | 40 marcas enlazadas en desktop: orden de tabulación muy largo |
| D05 | Depende de verde/rojo; mitigado con los signos `+`/`−`, pero conviene probarlo con simulación de daltonismo |

**Del ganador:** solo 10 elementos interactivos, etiqueta textual de severidad,
contraste 16,91:1 y una columna de texto. Es de las mejores de las diez sin
haber sacrificado nada visualmente.

---

## 11. Performance

| | nodos | superficies | Comentario |
|---|---:|---:|---|
| **D09 Marcador** | **74** | **1** | El más barato. Solo tipografía |
| **D07 Telemetría** | **105** | **3** | Texto y sangrías. Sin gráficos ni SVG de datos |
| D06 Pila | 124 | 39 | Las «superficies» son las 21 placas: visualización, no cajas |
| D10 Banco | 137 | 12 | El resaltado de sintaxis tiene coste real (D009, medir en T094) |
| D08 Cinta | 164 | 4 | 40 marcas posicionadas en absoluto |
| D05 Diff | 168 | 14 | Barato; el árbol filtra en cliente |
| D02 Constelación | 176 | 5 | SVG con 19 nodos + retícula CSS. Crece mal con el catálogo |
| D01 Registro | 194 | 8 | Tabla real; la reescritura móvil es solo CSS |
| D04 Índice | 252 | 3 | Muchos nodos, casi ninguna superficie: listas |
| D03 Estación | 280 | 10 | Los medidores son 20 `<span>` × 8 = 160 nodos solo en meters |

**Riesgos de crecimiento.** D02 (grafo) y D06 (pila) son **O(conceptos)**: con
Fase 3 y 10 tecnologías dejan de funcionar sin virtualizar. D03 lo es en los
medidores. D07, D04 y D09 crecen linealmente en texto, que es el crecimiento
más barato posible.

**Del ganador (híbrido):** 105 nodos + el bloque de código. El único coste
notable es highlight.js, ya previsto y medido en T094 (D009). Cabe en los 900 px
de §11 sin excepción de layout.

---

## 12. Implementation Handoff

> **T055 no está desbloqueada.** El roadmap va por T016 y el Dashboard depende
> de contenido, repositorios, contextos y motor. Esto es el material para que,
> cuando llegue, no haya que reconstruir la intención de diseño.

### 12.1 Dirección seleccionada

`Diagnóstico con pieza` = **D07 · Telemetría** (estructura, color, jerarquía) +
**D10 · Banco** (la pieza de código como evidencia) + la marca textual de estado
de **D04** + el registro de asientos de **D01**. Racional en §7.

### 12.2 Estructura e IA

Orden fijo, una columna, dentro de los 900 px del `AppLayout`:

1. Cabecera de ejecución (tecnología, intentos analizados, fecha)
2. **Veredicto** con etiqueta de severidad + párrafo de interpretación
3. **La pieza**: código del primer step de la sesión recomendada, con las líneas
   falladas marcadas, la frase que las señala y el CTA
4. **Hallazgos** agrupados por carpeta, con severidad textual
5. **Resumen** tipo test runner
6. **Registro**: últimos 5 asientos con su Δ dominio
7. **Progreso** en una línea, al pie

### 12.3 Componentes

En `src/features/dashboard/components/`, respetando los nombres de §16:

| Componente | Responsabilidad | §16 |
|---|---|---|
| `DiagnosisVerdict` | Severidad + frase + interpretación | *(nuevo)* |
| `EvidencePiece` | Pieza de código con líneas marcadas + CTA. Alterna con `ResumeSession` | *(nuevo)* |
| `ResumeSession` | Reanudación desde `sessionStorage` (§21) | *(nuevo)* |
| `FindingsList` | Hallazgos agrupados por topic con severidad | `WeakConcepts.tsx` |
| `RunSummary` | Recuento por severidad + tipos de error | `ProgressOverview.tsx` |
| `SessionLedger` | Últimos asientos con Δ dominio | `RecentActivity.tsx` |
| `ProgressFootline` | El progreso en una línea | `ProgressOverview.tsx` |

Reutiliza `CodeBlock`, `DifficultyBadge`, `EmptyState` y `ErrorBoundary`.

### 12.4 Datos

Todo derivable; ninguna entidad nueva:

```
DiagnosisVerdict   agrupar ConceptProgress[].recentErrors por errorType
                   → tipo dominante → copy de tabla (ESCRITO, no generado)
EvidencePiece      recomendación (domain asc, desempate lastPracticed/errores)
                   + IContentRepository → sesión → steps[0].code
                   + Attempt[] de ese concepto → líneas falladas
FindingsList       ConceptProgress agrupado por topicId; severidad por umbral
                   de domain + presencia de recentErrors
RunSummary         recuento por severidad + errorType agregado
SessionLedger      CompletedSession[] desc, top 5, + DomainImpact
ProgressFootline   media de domain, precisión global, totales
ResumeSession      sessionStorage['codegym:session'] (§21)
```

### 12.5 Tokens: qué exigiría esta dirección

⚠ **Esta es la decisión más importante del handoff.** La dirección ganadora
**no usa la paleta actual tal cual**:

| Necesita | Hoy | Coste |
|---|---|---|
| Fondo **negro neutro** `#0a0a0a` | `--bg-primary` `#0a0a0f` (azulado) | Mínimo: 5 puntos de diferencia. Podría adoptarse `#0a0a0f` sin daño visible |
| **Ningún color de marca** en la página | `--accent` / `--accent-text` existen y se usan | **No es un cambio de token: es una regla de uso.** El dashboard simplemente no consume `text-primary` ni `bg-primary` |
| Escala de **severidad** como color principal | `--success`, `--warning`, `--error` ya existen | Ninguno. Ya están en §12 |
| `--accent-ink` sobre severidad | No existe equivalente | Un token nuevo por severidad, o usar `--bg-primary` como texto sobre las tres |

**Conclusión: la dirección ganadora es adoptable sin tocar `index.css`.**
Basta con que el Dashboard no consuma las utilidades de marca y sí las de
estado. Eso la hace, además, la menos disruptiva de las diez.

Las que **sí** exigirían cambiar tokens: D01 (paleta clara completa, contradice
§10 y §4), D02 (teal nuevo), D03 (ámbar como acento principal), D06 (naranja
nuevo), D08 (ámbar cálido), D09 (fondo de tono medio nuevo).

### 12.6 Estados

| Estado | Comportamiento |
|---|---|
| `loading` | Skeletons con la silueta del veredicto y los grupos. `aria-busy` + `aria-live` |
| `empty` | Severidad `SIN DATOS`. Sin hallazgos, sin pieza, sin registro. Explica qué es el panel y ofrece la primera sesión |
| `early` (<10 sesiones) | Severidad `AVISO` + «muestra insuficiente para diagnosticar». **No se inventa un veredicto.** La pieza sigue apareciendo, pero como continuación, no como corrección |
| `full` | Completo |
| `pending` | `ResumeSession` **sustituye** a `EvidencePiece`. Nunca los dos |
| `error` | Severidad de la propia carga; los hallazgos disponibles se muestran indicando qué falta |
| sin actividad reciente | El registro se omite entero |

### 12.7 Accesibilidad exigida

- Severidad **siempre con etiqueta textual**, nunca solo color.
- El bloque de código con `overflow-x: auto` propio (§11); el `body` nunca.
- Las líneas marcadas se distinguen además con un indicador de borde
  (`box-shadow: inset`), no solo con fondo.
- Un `<h1>` visible; cada bloque es `<section aria-labelledby>`.
- Objetivos táctiles ≥44 px. En la pieza, el enlace ocupa la altura de la línea.
- Contraste verificado: fg 16,91:1 · dim 7,04:1 · severidades 6,62–10,83:1.

### 12.8 Decisiones pendientes

| # | Decisión | Quién |
|---|---|---|
| 1 | ¿Se muestra la **racha**? Derivable, pero §4/§23 la excluyen. Requiere ADR | Producto |
| 2 | ¿Quién escribe el **copy del veredicto** por combinación de error dominante? Es contenido, no código | Producto |
| 3 | ¿El veredicto puede ser **positivo** (`OK`) o siempre señala un problema? | Producto |
| 4 | ¿Se carga el **primer step** de la sesión recomendada en el dashboard? Implica una petición de contenido extra | Arquitectura |
| 5 | ¿Se registra como ADR que la recomendación es **ordenación determinista**, no SRS? Recomendado: sí | Arquitectura |
| 6 | ¿Alguna dirección descartada se recicla en otra página? **D01** encaja en un histórico completo, **D02** en `TechnologyPage` (T056), **D05** en `ResultsPage` (T058), **D08** en `ReviewPage` (T060) | Producto |

### 12.9 Lo que esta fase NO ha hecho

No se ha modificado `src/`, `package.json`, el router, ningún componente, token
o tipo. No se han instalado dependencias. No se ha alterado el Master Plan ni
`DECISIONS.md`. No se ha creado ninguna ruta. No existe `DashboardPage` real.
No se ha iniciado T016.

**La exploración termina aquí. La decisión es del usuario.**

---

*Diez direcciones generadas con `ui-design-exploration`; motion evaluado con
`animation-performance-engineering`. Prototipos verificados en Chromium:
10 × 5 breakpoints × 3 estados, sin desbordamiento, sin objetivos táctiles por
debajo de 44 px y con las diez paletas cumpliendo WCAG 2.1 AA.*
