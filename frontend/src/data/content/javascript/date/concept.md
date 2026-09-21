# Date

Fechas, timestamps, comparaciones, diferencias y la frontera entre hora local y UTC.

## Fundamentos

- **new Date**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **timestamps**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **Date.now**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const fecha = new Date(0);
console.log(fecha.getTime());
```

Error frecuente: Conceptual: la diferencia entre Date se expresa en milisegundos.

## Profundización

- **getters**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **comparaciones**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **diferencias**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const a = new Date('2024-01-01T00:00:00Z');
const b = new Date('2024-01-02T00:00:00Z');
console.log(b > a);
```

Error frecuente: Conceptual: getMonth usa índices desde 0; enero es 0.

## Dominio

- **formato básico**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **local frente a UTC**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **fechas inválidas**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const fecha = new Date('2024-06-01T12:00:00Z');
console.log(fecha.toISOString().startsWith('2024-06-01'));
```

Error frecuente: Conceptual: una fecha inválida se detecta comprobando Number.isNaN(fecha.getTime()).
