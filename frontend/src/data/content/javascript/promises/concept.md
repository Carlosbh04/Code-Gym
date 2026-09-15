# Promises: valores que llegan después

Una `Promise` representa un resultado que todavía no está disponible. Encadenar
con `then` transforma el valor resuelto; devolver otra promesa hace que la
siguiente etapa espere. `catch` recibe los errores que ocurran antes en la
cadena.

```js
Promise.resolve(4)
  .then((value) => value * 2)
  .then(console.log); // 8
```

Dentro de una función `async`, `await` pausa solo esa función hasta que la
promesa termine. Sin `await`, se usa la promesa misma, no su resultado.

```js
async function leerNombre() {
  const nombre = await Promise.resolve('Ada');
  return nombre.toUpperCase();
}
```

Los errores viajan por la cadena hasta un `catch`. Recuperarlos allí permite
devolver un valor alternativo; ocultarlos sin explicarlos hace más difícil
detectar qué operación falló.
