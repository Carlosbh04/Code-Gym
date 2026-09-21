# Types & Operators

Tipos primitivos, conversiones y operadores para razonar con valores sin depender de coerciones accidentales.

## Fundamentos

- **string**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **number**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **boolean**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **null**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **undefined**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **typeof**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const valor = Number('2') + 3;
console.log(valor);
```

Error frecuente: Conceptual: falta convertir el texto antes de sumar.

## Profundización

- **coerción**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **conversión explícita**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **comparación**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **===**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **!==**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **operadores lógicos**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
console.log(0 === false, Boolean(''));
```

Error frecuente: Conceptual: la comparación laxa aplica coerción; aquí debe usarse ===.

## Dominio

- **bigint**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **symbol**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **asignación**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **incremento**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **precedencia**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **ternario**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **nullish coalescing**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const valor = null ?? 4;
console.log(valor * 2 ** 2);
```

Error frecuente: Conceptual: || descarta el cero válido; corresponde usar ?? para ausencia.
