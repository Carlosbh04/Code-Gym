# ES6+: extraer, agrupar y conservar valores válidos

El destructuring extrae datos según la forma del valor: usa corchetes para un
array y llaves para un objeto. Los parámetros rest agrupan los argumentos que
sobra en un array y deben ir al final de la lista de parámetros.

```js
const [primero] = ['uno', 'dos'];
const { nombre = 'Invitado' } = { nombre: 'Ada' };

function sumar(...numeros) {
  return numeros.reduce((total, numero) => total + numero, 0);
}
```

`||` reemplaza cualquier valor falsy, como una cadena vacía o `0`. Cuando solo
quieres cubrir `null` y `undefined`, usa `??`. Combínalo con `?.` al leer una
propiedad que puede no existir para evitar acceder a una rama ausente.
