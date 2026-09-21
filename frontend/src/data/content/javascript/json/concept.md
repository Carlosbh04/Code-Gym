# JSON

Serialización y parseo de datos, límites del formato y manejo seguro de entradas inválidas.

## Fundamentos

- **JSON.parse**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **JSON.stringify**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **JSON frente a objeto**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const texto = JSON.stringify({ activo: true });
console.log(JSON.parse(texto).activo);
```

Error frecuente: Conceptual: un texto JSON debe parsearse antes de leer sus propiedades.

## Profundización

- **JSON válido e inválido**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **errores de parseo**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **try/catch**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
try { JSON.parse('{mal}'); } catch { console.log('inválido'); }
```

Error frecuente: Conceptual: JSON exige comillas dobles para claves y strings.

## Dominio

- **limitaciones**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **undefined**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **funciones**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **fechas**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **copias profundas**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const texto = JSON.stringify({ a: 1, b: undefined });
console.log(texto);
```

Error frecuente: Conceptual: serializar no preserva Date ni todos los tipos de JavaScript.
