# Browser JavaScript

DOM, eventos, formularios, almacenamiento y fetch para conectar JavaScript con una interfaz web.

## Fundamentos

- **DOM**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **querySelector**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **querySelectorAll**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **textContent**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **attributes**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **classList**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const titulo = document.querySelector('h1');
titulo.textContent = 'Hola';
```

Error frecuente: Conceptual: querySelectorAll devuelve una colección; hay que recorrer sus elementos.

## Profundización

- **createElement**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **append**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **remove**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **events**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **addEventListener**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **event object**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
const boton = document.querySelector('button');
boton.addEventListener('click', (event) => console.log(event.type));
```

Error frecuente: Conceptual: addEventListener recibe la función, no el resultado de invocarla.

## Dominio

- **preventDefault**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **forms**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **dataset**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **localStorage**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **sessionStorage**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.
- **fetch**: se estudia con ejemplos ejecutables, casos límite y decisiones explícitas.

```js
form.addEventListener('submit', e => { e.preventDefault(); console.log(form.dataset.mode); });
```

Error frecuente: Conceptual: fetch y response.json devuelven Promises que deben esperarse.
