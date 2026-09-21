# Scope

Ámbitos global, de función y de bloque; resolución léxica, hoisting, TDZ y shadowing.

## Fundamentos

- **ámbito global**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **ámbito de función**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **ámbito de bloque**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **let y const**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const fuera = 2;
function leer() { const dentro = 3; return fuera + dentro; }
console.log(leer());
```

Error frecuente: Conceptual: mensaje pertenece al bloque y no existe fuera de él.

## Profundización

- **ámbito léxico**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **shadowing**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **TDZ**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **hoisting**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
let valor = 1;
function leer() { let valor = 2; return valor; }
console.log(leer(), valor);
```

Error frecuente: Conceptual: el binding interior está en TDZ y oculta al exterior.

## Dominio

- **var vs let vs const**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **bindings por iteración**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **diseño de estado**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const tareas = [];
for (let i = 0; i < 2; i++) tareas.push(() => i);
console.log(tareas[0](), tareas[1]());
```

Error frecuente: Conceptual: var comparte un único binding entre las funciones creadas.
