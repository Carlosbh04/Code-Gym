Una función creada dentro de otra recuerda las variables del sitio donde
nació, incluso después de que la función de fuera haya terminado. Esa memoria
es el closure. No guarda una copia de los valores: guarda el acceso a las
variables, y esa diferencia explica casi todos sus errores.

## El closure recuerda la variable, no el valor

```js
function crearSaludo(nombre) {
  return function saludar() {
    return `Hola, ${nombre}`;
  };
}

const saludarAna = crearSaludo('Ana');
console.log(saludarAna()); // "Hola, Ana"
```

`saludar` se ejecuta cuando `crearSaludo` ya terminó, y sigue viendo `nombre`.
Pero lo que recuerda es la variable, no una foto del valor: si algo la cambia
antes de la llamada, la función ve el valor nuevo.

```js
let tema = 'claro';

function crearPanel() {
  return function render() {
    return `panel en ${tema}`;
  };
}

const panel = crearPanel();
tema = 'oscuro';

console.log(panel()); // "panel en oscuro" — no "claro"
```

Si necesitas congelar el valor del momento de creación, cópialo a una variable
local que nadie vuelva a asignar:

```js
function crearPanel() {
  const temaAlCrear = tema; // copia inmutable del valor de hoy
  return function render() {
    return `panel en ${temaAlCrear}`;
  };
}
```

## Dónde declares la variable decide quién la comparte

Todas las funciones creadas en la misma llamada comparten las mismas variables.
Las funciones nacidas de llamadas distintas, no.

```js
function crearContador() {
  let cuenta = 0; // uno nuevo en cada llamada a crearContador
  return function incrementar() {
    cuenta += 1;
    return cuenta;
  };
}

const a = crearContador();
const b = crearContador();

a();
a();
console.log(a()); // 3
console.log(b()); // 1 — cada closure tiene su propia cuenta
```

Si `cuenta` se declara fuera de `crearContador`, todos los contadores pasan a
compartir la misma: el estado deja de ser de cada contador y pasa a ser global.
Es el error más caro de detectar, porque cada función funciona perfectamente
de forma aislada.

## var en un bucle: un closure para todo el bucle

`var` es de ámbito de función: el `i` de un bucle es una única variable para
todas las vueltas. Cada función creada dentro del bucle cierra sobre la misma,
y cuando el bucle termina esa variable vale el primer valor que rompe la
condición.

```js
const funciones = [];

for (var i = 0; i < 3; i++) {
  funciones.push(function () { return i; });
}

console.log(funciones.map((f) => f())); // [3, 3, 3]
```

`let` es de ámbito de bloque y crea un `i` nuevo en cada vuelta, así que cada
función captura el suyo:

```js
const funciones = [];

for (let i = 0; i < 3; i++) {
  funciones.push(function () { return i; });
}

console.log(funciones.map((f) => f())); // [0, 1, 2]
```

Con `setTimeout` el efecto es el mismo, solo que se ve mejor: cuando los
temporizadores disparan, el bucle lleva rato terminado y la variable compartida
ya tiene su valor final.

## El estado privado vive en el closure

Las variables capturadas no son accesibles desde fuera: solo las ven las
funciones que las capturaron. Es la forma más simple de estado privado.

```js
function crearBilletera(saldoInicial) {
  let saldo = saldoInicial; // inaccesible desde fuera
  return {
    ingresar(cantidad) {
      saldo += cantidad;
      return saldo;
    },
  };
}

const billetera = crearBilletera(100);
billetera.ingresar(50); // 150
console.log(billetera.saldo); // undefined
```

Nada de `saldo` vive en el objeto devuelto: vive en el closure. Los métodos
funcionan aunque los saques del objeto, porque dependen de la variable
capturada, no de `this`.

## Cómo revisarlos

1. ¿La función interna lee una variable de fuera? Localiza dónde se declara.
2. ¿Quieres el valor del momento de creación o el vivo? El segundo exige una
   copia a una constante local.
3. ¿Dos funciones creadas por llamadas distintas comparten estado? Solo si la
   variable vive fuera de la función que las crea.
4. ¿Un bucle crea funciones? Si el índice se declara con `var`, todas comparten
   el mismo.
