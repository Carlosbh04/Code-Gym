Una función tiene tres puntos donde las cosas se tuercen en silencio: lo que
entra por los parámetros, dónde viven sus variables y qué devuelve al salir.
Ninguno de los tres lanza un error cuando te equivocas; simplemente devuelven
algo distinto de lo que esperabas.

## Parámetros por defecto

El valor por defecto se aplica **solo si el argumento es `undefined`**. No se
aplica con `null`, `0`, `''` ni `false`, porque son valores legítimos.

```js
function precioFinal(base, descuento = 10) {
  return base - descuento;
}

precioFinal(100);            // 90  — no se pasó descuento
precioFinal(100, 0);         // 100 — 0 es un valor, no una ausencia
precioFinal(100, undefined); // 90  — undefined sí activa el defecto
```

Por eso `x = x || valor` no es equivalente a un parámetro por defecto: `||`
descarta cualquier valor falsy, incluidos `0`, `''` y `false`.

```js
function crearPedido(producto, cantidad) {
  cantidad = cantidad || 1; // pedir 0 unidades pasa a ser 1
  return { producto, cantidad };
}
```

## Ámbito y hoisting

Las declaraciones de función se elevan completas: puedes llamarlas antes de
escribirlas. `let` y `const` también se elevan, pero quedan en la *zona muerta
temporal* hasta su línea de declaración, y acceder a ellas antes lanza
`ReferenceError` — incluso con `typeof`.

```js
declarada();                    // funciona
console.log(typeof expresada);  // ReferenceError

function declarada() {}
const expresada = function () {};
```

`var` es de ámbito de función y escapa de los bloques; `let` y `const` son de
ámbito de bloque y no existen fuera de él.

```js
function procesar() {
  if (true) {
    var suelta = 'var';
    let atada = 'let';
  }
  console.log(suelta);       // 'var'
  console.log(typeof atada); // 'undefined' — nunca existió aquí fuera
}
```

Declarar dentro de un `if` una variable que necesitas después del `if` es el
error de ámbito más común.

## Retorno y flujo

Una función que termina sin ejecutar ningún `return` devuelve `undefined`. No
avisa.

```js
function clasificar(edad) {
  if (edad >= 18) {
    'adulto'; // se evalúa y se tira
  } else {
    return 'menor';
  }
}

clasificar(20); // undefined
```

Cuidado también con el salto de línea después de `return`: JavaScript inserta
un punto y coma automáticamente y devuelve `undefined`.

```js
function crearRespuesta() {
  return
  {
    ok: true
  };
}

crearRespuesta(); // undefined
```

Y un `return` colocado demasiado pronto corta el resto del trabajo: si sales de
la función al detectar el primer problema, nunca comprobarás los siguientes.

## Cómo revisarlas

1. ¿Qué pasa si el argumento vale `0`, `''` o `null`?
2. ¿Está cada variable declarada en el ámbito donde se usa?
3. ¿Hay algún camino de ejecución que termine sin `return`?
