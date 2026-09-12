# Esquema de base de datos — INVENTA

Convenciones que aplican a TODAS las tablas:

- Toda tabla tiene `id` (PK, autoincremental) y `created_at` / `updated_at`. No se declaran abajo.
- Nombres en `snake_case`. Sequelize con `underscored: true`.
- Dinero: `DECIMAL(12,2)` — **nunca** `FLOAT` ni `DOUBLE`.
- Fechas con hora: `TIMESTAMP WITH TIME ZONE`.
- Las bajas son lógicas mediante `activo BOOLEAN DEFAULT true`.
- Tablas marcadas **INMUTABLE**: sin `updated_at`, nunca se actualizan ni se borran.

---

## Convención de asociaciones Sequelize

### Regla `name:` — obligatoria en todos los modelos

La librería `inflection` que usa Sequelize internamente es solo en inglés. Con nombres en español produce accessors incorrectos:

- `singularize("categoria")` → `"categorium"` (en lugar de `"categoria"`)
- `singularize("existencia")` → `"existencium"` (en lugar de `"existencia"`)
- `pluralize("color")` → `"colors"` (tabla OK, pero confuso)

Por eso **todos los modelos** deben declarar explícitamente:

```js
sequelize.define("nombre_modelo", { /* columnas */ }, {
  name: { singular: "nombre_modelo", plural: "nombre_modelos" }
});
```

`name:` solo afecta el nombre del accessor JS de la asociación. **No cambia el `tableName`** en la base de datos.

Con `name:` correctamente definido, los `include` y accessors funcionan sin necesidad de `as:`:

```js
// ✓ Funciona si Producto tiene name: { singular: "producto" }
await Variante.findByPk(id, { include: [db.producto] });
const nombre = variante.producto.nombre;
```

### Regla `as:` — solo donde hay ambigüedad

`as:` es **obligatorio** únicamente en los cuatro casos donde hay ambigüedad estructural. En cualquier otro caso, **no usar `as:`**.

| Modelo | Caso | `as:` obligatorio |
|---|---|---|
| `categoria` | Autorreferencia padre/hijos | `as: "categoriaPadre"` / `as: "subcategorias"` |
| `transaccion_pago` | Autorreferencia origen/reembolsos | `as: "transaccionOrigen"` / `as: "reembolsos"` |
| `traslado` | Dos FK a `sucursal` | `as: "sucursalOrigen"` / `as: "sucursalDestino"` |
| `traslado` | Dos FK a `usuario` | `as: "despachador"` / `as: "receptor"` |
| `comprobante` | Dos FK a `usuario` | `as: "creador"` / `as: "anulador"` |
| `precio` | FK a `usuario` con rol específico | `as: "registrador"` |
| `pedido` | FK a `usuario` con rol específico | `as: "registrador"` |
| `usuario` | FK circular con `cliente` | `as: "aprobador"` |

### Plantilla para un modelo nuevo

```js
"use strict";
module.exports = (sequelize, Sequelize) => {
  const MiModelo = sequelize.define("mi_modelo", {
    // columnas...
  }, {
    name: { singular: "mi_modelo", plural: "mi_modelos" }
    // agregar updatedAt: false si es INMUTABLE
  });

  MiModelo.associate = (db) => {
    // Sin as: en el 95 % de los casos
    MiModelo.belongsTo(db.otro_modelo, { foreignKey: "otro_modelo_id" });
    MiModelo.hasMany(db.hijo_modelo, { foreignKey: "mi_modelo_id" });

    // Con as: solo si hay más de una FK al mismo modelo
    // MiModelo.belongsTo(db.usuario, { foreignKey: "creado_por", as: "creador" });
    // MiModelo.belongsTo(db.usuario, { foreignKey: "anulado_por", as: "anulador" });
  };

  return MiModelo;
};
```

### Por qué esta convención (contexto)

Cinco personas trabajando en paralelo. Sin `name:`, el accessor lo genera `inflection` y puede ser incorrecto con palabras en español. El error que produce Sequelize cuando el accessor falla no indica qué falta — dice algo críptico sobre la asociación. Con `name:` declarado en el modelo, no hay nada que recordar al escribir un `include`.

---

## Módulo: auth

### usuario
| Columna | Tipo | Reglas |
|---|---|---|
| email | STRING(150) | unique, notNull, isEmail |
| password_hash | STRING(255) | notNull |
| perfil | ENUM(ADMIN, GERENTE, BODEGUERO, VENDEDOR, CLIENTE) | notNull |
| app | ENUM(INTERNO, TIENDA) | notNull |
| empleado_id | FK empleado | nullable |
| cliente_id | FK cliente | nullable |
| sucursal_id | FK sucursal | nullable |
| activo | BOOLEAN | default true |
| email_verificado | BOOLEAN | default false |
| token_recuperacion | STRING(255) | nullable |
| token_expira | TIMESTAMPTZ | nullable |
| intentos_fallidos | SMALLINT | default 0 |
| bloqueado_hasta | TIMESTAMPTZ | nullable |
| ultimo_acceso | TIMESTAMPTZ | nullable |

Relaciones: belongsTo empleado, cliente, sucursal.

## Módulo: core (src/core/models)

### bitacora — **INMUTABLE**
| Columna | Tipo | Reglas |
|---|---|---|
| usuario_id | FK usuario | nullable |
| operacion | STRING(60) | notNull |
| entidad | STRING(60) | notNull |
| entidad_id | INTEGER | nullable |
| valores_anteriores | JSONB | nullable |
| valores_nuevos | JSONB | nullable |
| ip | STRING(45) | nullable |
| fecha | TIMESTAMPTZ | notNull, default NOW |

### parametro
| Columna | Tipo | Reglas |
|---|---|---|
| clave | STRING(60) | unique, notNull |
| valor | STRING(255) | notNull |
| tipo_dato | ENUM(NUMERO, TEXTO, BOOLEANO) | notNull |
| descripcion | STRING(250) | nullable |

---

## Módulo: terceros

### cliente
| Columna | Tipo | Reglas |
|---|---|---|
| codigo | STRING(20) | unique, notNull |
| tipo | ENUM(MINORISTA, MAYORISTA) | notNull |
| nombre | STRING(150) | notNull |
| nombre_comercial | STRING(150) | nullable |
| nit | STRING(20) | unique, nullable |
| email | STRING(150) | unique, notNull |
| telefono | STRING(20) | nullable |
| direccion_fiscal | STRING(250) | nullable |
| contacto_nombre | STRING(120) | nullable |
| estado | ENUM(PENDIENTE, APROBADO, RECHAZADO, INACTIVO) | default PENDIENTE |
| motivo_rechazo | STRING(250) | nullable |
| aprobado_por | FK usuario | nullable |
| fecha_aprobacion | TIMESTAMPTZ | nullable |
| limite_credito | DECIMAL(12,2) | default 0 |
| credito_utilizado | DECIMAL(12,2) | default 0 |
| plazo_credito_dias | SMALLINT | default 0 |
| terminos_aceptados_en | TIMESTAMPTZ | nullable |
| version_terminos | STRING(10) | nullable |
| activo | BOOLEAN | default true |

Relaciones: hasMany direccion_cliente, pedido, credito_movimiento. hasOne usuario.

### direccion_cliente
| Columna | Tipo | Reglas |
|---|---|---|
| cliente_id | FK cliente | notNull |
| alias | STRING(50) | notNull |
| destinatario | STRING(120) | notNull |
| direccion | STRING(250) | notNull |
| referencia | STRING(250) | nullable |
| municipio | STRING(80) | notNull |
| departamento | STRING(80) | notNull |
| telefono | STRING(20) | nullable |
| zona_envio_id | FK zona_envio | nullable |
| es_predeterminada | BOOLEAN | default false |
| activo | BOOLEAN | default true |

### empleado
| Columna | Tipo | Reglas |
|---|---|---|
| codigo | STRING(20) | unique, notNull |
| nombres | STRING(100) | notNull |
| apellidos | STRING(100) | notNull |
| dpi | STRING(20) | unique, notNull |
| puesto | STRING(80) | notNull |
| sucursal_id | FK sucursal | notNull |
| fecha_ingreso | DATEONLY | notNull |
| telefono | STRING(20) | nullable |
| email | STRING(150) | nullable |
| activo | BOOLEAN | default true |

### proveedor
| Columna | Tipo | Reglas |
|---|---|---|
| codigo | STRING(20) | unique, notNull |
| razon_social | STRING(150) | notNull |
| nombre_comercial | STRING(150) | nullable |
| nit | STRING(20) | unique, notNull |
| direccion | STRING(250) | nullable |
| contacto_nombre | STRING(120) | nullable |
| telefono | STRING(20) | nullable |
| email | STRING(150) | nullable |
| condiciones_pago | STRING(100) | nullable |
| plazo_entrega_dias | SMALLINT | nullable |
| activo | BOOLEAN | default true |

### proveedor_producto
| Columna | Tipo | Reglas |
|---|---|---|
| proveedor_id | FK proveedor | notNull |
| producto_id | FK producto | notNull |
| codigo_proveedor | STRING(40) | nullable |
| costo_compra | DECIMAL(12,2) | notNull |
| es_principal | BOOLEAN | default false |

Índice único compuesto: (proveedor_id, producto_id).

---

## Módulo: catalogo

### categoria
| Columna | Tipo | Reglas |
|---|---|---|
| nombre | STRING(80) | unique, notNull |
| descripcion | STRING(250) | nullable |
| categoria_padre_id | FK categoria | nullable (autorreferencia) |
| activo | BOOLEAN | default true |

### marca
| Columna | Tipo | Reglas |
|---|---|---|
| nombre | STRING(80) | unique, notNull |
| descripcion | STRING(250) | nullable |
| activo | BOOLEAN | default true |

### temporada
| Columna | Tipo | Reglas |
|---|---|---|
| nombre | STRING(80) | notNull |
| anio | SMALLINT | notNull |
| descripcion | STRING(250) | nullable |
| activo | BOOLEAN | default true |

Índice único compuesto: (nombre, anio).

### talla
| Columna | Tipo | Reglas |
|---|---|---|
| codigo | STRING(10) | unique, notNull |
| descripcion | STRING(50) | nullable |
| orden | SMALLINT | notNull — ordena XS,S,M,L,XL, no alfabético |
| activo | BOOLEAN | default true |

### color
| Columna | Tipo | Reglas |
|---|---|---|
| nombre | STRING(50) | unique, notNull |
| hex | STRING(7) | nullable, formato #RRGGBB |
| activo | BOOLEAN | default true |

### producto
| Columna | Tipo | Reglas |
|---|---|---|
| codigo | STRING(30) | unique, notNull |
| nombre | STRING(150) | notNull |
| descripcion | TEXT | nullable |
| categoria_id | FK categoria | notNull |
| marca_id | FK marca | nullable |
| temporada_id | FK temporada | nullable |
| genero | ENUM(HOMBRE, MUJER, NINO, UNISEX) | default UNISEX |
| activo | BOOLEAN | default true |

Relaciones: hasMany variante, imagen_producto, proveedor_producto.

### variante
LA UNIDAD DE INVENTARIO. Nunca se controla stock contra producto.
| Columna | Tipo | Reglas |
|---|---|---|
| sku | STRING(40) | unique, notNull, inmutable |
| producto_id | FK producto | notNull |
| talla_id | FK talla | notNull |
| color_id | FK color | notNull |
| codigo_barras | STRING(50) | unique, nullable |
| activo | BOOLEAN | default true |

Índice único compuesto: (producto_id, talla_id, color_id).
Relaciones: hasMany existencia, precio, movimiento_inventario, pedido_detalle.

### precio
Historial: NO se sobrescribe. El vigente es el que tiene vigente_hasta = null.
| Columna | Tipo | Reglas |
|---|---|---|
| variante_id | FK variante | notNull |
| tipo | ENUM(COSTO, MINORISTA, MAYORISTA) | notNull |
| monto | DECIMAL(12,2) | notNull, min 0 |
| vigente_desde | DATEONLY | notNull |
| vigente_hasta | DATEONLY | nullable |
| registrado_por | FK usuario | nullable |

### imagen_producto
| Columna | Tipo | Reglas |
|---|---|---|
| producto_id | FK producto | notNull |
| color_id | FK color | nullable |
| url | STRING(500) | notNull |
| orden | SMALLINT | default 0 |
| es_principal | BOOLEAN | default false |

---

## Módulo: inventario

### sucursal
| Columna | Tipo | Reglas |
|---|---|---|
| codigo | STRING(10) | unique, notNull — prefijo de correlativos |
| nombre | STRING(100) | notNull |
| direccion | STRING(250) | nullable |
| telefono | STRING(20) | nullable |
| es_bodega_central | BOOLEAN | default false |
| vende_en_linea | BOOLEAN | default true |
| activo | BOOLEAN | default true |

### existencia
| Columna | Tipo | Reglas |
|---|---|---|
| variante_id | FK variante | notNull |
| sucursal_id | FK sucursal | notNull |
| cantidad_fisica | INTEGER | default 0, min 0 |
| cantidad_comprometida | INTEGER | default 0, min 0 |
| existencia_minima | INTEGER | default 0 |
| costo_promedio | DECIMAL(12,2) | default 0 |

Índice único compuesto: (variante_id, sucursal_id).
Getter virtual `disponible` = cantidad_fisica - cantidad_comprometida.

### movimiento_inventario — **INMUTABLE**
| Columna | Tipo | Reglas |
|---|---|---|
| variante_id | FK variante | notNull |
| sucursal_id | FK sucursal | notNull |
| tipo | ENUM | notNull. Valores: ENTRADA_COMPRA, ENTRADA_DEVOLUCION, ENTRADA_TRASLADO, SALDO_INICIAL, AJUSTE_POSITIVO, SALIDA_VENTA, SALIDA_MERMA, SALIDA_DEVOLUCION, SALIDA_TRASLADO, AJUSTE_NEGATIVO |
| cantidad | INTEGER | notNull, min 1 — siempre positiva, el tipo da el signo |
| costo_unitario | DECIMAL(12,2) | nullable |
| saldo_anterior | INTEGER | notNull |
| saldo_resultante | INTEGER | notNull |
| referencia_tipo | STRING(30) | nullable |
| referencia_id | INTEGER | nullable |
| comprobante_id | FK comprobante | nullable |
| motivo | STRING(250) | nullable — obligatorio en merma y ajuste (validar en servicio) |
| usuario_id | FK usuario | notNull |
| fecha | TIMESTAMPTZ | notNull, default NOW |

Índice: (variante_id, sucursal_id, fecha).

### traslado
| Columna | Tipo | Reglas |
|---|---|---|
| numero | STRING(20) | unique, notNull |
| sucursal_origen_id | FK sucursal | notNull |
| sucursal_destino_id | FK sucursal | notNull, distinta a origen |
| estado | ENUM(EN_TRANSITO, RECIBIDO, ANULADO) | default EN_TRANSITO |
| fecha_despacho | TIMESTAMPTZ | notNull |
| fecha_recepcion | TIMESTAMPTZ | nullable |
| despachado_por | FK usuario | notNull |
| recibido_por | FK usuario | nullable |
| observaciones | STRING(250) | nullable |

### traslado_detalle
| Columna | Tipo | Reglas |
|---|---|---|
| traslado_id | FK traslado | notNull |
| variante_id | FK variante | notNull |
| cantidad_despachada | INTEGER | notNull, min 1 |
| cantidad_recibida | INTEGER | nullable |
| observacion_diferencia | STRING(250) | nullable |

---

## Módulo: pedidos

### zona_envio
| Columna | Tipo | Reglas |
|---|---|---|
| nombre | STRING(80) | unique, notNull |
| costo | DECIMAL(10,2) | notNull, min 0 |
| dias_estimados | SMALLINT | nullable |
| activo | BOOLEAN | default true |

### carrito
| Columna | Tipo | Reglas |
|---|---|---|
| cliente_id | FK cliente | notNull |
| activo | BOOLEAN | default true |

### carrito_detalle
| Columna | Tipo | Reglas |
|---|---|---|
| carrito_id | FK carrito | notNull |
| variante_id | FK variante | notNull |
| cantidad | INTEGER | notNull, min 1 |

Índice único compuesto: (carrito_id, variante_id).

### pedido
| Columna | Tipo | Reglas |
|---|---|---|
| numero | STRING(20) | unique, notNull |
| cliente_id | FK cliente | notNull |
| tipo_cliente | ENUM(MINORISTA, MAYORISTA) | notNull — copia histórica |
| sucursal_id | FK sucursal | nullable hasta asignación |
| canal | ENUM(TIENDA, INTERNO) | notNull |
| es_lote | BOOLEAN | default false |
| estado | ENUM(REGISTRADO, PENDIENTE_PAGO, PAGADO, EN_PREPARACION, DESPACHADO, ENTREGADO, ANULADO) | default REGISTRADO |
| forma_pago | ENUM(EN_LINEA, CREDITO) | notNull |
| subtotal | DECIMAL(12,2) | notNull, default 0 |
| costo_envio | DECIMAL(10,2) | notNull, default 0 |
| total | DECIMAL(12,2) | notNull, default 0 |
| entrega_tipo | ENUM(ENVIO, RETIRO_SUCURSAL) | notNull |
| entrega_destinatario | STRING(120) | nullable — COPIA, no FK |
| entrega_direccion | STRING(250) | nullable |
| entrega_municipio | STRING(80) | nullable |
| entrega_departamento | STRING(80) | nullable |
| entrega_telefono | STRING(20) | nullable |
| registrado_por | FK usuario | nullable |
| motivo_anulacion | STRING(250) | nullable |
| fecha_expiracion | TIMESTAMPTZ | nullable |
| observaciones | STRING(500) | nullable |

Índices: (estado, sucursal_id), (cliente_id, created_at).

### pedido_detalle
| Columna | Tipo | Reglas |
|---|---|---|
| pedido_id | FK pedido | notNull |
| variante_id | FK variante | notNull |
| sku | STRING(40) | notNull — copia histórica |
| descripcion | STRING(200) | notNull — copia histórica |
| cantidad | INTEGER | notNull, min 1 |
| cantidad_despachada | INTEGER | default 0 |
| precio_unitario | DECIMAL(12,2) | notNull — precio congelado |
| subtotal | DECIMAL(12,2) | notNull |

### pedido_historial — **INMUTABLE**
| Columna | Tipo | Reglas |
|---|---|---|
| pedido_id | FK pedido | notNull |
| estado_anterior | ENUM (mismos valores que pedido.estado) | nullable |
| estado_nuevo | ENUM (mismos valores) | notNull |
| usuario_id | FK usuario | nullable — null si automático |
| motivo | STRING(250) | nullable |
| fecha | TIMESTAMPTZ | notNull, default NOW |

---

## Módulo: recibos

### correlativo
| Columna | Tipo | Reglas |
|---|---|---|
| sucursal_id | FK sucursal | notNull |
| tipo_documento | ENUM(ENTRADA, SALIDA, TRASLADO) | notNull |
| serie | STRING(10) | notNull |
| ultimo_numero | INTEGER | default 0 |

Índice único compuesto: (sucursal_id, tipo_documento).

### comprobante
Nunca se modifica ni se borra: solo se marca anulado.
| Columna | Tipo | Reglas |
|---|---|---|
| numero | STRING(25) | unique, notNull |
| tipo | ENUM(ENTRADA, SALIDA) | notNull |
| subtipo | ENUM(COMPRA, MERMA, VENTA, TRASLADO, DEVOLUCION, AJUSTE) | notNull |
| sucursal_id | FK sucursal | notNull |
| proveedor_id | FK proveedor | nullable |
| cliente_id | FK cliente | nullable |
| pedido_id | FK pedido | nullable |
| traslado_id | FK traslado | nullable |
| documento_externo | STRING(40) | nullable |
| total | DECIMAL(12,2) | notNull, default 0 |
| anulado | BOOLEAN | default false |
| motivo_anulacion | STRING(250) | nullable |
| anulado_por | FK usuario | nullable |
| fecha_anulacion | TIMESTAMPTZ | nullable |
| usuario_id | FK usuario | notNull |
| fecha | TIMESTAMPTZ | notNull, default NOW |
| observaciones | STRING(500) | nullable |

### comprobante_detalle
| Columna | Tipo | Reglas |
|---|---|---|
| comprobante_id | FK comprobante | notNull |
| variante_id | FK variante | notNull |
| sku | STRING(40) | notNull — copia |
| descripcion | STRING(200) | notNull — copia |
| cantidad | INTEGER | notNull, min 1 |
| costo_unitario | DECIMAL(12,2) | notNull, default 0 |
| subtotal | DECIMAL(12,2) | notNull, default 0 |

---

## Módulo: pagos

### transaccion_pago — **INMUTABLE** (salvo el campo estado)
NUNCA almacena número de tarjeta, vencimiento ni CVV.
| Columna | Tipo | Reglas |
|---|---|---|
| pedido_id | FK pedido | notNull |
| proveedor | ENUM(STRIPE, PAYPAL) | notNull |
| id_externo | STRING(120) | unique, notNull |
| tipo | ENUM(PAGO, REEMBOLSO) | default PAGO |
| transaccion_origen_id | FK transaccion_pago | nullable (autorreferencia) |
| monto | DECIMAL(12,2) | notNull |
| moneda | STRING(3) | default GTQ |
| estado | ENUM(PENDIENTE, EXITOSA, RECHAZADA, REEMBOLSADA) | default PENDIENTE |
| mensaje_proveedor | STRING(250) | nullable |
| respuesta_cruda | JSONB | nullable |
| motivo | STRING(250) | nullable |
| fecha | TIMESTAMPTZ | notNull, default NOW |

### credito_movimiento — **INMUTABLE**
| Columna | Tipo | Reglas |
|---|---|---|
| cliente_id | FK cliente | notNull |
| tipo | ENUM(CARGO, ABONO) | notNull |
| pedido_id | FK pedido | nullable |
| monto | DECIMAL(12,2) | notNull, min 0 |
| saldo_resultante | DECIMAL(12,2) | notNull |
| referencia | STRING(100) | nullable |
| usuario_id | FK usuario | nullable |
| fecha | TIMESTAMPTZ | notNull, default NOW |
