# Strings

Lectura, búsqueda, transformación y composición de texto entendiendo su inmutabilidad.

## Fundamentos

- **length**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **indexación**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **inmutabilidad**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **slice**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **substring**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const texto = 'JavaScript';
console.log(texto[0], texto.slice(4));
```

Error frecuente: Conceptual: los strings son inmutables; una posición no puede reescribirse.

## Profundización

- **includes**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **startsWith**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **endsWith**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **indexOf**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **replace**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **replaceAll**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const ruta = '/api/users';
console.log(ruta.startsWith('/api'), ruta.includes('users'));
```

Error frecuente: Conceptual: replace cambia solo la primera coincidencia; aquí hace falta replaceAll.

## Dominio

- **split**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **trim**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **mayúsculas/minúsculas**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **template literals**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **parsing y composición**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const partes = ' Ana,JS '.trim().split(',');
console.log(`${partes[0]}:${partes[1].toLowerCase()}`);
```

Error frecuente: Conceptual: falta trim antes de normalizar el texto.
