# Event Loop

Orden de ejecución entre stack, APIs del runtime, tareas, microtareas y continuaciones async.

## Fundamentos

- **call stack**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **runtime/Web APIs**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **task queue**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
console.log('A');
setTimeout(() => console.log('B'), 0);
console.log('C');
```

Error frecuente: Conceptual: setTimeout agenda una tarea; el log síncrono ocurre antes.

## Profundización

- **microtasks**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **Promise scheduling**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **setTimeout**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
console.log('A');
Promise.resolve().then(() => console.log('B'));
setTimeout(() => console.log('C'), 0);
```

Error frecuente: Conceptual: la microtarea de Promise se procesa antes que la siguiente tarea.

## Dominio

- **orden de ejecución**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **async/await scheduling**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **starvation**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
async function f(){ console.log('A'); await 0; console.log('C'); }
f(); console.log('B');
```

Error frecuente: Conceptual: una función async devuelve Promise y hay que esperar su valor.
