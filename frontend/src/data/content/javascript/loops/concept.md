# Loops

Bucles, contadores, acumuladores y patrones de búsqueda con límites correctos.

## Fundamentos

- **for**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **while**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **do...while**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **contadores**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
let total = 0;
for (let i = 1; i <= 3; i++) total += i;
console.log(total);
```

Error frecuente: Conceptual: el límite <= produce una iteración fuera del array.

## Profundización

- **for...of**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **for...in**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **break**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **continue**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **acumuladores**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
let total = 0;
for (const n of [1, 2, 3]) { if (n === 2) continue; total += n; }
console.log(total);
```

Error frecuente: Conceptual: for...in entrega índices string, no los valores del array.

## Dominio

- **bucles anidados**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **búsqueda**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **off-by-one**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **bucles infinitos**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **elegir el bucle**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
outer: for (const fila of [[1,2],[3,4]]) { for (const n of fila) if (n === 3) { console.log(n); break outer; } }
```

Error frecuente: Conceptual: el contador no avanza y el while se vuelve infinito.
