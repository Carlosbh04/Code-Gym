# Set & Map

Colecciones para unicidad y asociaciones con claves de cualquier tipo.

## Fundamentos

- **Set.add**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **Set.has**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **Set.delete**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **size**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const ids = new Set([1, 1, 2]);
ids.add(3);
console.log(ids.size, ids.has(2));
```

Error frecuente: Conceptual: Set expone size, no length.

## Profundización

- **deduplicación**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **iteración de Set**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **Map.set**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **Map.get**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const unicos = [...new Set(['a', 'a', 'b'])];
console.log(unicos.join(','));
```

Error frecuente: Conceptual: Map se escribe con set y se lee con get.

## Dominio

- **Map.has**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **delete**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **keys**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **values**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **entries**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **Map frente a Object**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const mapa = new Map([['a', 1], ['b', 2]]);
console.log([...mapa.values()].join(','));
```

Error frecuente: Conceptual: Object convierte la clave a string; Map conserva la identidad del objeto.
