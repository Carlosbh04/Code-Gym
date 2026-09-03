# Errors: señales explícitas de que algo no pudo completarse

Un error representa un camino excepcional: `throw` interrumpe la ejecución y
`try/catch` permite decidir cómo recuperar o propagar el fallo. Capturarlo no
obliga a ocultarlo: un `catch` puede añadir contexto y volver a lanzar el error.

```js
function leerId(valor) {
  if (typeof valor !== 'number') throw new TypeError('id inválido');
  return valor;
}
```

No uses valores normales como `null` o cadenas de éxito para disfrazar un error
si el llamador necesita distinguir una respuesta válida de un fallo.
