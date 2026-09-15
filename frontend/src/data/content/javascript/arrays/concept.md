Los métodos de iteración de arrays recorren una colección y, según cuál elijas,
devuelven un valor distinto o ninguno. Elegir mal no da un error: da un
resultado silenciosamente incorrecto. Por eso conviene tener claro qué devuelve
cada uno antes de encadenarlos.

## Qué devuelve cada método

| Método | Devuelve | Úsalo para |
|---|---|---|
| `forEach` | `undefined` | producir un efecto (imprimir, guardar) |
| `map` | un array nuevo del mismo tamaño | transformar cada elemento |
| `filter` | un array nuevo, igual o más corto | seleccionar un subconjunto |
| `reduce` | un único valor de cualquier tipo | combinar la colección en un resultado |

## forEach no devuelve nada

El valor que retorna el callback de `forEach` se descarta. Si esperas recoger un
resultado, obtendrás `undefined`.

```js
const precios = [10, 25, 40];

const conIva = precios.forEach((p) => p * 1.21);
console.log(conIva); // undefined

const correcto = precios.map((p) => p * 1.21);
console.log(correcto); // [12.1, 30.25, 48.4]
```

## map y filter no mutan el array original

Ambos construyen un array nuevo y dejan intacto el original.

```js
const nombres = ['ana', 'luis'];
const mayus = nombres.map((n) => n.toUpperCase());

console.log(nombres); // ['ana', 'luis']
console.log(mayus);   // ['ANA', 'LUIS']
```

Ojo: el array es nuevo, pero **los elementos son los mismos**. Si contiene
objetos, ambos arrays apuntan a los mismos objetos. Mutar uno dentro del
callback afecta también al original:

```js
const usuarios = [{ nombre: 'Ana', activo: false }];

usuarios.filter((u) => (u.activo = true)); // = asigna, no compara

console.log(usuarios[0].activo); // true — el objeto ha sido mutado
```

El callback de `filter` debe limitarse a responder sí o no. Si además escribe,
el método deja de ser predecible.

## reduce arrastra un acumulador

`reduce` recibe una función que combina el acumulador con el elemento actual, y
**debe devolver el acumulador**. Si el callback usa cuerpo de bloque y olvidas
el `return`, el acumulador pasa a ser `undefined` en la siguiente vuelta.

```js
const carrito = [
  { producto: 'teclado', precio: 45 },
  { producto: 'raton', precio: 20 },
];

const mal = carrito.reduce((acc, item) => {
  acc + item.precio; // no devuelve nada
}, 0);
console.log(mal); // undefined

const bien = carrito.reduce((acc, item) => acc + item.precio, 0);
console.log(bien); // 65
```

El segundo argumento es el valor inicial. Omitirlo sobre un array vacío lanza
`TypeError: Reduce of empty array with no initial value`, así que conviene
darlo siempre que el resultado no sea del mismo tipo que los elementos.

## Cómo elegir

1. ¿Necesito un valor de vuelta? Si no, `forEach`.
2. ¿Un elemento por cada elemento? `map`.
3. ¿Los mismos elementos, pero menos? `filter`.
4. ¿Un solo resultado a partir de todos? `reduce`.
