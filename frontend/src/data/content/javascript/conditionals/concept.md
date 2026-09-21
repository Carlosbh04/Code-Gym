# Conditionals

Decisiones con if, switch, ternarios y condiciones compuestas que preservan casos límite.

## Fundamentos

- **if**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **else**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **else if**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **booleanos**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const edad = 20;
console.log(edad >= 18 ? 'adulto' : 'menor');
```

Error frecuente: Conceptual: la condición asigna true en lugar de comparar.

## Profundización

- **truthy y falsy**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **condiciones compuestas**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **short-circuit**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const nombre = '';
console.log(nombre || 'Invitado');
```

Error frecuente: Conceptual: comprobar truthiness omite el valor válido 0.

## Dominio

- **switch**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **fall-through**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **ternario**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **guard clauses**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const rol = 'editor';
console.log(rol === 'admin' ? 'total' : 'limitado');
```

Error frecuente: Conceptual: falta break y el switch continúa hacia default.
