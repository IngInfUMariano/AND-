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

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| GET | `/api/clientes` | Listar clientes | ADMIN, GERENTE, VENDEDOR |
| POST | `/api/clientes` | Crear cliente | ADMIN, GERENTE |
| GET | `/api/clientes/:id` | Ver cliente | ADMIN, GERENTE, VENDEDOR |
| PUT | `/api/clientes/:id` | Actualizar cliente | ADMIN, GERENTE |
| DELETE | `/api/clientes/:id` | Baja lógica | ADMIN |
| POST | `/api/clientes/:id/aprobar` | Aprobar solicitud | ADMIN, GERENTE |
| GET | `/api/clientes/:id/direcciones` | Listar direcciones | ADMIN, GERENTE, VENDEDOR |
| POST | `/api/clientes/:id/direcciones` | Agregar dirección | ADMIN, GERENTE |
| GET | `/api/empleados` | Listar empleados | ADMIN, GERENTE |
| POST | `/api/empleados` | Crear empleado | ADMIN |
| GET | `/api/empleados/:id` | Ver empleado | ADMIN, GERENTE |
| PUT | `/api/empleados/:id` | Actualizar empleado | ADMIN |
| DELETE | `/api/empleados/:id` | Baja lógica | ADMIN |
| GET | `/api/proveedores` | Listar proveedores | ADMIN, GERENTE, BODEGUERO |
| POST | `/api/proveedores` | Crear proveedor | ADMIN, GERENTE |
| GET | `/api/proveedores/:id` | Ver proveedor | ADMIN, GERENTE, BODEGUERO |
| PUT | `/api/proveedores/:id` | Actualizar proveedor | ADMIN, GERENTE |
| DELETE | `/api/proveedores/:id` | Baja lógica | ADMIN |

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

| Método | Ruta | Descripción | Perfiles |
|--------|------|-------------|---------|
| POST | `/api/pagos/iniciar` | Crear sesión de pago (tienda) | CLIENTE |
| POST | `/api/pagos/webhook` | Webhook del proveedor | Público (firmado) |
| GET | `/api/pagos/:pedido_id` | Ver transacciones de un pedido | ADMIN, GERENTE |
| POST | `/api/pagos/:id/reembolsar` | Iniciar reembolso | ADMIN, GERENTE |
| GET | `/api/credito/:cliente_id` | Ver saldo y movimientos | ADMIN, GERENTE, VENDEDOR |

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
