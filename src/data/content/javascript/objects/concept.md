# Objects: propiedades y referencias

Un objeto guarda propiedades bajo claves. Dos variables pueden señalar el mismo
objeto: cambiarlo desde una cambia lo que ve la otra. El spread crea un objeto
nuevo solo en el primer nivel; los objetos anidados siguen compartiendo referencia.

```js
const original = { perfil: { nombre: 'Ada' } };
const copia = { ...original };
copia.perfil.nombre = 'Lin';
console.log(original.perfil.nombre); // Lin
```

Usa corchetes cuando la clave está en una variable y crea copias explícitas de
cada nivel que vayas a actualizar.
