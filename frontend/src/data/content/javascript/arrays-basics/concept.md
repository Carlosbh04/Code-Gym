# Arrays Basics

Creación, acceso, mutación y copia de arrays antes de aplicar métodos de iteración.

## Fundamentos

- **creación**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **índices**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **lectura y escritura**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **length**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **push**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **pop**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const items = ['a'];
items.push('b');
console.log(items.length, items[1]);
```

Error frecuente: Conceptual: el último índice es length - 1, no length.

## Profundización

- **shift**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **unshift**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **slice**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **splice**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **includes**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **indexOf**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const items = ['a', 'b', 'c'];
console.log(items.slice(1).join('-'));
```

Error frecuente: Conceptual: splice muta el origen; para copiar corresponde slice o spread.

## Dominio

- **concat**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **spread**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **copias**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **mutación**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **referencias**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **arrays anidados**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const base = [1, 2];
const copia = [...base, 3];
console.log(base.length, copia.length);
```

Error frecuente: Conceptual: spread hace copia superficial y conserva los arrays anidados compartidos.
