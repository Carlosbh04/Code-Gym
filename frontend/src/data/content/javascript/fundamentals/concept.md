Las variables permiten guardar valores bajo un nombre para reutilizarlos y
modificarlos de forma controlada durante la ejecución del programa.

## const

Usa `const` cuando una variable no deba recibir una nueva asignación después
de declararse.

```js
const nombre = "Carlos";
```

La referencia declarada con `const` no puede reasignarse.

## let

Usa `let` cuando el valor necesite cambiar más adelante.

```js
let edad = 25;
edad = 26;
```

En este caso `edad` puede recibir una nueva asignación.

## Regla práctica

Prefiere `const` por defecto y cambia a `let` solamente cuando realmente
necesites reasignar el valor.
