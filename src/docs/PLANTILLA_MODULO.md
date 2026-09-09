# Plantilla para módulos nuevos — INVENTA

Módulo de referencia: **categorías** (`src/modules/catalogo/`)  
Copia ese módulo, renombra los archivos y reemplaza `categoria`/`Categoria` por tu recurso.

---

## 1. Estructura de archivos

```
src/modules/<modulo>/
  models/
    <recurso>.model.js          ← ya existe (no tocar)
  services/
    <recurso>.service.js        ← 1.er archivo que se escribe
  controllers/
    <recurso>.controller.js     ← 2.o
  validators/
    <recurso>.validator.js      ← 3.o
  routes/
    <recurso>.route.js          ← 4.o (último)
```

El `routes.loader.js` detecta automáticamente cualquier `*.route.js` o `*.routes.js`
dentro de `routes/`. No hay que editar `server.js` ni `app.js`.

---

## 2. Orden de escritura recomendado

### Paso 1 — Servicio (`<recurso>.service.js`)

Empieza aquí porque es el corazón: toda la lógica de negocio, sin Express.

```js
"use strict";
const { Op }              = require("sequelize");
const db                  = require("../../../loaders/models.loader");
const AppError            = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

const SORTABLES = ["nombre", "created_at"];  // columnas permitidas en ?sort=

const listar = async (query) => { /* ... */ };
const obtener = async (id)   => { /* ... */ };
const crear   = async (datos) => { /* ... */ };
const actualizar = async (id, datos) => { /* ... */ };
const desactivar = async (id) => { /* ... */ };  // baja lógica, nunca DELETE físico

module.exports = { listar, obtener, crear, actualizar, desactivar };
```

Reglas del servicio:
- Lanza `AppError.noEncontrado("Recurso")` cuando no existe → 404
- Lanza `AppError.reglaNegocio("mensaje", ["detalles"])` para violaciones → 422
- **No hagas `catch`**: deja que `asyncHandler` y `errorHandler` manejen los errores
- Los errores de unicidad (UNIQUE de BD) los captura automáticamente el `errorHandler` → 409

### Paso 2 — Controlador (`<recurso>.controller.js`)

Solo traduce `req` → servicio → `res`. Sin lógica, sin `try/catch`.

```js
"use strict";
const db           = require("../../../loaders/models.loader");
const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const MiServicio   = require("../services/<recurso>.service");

const listar    = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await MiServicio.listar(req.query);
  paginado(res, rows, count, page, limit);
});
const obtener   = asyncHandler(async (req, res) => { ok(res,        await MiServicio.obtener(req.params.id)); });
const crear     = asyncHandler(async (req, res) => { creado(res,    await MiServicio.crear(req.body)); });
const actualizar= asyncHandler(async (req, res) => { ok(res,        await MiServicio.actualizar(req.params.id, req.body)); });
const desactivar= asyncHandler(async (req, res) => { await MiServicio.desactivar(req.params.id); sinContenido(res); });

module.exports = { listar, obtener, crear, actualizar, desactivar };
```

### Paso 3 — Validador (`<recurso>.validator.js`)

```js
"use strict";
const { body, param } = require("express-validator");

const crearValidator = [
  body("nombre").trim().notEmpty().withMessage("El nombre es obligatorio")
                .isLength({ max: 80 }).withMessage("Máximo 80 caracteres"),
  // campos opcionales:
  body("campo_opcional").optional({ nullable: true }).isLength({ max: 250 }),
  body("fk_id").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
];

const actualizarValidator = [
  param("id").isInt({ min: 1 }).toInt(),
  // Todos los body fields son .optional() en actualizar
];

module.exports = { crearValidator, actualizarValidator };
```

### Paso 4 — Rutas (`<recurso>.route.js`)

```js
"use strict";
module.exports = (app) => {
  const controlador = require("../controllers/<recurso>.controller.js");
  const router      = require("express").Router();
  const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
  const validar     = require("../../../core/middlewares/validar");
  const { crearValidator, actualizarValidator } = require("../validators/<recurso>.validator");

  // Rutas públicas (si aplica)
  router.get("/",    controlador.listar);
  router.get("/:id", controlador.obtener);

  // Rutas protegidas
  router.post(  "/",    verifyToken, onlyApp("interno"), hasRole("ADMIN","GERENTE"), crearValidator,     validar, controlador.crear);
  router.put(   "/:id", verifyToken, onlyApp("interno"), hasRole("ADMIN","GERENTE"), actualizarValidator, validar, controlador.actualizar);
  router.delete("/:id", verifyToken, onlyApp("interno"), hasRole("ADMIN"),                                        controlador.desactivar);

  app.use("/api/<plural>", router);  // ← ajustar el prefijo según API.md
};
```

---

## 3. Helpers disponibles — no reinventar la rueda

| Archivo | Qué hace | Ejemplo de uso |
|---------|----------|----------------|
| `respuesta.js` | Construye el JSON de éxito | `ok(res, obj)` · `creado(res, obj)` · `paginado(res, rows, total, page, limit)` · `sinContenido(res)` |
| `AppError.js` | Errores operacionales tipados | `throw AppError.noEncontrado("Producto")` → 404 |
| `AppError.reglaNegocio` | Regla de negocio violada | `throw AppError.reglaNegocio("msg", ["detalle"])` → 422 |
| `AppError.conflicto` | Duplicado manual (raro) | `throw AppError.conflicto("Ya existe")` → 409 |
| `asyncHandler` | Elimina try/catch en controladores | `asyncHandler(async (req,res) => { ... })` |
| `parsearPaginacion` | Lee page/limit/sort/order del query | `const { limit, offset, order, page } = parsearPaginacion(req.query, SORTABLES)` |
| `validar` (middleware) | Evalúa express-validator y responde 400 | Poner después de los checks en la ruta |
| `verifyToken` | Verifica JWT → `req.usuario` | Primer middleware en rutas protegidas |
| `hasRole(...)` | Restringe por perfil | `hasRole("ADMIN","GERENTE")` |
| `onlyApp(app)` | Restringe por aplicación | `onlyApp("interno")` |

---

## 4. Prohibiciones — lo que NO se debe hacer

### ❌ Lógica de negocio en el controlador
```js
// MAL: la verificación de duplicado va en el servicio o la deja el errorHandler
const crear = asyncHandler(async (req, res) => {
  const existe = await db.categoria.findOne({ where: { nombre: req.body.nombre } });
  if (existe) return res.status(409).json({ error: { mensaje: "Ya existe" } });
  // ...
});
```

### ❌ res.json() directo en el controlador
```js
// MAL: rompe el contrato si alguien cambia el formato de respuesta
res.status(200).json({ data: resultado });

// BIEN: usar los helpers de respuesta.js
ok(res, resultado);
```

### ❌ DELETE físico
```js
// MAL: destruye el historial y rompe FKs de tablas relacionadas
await db.categoria.destroy({ where: { id } });

// BIEN: baja lógica
await categoria.update({ activo: false });
```

### ❌ Validar permisos solo en el frontend
Los middlewares `verifyToken`, `onlyApp` y `hasRole` deben estar en **cada ruta protegida**.
Ocultar botones en el frontend no protege el endpoint: cualquier `curl` los bypasea.

### ❌ Omitir `name:` en el modelo
Sin `name: { singular: "...", plural: "..." }`, Sequelize usa la librería `inflection`
(solo en inglés) para generar el accessor del `include`. Con palabras en español produce
nombres incorrectos (`categorium`, `existencium`) que dan errores crípticos.
Ver `ESQUEMA.md §Convención de asociaciones`.

### ❌ `as:` innecesario
`as:` solo es obligatorio cuando hay dos FKs al mismo modelo (autorreferencia, dos sucursales,
dos usuarios). En el 95 % de los casos, basta con `name:` en el modelo. Ver `ESQUEMA.md`.

---

## 5. Códigos HTTP — resumen rápido

| Código | Cuándo | Helper |
|--------|--------|--------|
| 200 | GET o PUT exitoso | `ok(res, data)` |
| 201 | POST exitoso | `creado(res, data)` |
| 204 | DELETE (baja lógica) | `sinContenido(res)` |
| 400 | Validación de entrada fallida | automático vía `validar` |
| 401 | Sin token o token inválido | automático vía `verifyToken` |
| 403 | Perfil o app sin permiso | automático vía `hasRole` / `onlyApp` |
| 404 | Recurso no existe | `throw AppError.noEncontrado("X")` |
| 409 | Duplicado (UNIQUE) | automático vía `errorHandler` |
| 422 | Regla de negocio violada | `throw AppError.reglaNegocio("msg", [...])` |
| 500 | Error inesperado | automático vía `errorHandler` |
