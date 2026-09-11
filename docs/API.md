# Contrato de la API — INVENTA

Versión 1.0 · Base URL: `/api`

---

## 1. Formato de respuesta

Todas las respuestas usan `Content-Type: application/json`.
La convención de nombres es **snake_case** en toda la API, igual que la base de
datos. No se transforma nada a camelCase.

### 1.1 Éxito — recurso único

```json
{
  "data": {
    "id": 1,
    "codigo": "PROD-001",
    "nombre": "Camiseta deportiva",
    "activo": true,
    "created_at": "2026-09-08T14:00:00.000Z"
  }
}
```

### 1.2 Éxito — lista paginada

```json
{
  "data": [
    { "id": 1, "nombre": "Camiseta deportiva" },
    { "id": 2, "nombre": "Pantalón cargo" }
  ],
  "meta": {
    "total": 84,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

### 1.3 Error

```json
{
  "error": {
    "mensaje": "Datos de entrada inválidos",
    "detalles": [
      "codigo: El código es obligatorio",
      "precio_unitario: Debe ser mayor a 0"
    ]
  }
}
```

`detalles` siempre es un arreglo (puede estar vacío `[]`).

### 1.4 Eliminación lógica — 204 sin cuerpo

```
HTTP/1.1 204 No Content
```

---

## 2. Códigos HTTP

| Código | Cuándo usarlo |
|--------|--------------|
| **200** | Consulta exitosa (`GET`) o actualización exitosa (`PUT`/`PATCH`) |
| **201** | Recurso creado (`POST`) |
| **204** | Operación exitosa sin cuerpo de respuesta (baja lógica, acción sin retorno) |
| **400** | Datos mal formados o validación de entrada fallida (campo faltante, tipo incorrecto) |
| **401** | Token ausente, inválido o expirado |
| **403** | Token válido pero el perfil o la app no tiene permiso para esa operación |
| **404** | El recurso solicitado no existe |
| **409** | Conflicto: registro duplicado (unique constraint) o FK referenciada al intentar borrar |
| **422** | Regla de negocio violada: existencia insuficiente, transición de estado inválida, límite de crédito superado |
| **500** | Error interno no controlado — el cliente no recibe detalles internos |

---

## 3. Autenticación

Todos los endpoints (salvo `/api/auth/login` y `/api/auth/registro`) requieren:

```
Authorization: Bearer <token>
```

El JWT contiene:

| Campo | Descripción |
|-------|-------------|
| `id` | ID del usuario |
| `perfil` | `ADMIN`, `GERENTE`, `BODEGUERO`, `VENDEDOR`, `CLIENTE` |
| `sucursal_id` | Sucursal a la que pertenece (null para CLIENTE) |
| `tipo_cliente` | `MINORISTA`, `MAYORISTA` o null (solo para CLIENTE) |
| `app` | `"interno"` o `"tienda"` |

### Separación de sesiones

Un token con `app: "tienda"` es **rechazado con 403** en cualquier endpoint del
portal interno, y viceversa. No hay sesión compartida entre las dos apps.

---

## 4. Paginación

Todos los endpoints de lista aceptan:

| Parámetro | Default | Máximo | Descripción |
|-----------|---------|--------|-------------|
| `page` | `1` | — | Página a devolver |
| `limit` | `20` | `100` | Registros por página |

Ejemplo: `GET /api/productos?page=2&limit=50`

La respuesta siempre incluye el objeto `meta` con `total`, `page`, `limit` y
`pages` (total de páginas calculado).

---

## 5. Filtros y orden

| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| `sort` | Columna por la que ordenar | `?sort=nombre` |
| `order` | `asc` o `desc` (default `asc`) | `?order=desc` |
| `q` | Búsqueda de texto libre (ILIKE) | `?q=camiseta` |
| `activo` | `true`, `false` o `todos` | `?activo=false` |
| Filtros propios | Parámetros nombrados por módulo | `?sucursal_id=1&estado=PAGADO` |

Columnas permitidas en `?sort=` están definidas por cada endpoint (ver sección
de recursos). Valores no permitidos se ignoran silenciosamente y se usa el
orden por defecto.

---

## 6. Convenciones de rutas

- Recursos en plural: `/api/productos`, `/api/pedidos`
- Subrecursos anidados: `/api/pedidos/:id/detalle`
- Acciones que no son CRUD van como verbo al final del recurso:

```
POST /api/pedidos/:id/anular
POST /api/pedidos/:id/despachar
POST /api/clientes/:id/aprobar
POST /api/traslados/:id/recibir
```

---

## 7. Recursos de la API

### Módulo auth

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| POST | `/api/auth/login` | Iniciar sesión | Público |
| POST | `/api/auth/registro` | Registro de cliente (tienda) | Público |
| GET | `/api/auth/me` | Perfil propio | Autenticado |
| POST | `/api/auth/recuperar` | Solicitar token de recuperación | Público |
| POST | `/api/auth/reset` | Cambiar contraseña con token | Público |

### Módulo terceros

#### Proveedores

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| GET | `/api/proveedores` | Listar proveedores | ADMIN, GERENTE, BODEGUERO |
| POST | `/api/proveedores` | Crear proveedor | ADMIN, GERENTE |
| GET | `/api/proveedores/:id` | Ver proveedor | ADMIN, GERENTE, BODEGUERO |
| PUT | `/api/proveedores/:id` | Actualizar proveedor | ADMIN, GERENTE |
| DELETE | `/api/proveedores/:id` | Baja lógica | ADMIN |
| GET | `/api/proveedores/:id/productos` | Productos que suministra | ADMIN, GERENTE, BODEGUERO |
| POST | `/api/proveedores/:id/productos` | Asociar producto | ADMIN, GERENTE |
| DELETE | `/api/proveedores/:id/productos/:pid` | Desasociar producto | ADMIN |
| GET | `/api/proveedores/:id/historial` | Entradas de mercadería | ADMIN, GERENTE, BODEGUERO |

Filtros de historial: `?fecha_desde=YYYY-MM-DD`, `?fecha_hasta=YYYY-MM-DD`, `?sucursal_id=N`.

Regla principal: `es_principal=true` en un producto desmarca el proveedor principal anterior.
No se puede desactivar un proveedor con entradas de mercadería registradas → 422.

#### Empleados

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| GET | `/api/empleados` | Listar empleados | ADMIN, GERENTE |
| POST | `/api/empleados` | Crear empleado | ADMIN |
| GET | `/api/empleados/:id` | Ver empleado | ADMIN, GERENTE |
| PUT | `/api/empleados/:id` | Actualizar empleado | ADMIN |
| DELETE | `/api/empleados/:id` | Baja lógica | ADMIN |
| PUT | `/api/empleados/:id/sucursal` | Reasignar sucursal | ADMIN |

Reglas: baja lógica desactiva también el usuario vinculado; no se puede dar de baja si tiene movimientos de inventario → 422.
Reasignar sucursal actualiza también `usuario.sucursal_id` (para el JWT siguiente).

#### Clientes

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| GET | `/api/clientes` | Listar clientes | ADMIN, GERENTE, VENDEDOR |
| POST | `/api/clientes` | Crear cliente | ADMIN, GERENTE |
| GET | `/api/clientes/:id` | Ver cliente | ADMIN, GERENTE, VENDEDOR |
| PUT | `/api/clientes/:id` | Actualizar cliente | ADMIN, GERENTE |
| DELETE | `/api/clientes/:id` | Baja lógica | ADMIN |
| GET | `/api/clientes/pendientes` | Listar solicitudes mayoristas | ADMIN, GERENTE |
| POST | `/api/clientes/:id/aprobar` | Aprobar mayorista | ADMIN, GERENTE |
| POST | `/api/clientes/:id/rechazar` | Rechazar solicitud | ADMIN, GERENTE |
| GET | `/api/clientes/:id/credito` | Ver crédito (límite / utilizado / disponible) | ADMIN, GERENTE, VENDEDOR |
| GET | `/api/clientes/:id/direcciones` | Listar direcciones | ADMIN, GERENTE, VENDEDOR |
| POST | `/api/clientes/:id/direcciones` | Agregar dirección | ADMIN, GERENTE |
| PUT | `/api/clientes/:id/direcciones/:did` | Actualizar dirección | ADMIN, GERENTE |
| DELETE | `/api/clientes/:id/direcciones/:did` | Baja lógica dirección | ADMIN |

#### Mis direcciones (tienda)

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| GET | `/api/mis-direcciones` | Ver mis direcciones | CLIENTE (tienda) |
| POST | `/api/mis-direcciones` | Agregar dirección | CLIENTE (tienda) |
| PUT | `/api/mis-direcciones/:did` | Actualizar dirección | CLIENTE (tienda) |
| DELETE | `/api/mis-direcciones/:did` | Baja lógica | CLIENTE (tienda) |

Reglas de clientes:
- `VENDEDOR` no ve `limite_credito`, `credito_utilizado` ni `plazo_credito_dias`.
- `POST /aprobar` requiere `limite_credito` (≥ 0) y `plazo_credito_dias` (≥ 0) en el body.
- `POST /rechazar` requiere `motivo` (obligatorio).
- No se puede desactivar un cliente con pedidos activos o con `credito_utilizado > 0` → 422.
- Solo una dirección puede ser predeterminada: al marcar una, desmarca la anterior.
- El cliente de tienda accede solo a sus propias direcciones (ID resuelto desde el token, no de la URL).

### Módulo catálogo

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| GET | `/api/categorias` | Listar categorías | Todos |
| POST | `/api/categorias` | Crear categoría | ADMIN, GERENTE |
| GET | `/api/categorias/:id` | Ver categoría | Todos |
| PUT | `/api/categorias/:id` | Actualizar | ADMIN, GERENTE |
| DELETE | `/api/categorias/:id` | Baja lógica | ADMIN |
| GET | `/api/productos` | Listar productos | Todos |
| POST | `/api/productos` | Crear producto | ADMIN, GERENTE |
| GET | `/api/productos/:id` | Ver producto | Todos |
| PUT | `/api/productos/:id` | Actualizar producto | ADMIN, GERENTE |
| DELETE | `/api/productos/:id` | Baja lógica | ADMIN |
| GET | `/api/productos/:id/variantes` | Listar variantes | Todos |
| POST | `/api/productos/:id/variantes` | Agregar variante | ADMIN, GERENTE |
| GET | `/api/variantes/:id` | Ver variante con existencia | Todos |
| DELETE | `/api/variantes/:id` | Baja lógica | ADMIN |
| GET | `/api/variantes/:id/precios` | Historial de precios | ADMIN, GERENTE |
| POST | `/api/variantes/:id/precios` | Registrar nuevo precio | ADMIN, GERENTE |
| GET | `/api/marcas` | Listar marcas | Todos |
| POST | `/api/marcas` | Crear marca | ADMIN, GERENTE |
| GET | `/api/tallas` | Listar tallas | Todos |
| POST | `/api/tallas` | Crear talla | ADMIN |
| GET | `/api/colores` | Listar colores | Todos |
| POST | `/api/colores` | Crear color | ADMIN |

### Módulo inventario

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| GET | `/api/sucursales` | Listar sucursales | Todos |
| POST | `/api/sucursales` | Crear sucursal | ADMIN |
| GET | `/api/sucursales/:id` | Ver sucursal | Todos |
| PUT | `/api/sucursales/:id` | Actualizar | ADMIN |
| GET | `/api/existencias` | Listar existencias | ADMIN, GERENTE, BODEGUERO |
| GET | `/api/existencias/:variante_id/:sucursal_id` | Ver existencia | ADMIN, GERENTE, BODEGUERO |
| GET | `/api/movimientos` | Listar movimientos | ADMIN, GERENTE, BODEGUERO |
| POST | `/api/movimientos` | Registrar movimiento | ADMIN, GERENTE, BODEGUERO |
| GET | `/api/traslados` | Listar traslados | ADMIN, GERENTE, BODEGUERO |
| POST | `/api/traslados` | Crear traslado | ADMIN, GERENTE, BODEGUERO |
| GET | `/api/traslados/:id` | Ver traslado | ADMIN, GERENTE, BODEGUERO |
| POST | `/api/traslados/:id/recibir` | Confirmar recepción | ADMIN, GERENTE, BODEGUERO |
| POST | `/api/traslados/:id/anular` | Anular traslado | ADMIN, GERENTE |

### Módulo pedidos

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| GET | `/api/pedidos` | Listar pedidos | ADMIN, GERENTE, VENDEDOR |
| POST | `/api/pedidos` | Crear pedido | ADMIN, GERENTE, VENDEDOR, CLIENTE |
| GET | `/api/pedidos/:id` | Ver pedido | ADMIN, GERENTE, VENDEDOR, CLIENTE (propio) |
| PUT | `/api/pedidos/:id` | Actualizar pedido | ADMIN, GERENTE |
| POST | `/api/pedidos/:id/anular` | Anular pedido | ADMIN, GERENTE |
| POST | `/api/pedidos/:id/despachar` | Marcar despachado | ADMIN, GERENTE, BODEGUERO |
| GET | `/api/pedidos/:id/detalle` | Ver líneas del pedido | ADMIN, GERENTE, VENDEDOR, CLIENTE (propio) |
| GET | `/api/pedidos/:id/historial` | Ver historial de estados | ADMIN, GERENTE |
| GET | `/api/carrito` | Ver carrito activo (tienda) | CLIENTE |
| POST | `/api/carrito/items` | Agregar/actualizar item | CLIENTE |
| DELETE | `/api/carrito/items/:variante_id` | Quitar item | CLIENTE |
| GET | `/api/zonas-envio` | Listar zonas de envío | Todos |
| POST | `/api/zonas-envio` | Crear zona | ADMIN |

### Módulo recibos

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| GET | `/api/comprobantes` | Listar comprobantes | ADMIN, GERENTE, BODEGUERO |
| POST | `/api/comprobantes` | Crear comprobante | ADMIN, GERENTE, BODEGUERO |
| GET | `/api/comprobantes/:id` | Ver comprobante | ADMIN, GERENTE, BODEGUERO |
| POST | `/api/comprobantes/:id/anular` | Anular comprobante | ADMIN, GERENTE |
| GET | `/api/comprobantes/:id/detalle` | Ver líneas | ADMIN, GERENTE, BODEGUERO |

### Módulo pagos

Arquitectura: **Stripe Payment Intents + Stripe Elements**. El número de tarjeta
NUNCA pasa por esta API (PCI-DSS, RNF-SEG-08). Las llaves de Stripe se configuran
en variables de entorno (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).

#### Formas de pago disponibles

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| GET | `/api/pagos/formas-pago/:pedidoId` | Formas de pago disponibles para el pedido | CLIENTE (tienda) |

Regla: MINORISTA → solo `EN_LINEA`; MAYORISTA con `credito_disponible >= total` → `EN_LINEA` y `CREDITO`; MAYORISTA sin crédito → solo `EN_LINEA`. El `credito_disponible = limite_credito - credito_utilizado`.

Respuesta `200`:
```json
{
  "data": {
    "pedido_id": 5,
    "total": 275.00,
    "tipo_cliente": "MAYORISTA",
    "formas_pago": ["EN_LINEA", "CREDITO"]
  }
}
```

#### Pago en línea (Stripe Payment Intents)

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| POST | `/api/pagos/intencion` | Crear PaymentIntent; devuelve `client_secret` | CLIENTE (tienda) |

Body: `{ "pedido_id": 5 }`

Reglas:
- El monto se calcula en el servidor desde `pedido.total`. No se acepta monto del cliente.
- Stripe trabaja en centavos: GTQ 100.50 → 10050.
- Si ya existe un PaymentIntent pendiente para el pedido, se reutiliza.
- El pedido no puede estar en estado `PAGADO`, `ANULADO` ni `ENTREGADO`.

Respuesta `201`:
```json
{
  "data": {
    "client_secret": "pi_xxx_secret_yyy",
    "monto": 275.00
  }
}
```

#### Webhook de Stripe

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| POST | `/api/pagos/webhook` | Recibe eventos de Stripe | Público (firma HMAC) |

Reglas críticas:
- Requiere el **body crudo** (`express.raw`), registrado en `app.js` **antes** de `express.json()`.
- Verifica la firma con `stripe.webhooks.constructEvent` antes de procesar nada.
- Firma inválida → `400` y registro en bitácora como `WEBHOOK_FIRMA_INVALIDA`.
- Es **idempotente**: el mismo evento dos veces no produce efectos duplicados.
- Maneja: `payment_intent.succeeded` → transacción `EXITOSA`; `payment_intent.payment_failed` → `RECHAZADA`.
- La confirmación del pedido ocurre aquí (webhook), nunca por el retorno del navegador.

Respuesta `200`: `{ "recibido": true }`

#### Consulta y reembolsos (portal interno)

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| GET | `/api/pagos/transacciones` | Listar transacciones con filtros | ADMIN |
| POST | `/api/pagos/:id/reembolso` | Reembolso total o parcial | ADMIN, GERENTE |

Filtros de `/transacciones`: `?pedido_id=N`, `?estado=EXITOSA`, `?tipo=PAGO`, `?proveedor=STRIPE`, `?fecha_desde=YYYY-MM-DD`, `?fecha_hasta=YYYY-MM-DD`.

Reglas de reembolso:
- Solo transacciones con `tipo=PAGO` y `estado=EXITOSA`.
- `motivo` obligatorio.
- `monto` opcional; si se omite, reembolso total.
- Reembolso total → transacción original pasa a `REEMBOLSADA`.
- Genera una transacción hija con `tipo=REEMBOLSO` vinculada mediante `transaccion_origen_id`.

Body: `{ "motivo": "Devolución solicitada", "monto": 125.00 }`

#### Pago con crédito (tienda — solo mayoristas)

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| POST | `/api/pagos/credito/:pedidoId` | Registrar pedido al crédito del cliente | CLIENTE (tienda) |

Reglas:
- Cliente debe ser `MAYORISTA`.
- `credito_disponible >= pedido.total` → si no, `422`.
- Crea `credito_movimiento` tipo `CARGO` y aumenta `credito_utilizado`.
- No pasa por Stripe.

Respuesta `201`:
```json
{
  "data": {
    "pedido_id": 5,
    "credito_utilizado": 2600.00,
    "credito_disponible": 47400.00
  }
}
```

#### Gestión de crédito (portal interno)

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| POST | `/api/clientes/:id/abonos` | Registrar abono al crédito | ADMIN |
| GET | `/api/clientes/:id/estado-cuenta` | Historial de movimientos de crédito | ADMIN, GERENTE, VENDEDOR |

Reglas de abono:
- `monto` obligatorio, mayor a 0.
- No puede abonar más de `credito_utilizado` → `422`.
- Crea `credito_movimiento` tipo `ABONO` y disminuye `credito_utilizado`.

Body de abono: `{ "monto": 500.00, "referencia": "Transferencia Ref-001", "pedido_id": 5 }`

---

### Contrato del módulo de pedidos (firmas requeridas por el módulo de pagos)

El módulo de pagos llama a las siguientes funciones del módulo de pedidos.
Quien implemente pedidos **debe respetar estas firmas exactamente**:

```js
// Confirma un pago (exitoso en Stripe o por crédito) y avanza el pedido.
// Llamada desde: webhook payment_intent.succeeded y POST /api/pagos/credito/:pedidoId
// transaccionId es null cuando el pago es por crédito (no pasa por Stripe).
pedidoService.confirmarPago(
  pedidoId:      number,
  transaccionId: number | null,
  opts?: { formaPago?: "EN_LINEA" | "CREDITO", transaction?: SequelizeTransaction }
)
// Debe:
//   1. Cambiar pedido.estado de PENDIENTE_PAGO (o REGISTRADO) → PAGADO
//   2. Registrar pedido_historial con usuario_id=null y motivo adecuado
//   3. Comprometer existencias: incrementar cantidad_comprometida en cada línea

// Revierte el estado del pedido cuando el pago falla.
// Llamada desde: webhook payment_intent.payment_failed
pedidoService.revertirPago(
  pedidoId: number,
  opts?: { motivo?: string, transaction?: SequelizeTransaction }
)
// Debe:
//   1. Devolver pedido.estado a REGISTRADO
//   2. Registrar pedido_historial con el motivo del rechazo

// Procesa un reembolso sobre un pedido ya pagado.
// Llamada desde: POST /api/pagos/:id/reembolso
pedidoService.procesarReembolso(
  pedidoId:          number,
  txReembolsoId:     number,
  opts: { esTotal: boolean, transaction?: SequelizeTransaction }
)
// Debe:
//   Si esTotal=true:  marcar pedido como ANULADO y liberar cantidad_comprometida
//   Si esTotal=false: registrar en pedido_historial sin cambiar el estado
```

---

## 8. Filtro de baja lógica

Todas las tablas con `activo` soportan `?activo=true|false|todos`.

- `?activo=true` (default): solo registros activos.
- `?activo=false`: solo registros inactivos.
- `?activo=todos`: sin filtro.

---

## 9. Errores comunes

### 400 — Campo faltante

```json
{
  "error": {
    "mensaje": "Datos de entrada inválidos",
    "detalles": [
      "nombre: El nombre es obligatorio",
      "categoria_id: Debe ser un entero positivo"
    ]
  }
}
```

### 401 — Sin token

```json
{
  "error": {
    "mensaje": "Token no proporcionado",
    "detalles": []
  }
}
```

### 403 — Perfil insuficiente

```json
{
  "error": {
    "mensaje": "Se requiere uno de estos perfiles: ADMIN, GERENTE",
    "detalles": []
  }
}
```

### 404 — Recurso no existe

```json
{
  "error": {
    "mensaje": "Producto no encontrado",
    "detalles": []
  }
}
```

### 409 — Duplicado

```json
{
  "error": {
    "mensaje": "Ya existe un registro con esos datos",
    "detalles": [
      "El campo \"codigo\" ya está en uso"
    ]
  }
}
```

### 422 — Regla de negocio

```json
{
  "error": {
    "mensaje": "Existencia insuficiente para completar el pedido",
    "detalles": [
      "SKU-001: solicitado 10, disponible 3"
    ]
  }
}
```

---

## 10. Archivos de código que implementan este contrato

| Archivo | Responsabilidad |
|---------|----------------|
| `src/core/utils/respuesta.js` | Construye los cuerpos JSON de éxito |
| `src/core/utils/AppError.js` | Errores operacionales con status y detalles |
| `src/core/utils/asyncHandler.js` | Captura errores de controladores async |
| `src/core/utils/paginacion.js` | Parsea y valida page/limit/sort/order |
| `src/core/middlewares/errorHandler.js` | Traduce errores al formato del contrato |
| `src/core/middlewares/authJwt.js` | Verifica token, perfil y app |
| `src/core/middlewares/validar.js` | Evalúa express-validator y responde 400 |
