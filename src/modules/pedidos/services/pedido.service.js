"use strict";

const readline = require("readline");
const { Readable } = require("stream");
const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");
const movimientoService = require("../../inventario/services/movimientoInventario.service");

const SORTABLES = ["created_at", "estado", "total"];

// Helper interno para generar el número correlativo único de pedido
const _generarNumeroPedido = () => `PED-${Date.now().toString().slice(-8)}`;

// Helper interno para parsear una línea CSV respetando comillas
const _parsearLineaCSV = (linea) => {
  const valores = [];
  let valorActual = "";
  let dentroDeComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const char = linea[i];
    if (char === '"' || char === "'") {
      dentroDeComillas = !dentroDeComillas;
    } else if (char === "," && !dentroDeComillas) {
      valores.push(valorActual.trim());
      valorActual = "";
    } else {
      valorActual += char;
    }
  }
  valores.push(valorActual.trim());
  return valores;
};

// Helper interno para verificar stock disponible global o por sucursal
const _verificarStockDisponible = async (varianteId, cantidad, sucursalId = null, transaction) => {
  const where = { variante_id: varianteId };
  if (sucursalId) where.sucursal_id = sucursalId;

  const existencias = await db.existencia.findAll({ where, transaction });

  const totalDisponible = existencias.reduce((acc, row) => {
    const disp = (row.cantidad_fisica || 0) - (row.cantidad_comprometida || 0);
    return acc + (disp > 0 ? disp : 0);
  }, 0);

  if (totalDisponible < cantidad) {
    throw AppError.reglaNegocio("Stock insuficiente para completar la operación", [
      `Variante ID ${varianteId}: Requerido ${cantidad}, Disponible ${totalDisponible}`
    ]);
  }
};

// Helper interno: Asignación Automática de Sucursal (RF-PED-08)
const _asignarSucursalAutomatica = async (zonaEnvioId, itemsCarrito, transaction) => {
  const zona = await db.zona_envio.findByPk(zonaEnvioId, { transaction });
  if (!zona || !zona.activo) {
    throw new AppError("La zona de envío seleccionada no existe o no está activa", 400);
  }

  const sucursalesAConsultar = [];
  if (zona.sucursal_id) {
    sucursalesAConsultar.push(zona.sucursal_id);
  }

  const otrasSucursales = await db.sucursal.findAll({
    where: { activo: true },
    attributes: ["id"],
    transaction
  });

  otrasSucursales.forEach((s) => {
    if (!sucursalesAConsultar.includes(s.id)) {
      sucursalesAConsultar.push(s.id);
    }
  });

  for (const sucursalId of sucursalesAConsultar) {
    let tieneStockCompleto = true;

    for (const item of itemsCarrito) {
      const existencia = await db.existencia.findOne({
        where: { variante_id: item.variante_id, sucursal_id: sucursalId },
        transaction
      });

      const disponible = existencia
        ? (existencia.cantidad_fisica || 0) - (existencia.cantidad_comprometida || 0)
        : 0;

      if (disponible < item.cantidad) {
        tieneStockCompleto = false;
        break;
      }
    }

    if (tieneStockCompleto) {
      return { sucursalId, costoEnvio: Number(zona.costo) };
    }
  }

  throw AppError.reglaNegocio(
    "No hay ninguna sucursal con inventario suficiente para cubrir todos los productos de este pedido",
    []
  );
};

// ─── listar ──────────────────────────────────────────────────────────────────
const listar = async (query, usuario) => {
  const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);
  const where = {};

  if (usuario.app === "tienda") {
    where.cliente_id = usuario.cliente_id;
  } else if (query.cliente_id) {
    where.cliente_id = query.cliente_id;
  }

  if (query.sucursal_id) where.sucursal_id = query.sucursal_id;
  if (query.estado) where.estado = query.estado.toUpperCase();

  const { rows, count } = await db.pedido.findAndCountAll({
    where,
    limit,
    offset,
    order: order.length ? order : [["created_at", "DESC"]],
    include: [{ model: db.pedido_detalle }]
  });

  return { rows, count, page, limit };
};

// ─── obtener ─────────────────────────────────────────────────────────────────
const obtener = async (id, usuario) => {
  const pedido = await db.pedido.findByPk(id, {
    include: [
      {
        model: db.pedido_detalle,
        include: [{ model: db.variante }]
      },
      { model: db.pedido_historial }
    ]
  });

  if (!pedido) throw new AppError("Pedido no encontrado", 404);

  if (usuario.app === "tienda" && pedido.cliente_id !== usuario.cliente_id) {
    throw new AppError("No tienes permisos para ver este pedido", 403);
  }

  return pedido;
};

// ─── crear (Checkout + Compromiso + Asignación Automática RF-PED-08) ────────
const crear = async (clienteId, datos) => {
  const {
    sucursal_id,
    zona_envio_id,
    forma_pago = "EN_LINEA",
    entrega_tipo = "ENVIO",
    entrega_direccion,
    entrega_destinatario,
    entrega_municipio,
    entrega_departamento,
    entrega_telefono,
    observaciones
  } = datos;

  return await db.sequelize.transaction(async (t) => {
    // 1. Obtener cliente
    const cliente = await db.cliente.findByPk(clienteId, { transaction: t });
    if (!cliente) throw new AppError("Cliente no encontrado", 404);

    // 2. Obtener carrito activo
    const carrito = await db.carrito.findOne({
      where: { cliente_id: clienteId, activo: true },
      include: [{ model: db.carrito_detalle }],
      transaction: t
    });

    if (!carrito || !carrito.carrito_detalles || carrito.carrito_detalles.length === 0) {
      throw AppError.reglaNegocio("El carrito de compras está vacío", [
        "Agrega productos al carrito antes de realizar el checkout"
      ]);
    }

    // 3. Determinar Sucursal y Costo de Envío (RF-PED-08)
    let sucursalFinalId = sucursal_id;
    let costoEnvio = 0;

    if (entrega_tipo === "ENVIO" && zona_envio_id) {
      if (!sucursalFinalId) {
        // Asignación automática de sucursal
        const asignacion = await _asignarSucursalAutomatica(
          zona_envio_id,
          carrito.carrito_detalles,
          t
        );
        sucursalFinalId = asignacion.sucursalId;
        costoEnvio = asignacion.costoEnvio;
      } else {
        const zona = await db.zona_envio.findByPk(zona_envio_id, { transaction: t });
        if (!zona || !zona.activo) {
          throw new AppError("La zona de envío seleccionada no existe o no está activa", 400);
        }
        costoEnvio = Number(zona.costo);
      }
    }

    if (!sucursalFinalId) {
      throw new AppError("Debe especificar una sucursal o una zona de envío válida", 400);
    }

    // 4. Calcular subtotal de las líneas y verificar stock
    let subtotal = 0;
    const itemsProcesados = [];

    for (const item of carrito.carrito_detalles) {
      await _verificarStockDisponible(item.variante_id, item.cantidad, sucursalFinalId, t);

      const variante = await db.variante.findByPk(item.variante_id, {
        include: [
          { model: db.producto },
          { model: db.precio, attributes: ["tipo", "monto"] }
        ],
        transaction: t
      });

      if (!variante) {
        throw new AppError(`La variante ${item.variante_id} no existe`, 404);
      }

      const tipoPrecio = cliente.tipo === "MAYORISTA" ? "MAYORISTA" : "MINORISTA";
      const precioObj = variante.precios?.find(p => p.tipo === tipoPrecio)
        ?? variante.precios?.find(p => p.tipo === "MINORISTA");
      const precioUnitario = precioObj ? Number(precioObj.monto) : 0;
      const subtotalItem = precioUnitario * item.cantidad;
      subtotal += subtotalItem;

      const nombreProducto = variante.producto ? variante.producto.nombre : "Producto";
      const descripcion = `${nombreProducto} - SKU: ${variante.sku}`;

      itemsProcesados.push({
        variante_id: item.variante_id,
        sku: variante.sku,
        descripcion,
        cantidad: item.cantidad,
        precio_unitario: precioUnitario,
        subtotal: subtotalItem
      });
    }

    const totalFinal = subtotal + costoEnvio;

    // 5. Crear cabecera del pedido
    const pedido = await db.pedido.create(
      {
        numero: _generarNumeroPedido(),
        cliente_id: clienteId,
        sucursal_id: sucursalFinalId,
        tipo_cliente: cliente.tipo || "MINORISTA",
        canal: "TIENDA",
        forma_pago,
        entrega_tipo,
        entrega_destinatario,
        entrega_direccion,
        entrega_municipio,
        entrega_departamento,
        entrega_telefono,
        observaciones,
        subtotal,
        costo_envio: costoEnvio,
        total: totalFinal,
        estado: "REGISTRADO"
      },
      { transaction: t }
    );

    // 6. Guardar detalles y comprometer stock en Inventario
    for (const item of itemsProcesados) {
      await db.pedido_detalle.create(
        {
          pedido_id: pedido.id,
          variante_id: item.variante_id,
          sku: item.sku,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal
        },
        { transaction: t }
      );

      const existencia = await db.existencia.findOne({
        where: { variante_id: item.variante_id, sucursal_id: sucursalFinalId },
        transaction: t
      });

      if (existencia) {
        await existencia.increment("cantidad_comprometida", {
          by: item.cantidad,
          transaction: t
        });
      }
    }

    // 7. Registro de historial
    await db.pedido_historial.create(
      {
        pedido_id: pedido.id,
        estado_anterior: null,
        estado_nuevo: "REGISTRADO",
        motivo: "Pedido creado desde la tienda en línea y stock comprometido"
      },
      { transaction: t }
    );

    // 8. Limpiar carrito
    await db.carrito_detalle.destroy({ where: { carrito_id: carrito.id }, transaction: t });
    await carrito.update({ activo: false }, { transaction: t });

    return pedido;
  });
};

// ─── cambiarEstado & Despacho (RF-PED-14) ───────────────────────────────────
const cambiarEstado = async (id, nuevoEstado, observacion, usuario) => {
  const estadoUpper = nuevoEstado.toUpperCase();

  return await db.sequelize.transaction(async (t) => {
    const pedido = await db.pedido.findByPk(id, {
      include: [{ model: db.pedido_detalle }],
      transaction: t
    });

    if (!pedido) throw new AppError("Pedido no encontrado", 404);

    if (pedido.estado === "ANULADO" || pedido.estado === "ENTREGADO") {
      throw AppError.reglaNegocio("No se puede cambiar el estado de un pedido finalizado", [
        `El pedido se encuentra actualmente en estado '${pedido.estado}'`
      ]);
    }

    const TRANSICIONES_VALIDAS = {
      REGISTRADO:     ["PENDIENTE_PAGO", "PAGADO", "EN_PREPARACION"],
      PENDIENTE_PAGO: ["PAGADO", "REGISTRADO"],
      PAGADO:         ["EN_PREPARACION"],
      EN_PREPARACION: ["DESPACHADO"],
      DESPACHADO:     ["ENTREGADO"]
    };

    const permitidos = TRANSICIONES_VALIDAS[pedido.estado] || [];
    if (!permitidos.includes(estadoUpper)) {
      throw AppError.reglaNegocio(
        `Transición de estado inválida: ${pedido.estado} → ${estadoUpper}`,
        [`Estados permitidos desde '${pedido.estado}': ${permitidos.join(", ") || "ninguno"}`]
      );
    }

    const estadoAnterior = pedido.estado;

    if (estadoUpper === "DESPACHADO") {
      for (const item of pedido.pedido_detalles) {
        await movimientoService.crear(
          {
            tipo: "SALIDA_VENTA",
            cantidad: item.cantidad,
            variante_id: item.variante_id,
            sucursal_id: pedido.sucursal_id,
            referencia_tipo: "PEDIDO",
            referencia_id: pedido.id,
            motivo: `Despacho del pedido #${pedido.numero}`
          },
          usuario.id
        );

        const existencia = await db.existencia.findOne({
          where: { variante_id: item.variante_id, sucursal_id: pedido.sucursal_id },
          transaction: t
        });

        if (existencia) {
          await existencia.decrement("cantidad_comprometida", {
            by: item.cantidad,
            transaction: t
          });
        }
      }
    }

    await pedido.update({ estado: estadoUpper }, { transaction: t });

    await db.pedido_historial.create(
      {
        pedido_id: pedido.id,
        estado_anterior: estadoAnterior,
        estado_nuevo: estadoUpper,
        motivo: observacion || `Cambio de estado a ${estadoUpper}`,
        usuario_id: usuario.id
      },
      { transaction: t }
    );

    return pedido;
  });
};

// ─── anular (RF-PED-05 Liberación de Stock) ─────────────────────────────────
const anular = async (id, motivo, usuario) => {
  return await db.sequelize.transaction(async (t) => {
    const pedido = await db.pedido.findByPk(id, {
      include: [{ model: db.pedido_detalle }],
      transaction: t
    });

    if (!pedido) throw new AppError("Pedido no encontrado", 404);

    if (pedido.estado === "ENTREGADO" || pedido.estado === "DESPACHADO") {
      throw AppError.reglaNegocio("No se puede anular un pedido que ya fue despachado o entregado", []);
    }

    const estadoAnterior = pedido.estado;

    for (const item of pedido.pedido_detalles) {
      const existencia = await db.existencia.findOne({
        where: { variante_id: item.variante_id, sucursal_id: pedido.sucursal_id },
        transaction: t
      });

      if (existencia && existencia.cantidad_comprometida > 0) {
        await existencia.decrement("cantidad_comprometida", {
          by: Math.min(item.cantidad, existencia.cantidad_comprometida),
          transaction: t
        });
      }
    }

    await pedido.update(
      {
        estado: "ANULADO",
        motivo_anulacion: motivo
      },
      { transaction: t }
    );

    await db.pedido_historial.create(
      {
        pedido_id: pedido.id,
        estado_anterior: estadoAnterior,
        estado_nuevo: "ANULADO",
        motivo: `ANULACIÓN: ${motivo}`,
        usuario_id: usuario ? usuario.id : null
      },
      { transaction: t }
    );

    return pedido;
  });
};

// ─── cargarMasivo (RF-PED-06 / RF-PED-07) ───────────────────────────────────
const cargarMasivo = async (clienteId, archivo, sucursalId) => {
  if (!archivo || !archivo.buffer) {
    throw new AppError("No se proporcionó ningún archivo CSV válido", 400);
  }

  if (!sucursalId) {
    throw new AppError("Es necesario especificar la sucursal para la carga masiva", 400);
  }

  const cliente = await db.cliente.findByPk(clienteId);
  if (!cliente) throw new AppError("Cliente no encontrado", 404);

  const esMayorista = cliente.tipo === "MAYORISTA";
  const MIN_MAYORISTA = Number(process.env.MIN_CANTIDAD_MAYORISTA || 10);

  const stream = Readable.from(archivo.buffer.toString("utf-8"));
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const filas = [];
  let esPrimeraLinea = true;

  for await (const linea of rl) {
    if (!linea.trim()) continue;
    if (esPrimeraLinea) {
      esPrimeraLinea = false;
      continue;
    }
    filas.push(_parsearLineaCSV(linea));
  }

  if (filas.length === 0) {
    throw new AppError("El archivo CSV está vacío o no contiene datos válidos", 400);
  }

  const errores = [];
  const itemsAProcesar = [];

  for (let i = 0; i < filas.length; i++) {
    const numeroLinea = i + 2;
    const [sku, cantidadRaw, observacionesLinea] = filas[i];
    const cantidad = parseInt(cantidadRaw, 10);

    if (!sku) {
      errores.push({ linea: numeroLinea, error: "El SKU es requerido" });
      continue;
    }

    if (isNaN(cantidad) || cantidad <= 0) {
      errores.push({ linea: numeroLinea, sku, error: "La cantidad debe ser un número entero mayor a 0" });
      continue;
    }

    if (esMayorista && cantidad < MIN_MAYORISTA) {
      errores.push({
        linea: numeroLinea,
        sku,
        error: `Como cliente mayorista, la cantidad mínima por ítem debe ser ${MIN_MAYORISTA}`
      });
      continue;
    }

    const variante = await db.variante.findOne({
      where: { sku, activo: true },
      include: [{ model: db.producto, where: { activo: true } }]
    });

    if (!variante) {
      errores.push({ linea: numeroLinea, sku, error: `El SKU '${sku}' no existe o no está activo` });
      continue;
    }

    const existencia = await db.existencia.findOne({
      where: { variante_id: variante.id, sucursal_id: sucursalId }
    });

    const disponible = existencia
      ? (existencia.cantidad_fisica || 0) - (existencia.cantidad_comprometida || 0)
      : 0;

    if (disponible < cantidad) {
      errores.push({
        linea: numeroLinea,
        sku,
        error: `Stock insuficiente. Requerido: ${cantidad}, Disponible: ${Math.max(0, disponible)}`
      });
      continue;
    }

    itemsAProcesar.push({
      variante,
      cantidad,
      precioUnitario: Number(variante.precio_venta),
      subtotal: Number(variante.precio_venta) * cantidad,
      observaciones: observacionesLinea || null
    });
  }

  if (errores.length > 0) {
    throw AppError.reglaNegocio("El archivo CSV contiene errores y no se pudo procesar", errores);
  }

  return await db.sequelize.transaction(async (t) => {
    let subtotalGeneral = 0;

    itemsAProcesar.forEach((item) => {
      subtotalGeneral += item.subtotal;
    });

    const pedido = await db.pedido.create(
      {
        numero: _generarNumeroPedido(),
        cliente_id: clienteId,
        sucursal_id: sucursalId,
        tipo_cliente: cliente.tipo || "MINORISTA",
        canal: "INTERNO",
        forma_pago: "CREDITO",
        entrega_tipo: "RETIRO_SUCURSAL",
        subtotal: subtotalGeneral,
        costo_envio: 0,
        total: subtotalGeneral,
        estado: "REGISTRADO"
      },
      { transaction: t }
    );

    for (const item of itemsAProcesar) {
      const nombreProducto = item.variante.producto ? item.variante.producto.nombre : "Producto";

      await db.pedido_detalle.create(
        {
          pedido_id: pedido.id,
          variante_id: item.variante.id,
          sku: item.variante.sku,
          descripcion: `${nombreProducto} - SKU: ${item.variante.sku}`,
          cantidad: item.cantidad,
          precio_unitario: item.precioUnitario,
          subtotal: item.subtotal
        },
        { transaction: t }
      );

      const existencia = await db.existencia.findOne({
        where: { variante_id: item.variante.id, sucursal_id: sucursalId },
        transaction: t
      });

      if (existencia) {
        await existencia.increment("cantidad_comprometida", {
          by: item.cantidad,
          transaction: t
        });
      }
    }

    await db.pedido_historial.create(
      {
        pedido_id: pedido.id,
        estado_anterior: null,
        estado_nuevo: "REGISTRADO",
        motivo: `Carga masiva procesada exitosamente desde CSV (${itemsAProcesar.length} ítems)`
      },
      { transaction: t }
    );

    return {
      mensaje: "Carga masiva procesada con éxito",
      pedido_id: pedido.id,
      numero_pedido: pedido.numero,
      total_items: itemsAProcesar.length,
      total_monto: subtotalGeneral
    };
  });
};

// ─── generarHojaRecoleccion (RF-PED-13) ──────────────────────────────────────
const generarHojaRecoleccion = async (id) => {
  const pedido = await db.pedido.findByPk(id, {
    include: [
      { model: db.cliente, attributes: ["nombre","nombre_comercial"] },
      { model: db.sucursal, attributes: ["id", "nombre", "codigo"] },
      {
        model: db.pedido_detalle,
        include: [
          {
            model: db.variante,
            attributes: ["id", "sku", "codigo_barras", "ubicacion_almacen"],
            include: [{ model: db.producto, attributes: ["nombre"] }]
          }
        ]
      }
    ]
  });

  if (!pedido) throw new AppError("Pedido no encontrado", 404);

  // Mapear y ordenar ítems por ubicación en bodega para optimizar el recorrido
  const itemsRecoleccion = pedido.pedido_detalles.map((detalle) => ({
    detalle_id: detalle.id,
    variante_id: detalle.variante_id,
    sku: detalle.sku,
    codigo_barras: detalle.variante?.codigo_barras || "N/A",
    descripcion: detalle.descripcion,
    ubicacion: detalle.variante?.ubicacion_almacen || "SIN ASIGNAR",
    cantidad_solicitada: detalle.cantidad,
    recolectado: false
  })).sort((a, b) => a.ubicacion.localeCompare(b.ubicacion));

  return {
    titulo: "HOJA DE RECOLECCIÓN (PICKING LIST)",
    numero_pedido: pedido.numero,
    fecha_emision: new Date(),
    sucursal: pedido.sucursal ? pedido.sucursal.nombre : "N/A",
    cliente: {
      nombre_completo: `${pedido.cliente?.nombre || ""} ${pedido.cliente?.nombre_comercial || ""}`.trim(),
      telefono: pedido.cliente?.telefono || pedido.entrega_telefono
    },
    entrega: {
      tipo: pedido.entrega_tipo,
      destinatario: pedido.entrega_destinatario,
      direccion: pedido.entrega_direccion,
      municipio: pedido.entrega_municipio,
      departamento: pedido.entrega_departamento
    },
    total_articulos: itemsRecoleccion.reduce((acc, item) => acc + item.cantidad_solicitada, 0),
    items: itemsRecoleccion
  };
};

// ─── INTEGRACIÓN CON PAGO.SERVICE ───────────────────────────────────────────

// ─── confirmarPago ────────────────────────────────────────────────────────────
// Invocado por pago.service.js (Webhook Stripe o Pago con Crédito)
const confirmarPago = async (pedidoId, transaccionId = null, opts = {}) => {
  const { formaPago = "EN_LINEA", motivo = "Pago confirmado exitosamente", transaction } = opts;

  const t = transaction || (await db.sequelize.transaction());

  try {
    const pedido = await db.pedido.findByPk(pedidoId, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!pedido) throw AppError.noEncontrado ? AppError.noEncontrado("Pedido") : new AppError("Pedido no encontrado", 404);

    const estadoAnterior = pedido.estado;

    // Si ya fue pagado, retornamos de forma idempotente
    if (pedido.estado === "PAGADO") {
      if (!transaction) await t.commit();
      return pedido;
    }

    // 1. Cambiar estado del pedido
    await pedido.update(
      {
        estado: "PAGADO",
        forma_pago: formaPago
      },
      { transaction: t }
    );

    // 2. Registrar auditoría en pedido_historial
    await db.pedido_historial.create(
      {
        pedido_id: pedidoId,
        estado_anterior: estadoAnterior,
        estado_nuevo: "PAGADO",
        motivo,
        usuario_id: null
      },
      { transaction: t }
    );

    if (!transaction) await t.commit();
    return pedido;
  } catch (err) {
    if (!transaction) await t.rollback();
    throw err;
  }
};

// ─── revertirPago ─────────────────────────────────────────────────────────────
// Invocado por pago.service.js cuando un pago en Stripe falla
const revertirPago = async (pedidoId, opts = {}) => {
  const { motivo = "Pago rechazado por la pasarela", transaction } = opts;

  const t = transaction || (await db.sequelize.transaction());

  try {
    const pedido = await db.pedido.findByPk(pedidoId, { transaction: t });
    if (!pedido) throw AppError.noEncontrado ? AppError.noEncontrado("Pedido") : new AppError("Pedido no encontrado", 404);

    // Registrar el intento fallido en el historial sin cambiar necesariamente el estado principal
    await db.pedido_historial.create(
      {
        pedido_id: pedidoId,
        estado_anterior: pedido.estado,
        estado_nuevo: pedido.estado,
        motivo: `Intento de pago fallido: ${motivo}`,
        usuario_id: null
      },
      { transaction: t }
    );

    if (!transaction) await t.commit();
    return pedido;
  } catch (err) {
    if (!transaction) await t.rollback();
    throw err;
  }
};

// ─── procesarReembolso ────────────────────────────────────────────────────────
// Invocado por pago.service.js al realizar un reembolso
const procesarReembolso = async (pedidoId, txReembolsoId, opts = {}) => {
  const { esTotal = false, transaction } = opts;

  const t = transaction || (await db.sequelize.transaction());

  try {
    const pedido = await db.pedido.findByPk(pedidoId, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!pedido) throw AppError.noEncontrado ? AppError.noEncontrado("Pedido") : new AppError("Pedido no encontrado", 404);

    const estadoAnterior = pedido.estado;

    if (esTotal) {
      // 1. Marcar pedido como ANULADO
      await pedido.update({ estado: "ANULADO" }, { transaction: t });

      // 2. Liberar existencias comprometidas en Inventario si aún estaban reservadas
      const detalles = await db.pedido_detalle.findAll({
        where: { pedido_id: pedidoId },
        transaction: t,
      });
      pedido.pedido_detalles = detalles;
      for (const detalle of pedido.pedido_detalles) {
        const existencia = await db.existencia.findOne({
          where: { variante_id: detalle.variante_id, sucursal_id: pedido.sucursal_id },
          transaction: t
        });

        if (existencia && existencia.cantidad_comprometida > 0) {
          await existencia.decrement("cantidad_comprometida", {
            by: Math.min(detalle.cantidad, existencia.cantidad_comprometida),
            transaction: t
          });
        }
      }

      // 3. Historial de anulación por reembolso total
      await db.pedido_historial.create(
        {
          pedido_id: pedidoId,
          estado_anterior: estadoAnterior,
          estado_nuevo: "ANULADO",
          motivo: `Reembolso total procesado (Transacción: ${txReembolsoId})`,
          usuario_id: null
        },
        { transaction: t }
      );
    } else {
      // Reembolso parcial: solo registrar en historial
      await db.pedido_historial.create(
        {
          pedido_id: pedidoId,
          estado_anterior: estadoAnterior,
          estado_nuevo: pedido.estado,
          motivo: `Reembolso parcial procesado (Transacción: ${txReembolsoId})`,
          usuario_id: null
        },
        { transaction: t }
      );
    }

    if (!transaction) await t.commit();
    return pedido;
  } catch (err) {
    if (!transaction) await t.rollback();
    throw err;
  }
};

module.exports = {
  listar,
  obtener,
  crear,
  cambiarEstado,
  anular,
  cargarMasivo,
  generarHojaRecoleccion,
  confirmarPago,
  revertirPago,
  procesarReembolso
};