# Modules

Exportaciones, importaciones, aliases, ámbito de módulo y dependencias explícitas.

## Fundamentos

- **export**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **import**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **exportaciones nombradas**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
// math.js
export const doble = n => n * 2;
// app.js
import { doble } from './math.js';
```

Error frecuente: Conceptual: suma es una exportación nombrada y debe importarse entre llaves.

## Profundización

- **default export**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **aliases**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **reexportación**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
import formatear, { version as apiVersion } from './format.js';
```

Error frecuente: Conceptual: un módulo solo puede tener una exportación default.

## Dominio

- **ámbito de módulo**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **dependencias**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **ciclos**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **efectos laterales**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
// config.js
const secreto = 3;
export const publico = 4;
```

Error frecuente: Conceptual: la dependencia circular puede observar bindings antes de inicializarse.
