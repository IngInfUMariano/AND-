"use strict";

const db               = require("../../../loaders/models.loader");
const AppError         = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

const SORTABLES = ["created_at", "estado", "total"];

// Helper interno para generar el número correlativo único de pedido
const _generarNumeroPedido = () => `PED-${Date.now().toString().slice(-8)}`;

// ─── listar ──────────────────────────────────────────────────────────────────
const listar = async (query, usuario) => {
  const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);
  const where = {};

  if (usuario.app === "tienda") {
    where.cliente_id = usuario.id;
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

// En src/modules/pedidos/services/pedido.service.js

// ─── obtener ─────────────────────────────────────────────────────────────────
const obtener = async (id, usuario) => {
  const pedido = await db.pedido.findByPk(id, {
    include: [
      {
        model: db.pedido_detalle,
        include: [{ model: db.variante }] // <-- Sin alias 'as'
      },
      { model: db.pedido_historial }
    ]
  });

  if (!pedido) throw new AppError("Pedido no encontrado", 404);

  if (usuario.app === "tienda" && pedido.cliente_id !== usuario.id) {
    throw new AppError("No tienes permisos para ver este pedido", 403);
  }

  return pedido;
};

// ─── crear (Checkout desde carrito) ──────────────────────────────────────────
// ─── crear (Checkout desde carrito) ──────────────────────────────────────────
const crear = async (clienteId, datos) => {
  const {
    sucursal_id,
    zona_envio_id, // <--- ID de la zona seleccionada por el cliente
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

    // 2. Obtener carrito activo y sus detalles
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

    // 3. Obtener el costo de envío si aplica
    let costoEnvio = 0;
    if (entrega_tipo === "ENVIO" && zona_envio_id) {
      const zona = await db.zona_envio.findByPk(zona_envio_id, { transaction: t });
      if (!zona || !zona.activo) {
        throw new AppError("La zona de envío seleccionada no existe o no está activa", 400);
      }
      costoEnvio = Number(zona.costo);
    }

    // 4. Calcular subtotal de las líneas
    let subtotal = 0;
    const itemsProcesados = [];

    for (const item of carrito.carrito_detalles) {
      const variante = await db.variante.findByPk(item.variante_id, {
        include: [{ model: db.producto }],
        transaction: t
      });

      if (!variante) {
        throw new AppError(`La variante ${item.variante_id} no existe`, 404);
      }

      const precioUnitario = Number(variante.precio_venta);
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

    // 5. Crear cabecera del pedido incluyendo subtotal, costo_envio y total
    const pedido = await db.pedido.create({
      numero: _generarNumeroPedido(),
      cliente_id: clienteId,
      sucursal_id,
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
    }, { transaction: t });

    // 6. Guardar líneas del detalle
    for (const item of itemsProcesados) {
      await db.pedido_detalle.create({
        pedido_id: pedido.id,
        variante_id: item.variante_id,
        sku: item.sku,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal
      }, { transaction: t });
    }

    // 7. Registro de historial
    await db.pedido_historial.create({
      pedido_id: pedido.id,
      estado_anterior: null,
      estado_nuevo: "REGISTRADO",
      motivo: "Pedido creado desde la tienda en línea"
    }, { transaction: t });

    // 8. Limpiar carrito
    await db.carrito_detalle.destroy({ where: { carrito_id: carrito.id }, transaction: t });
    await carrito.update({ activo: false }, { transaction: t });

    return pedido;
  });
};
// ─── cambiarEstado ───────────────────────────────────────────────────────────
const cambiarEstado = async (id, nuevoEstado, observacion, usuario) => {
  const estadoUpper = nuevoEstado.toUpperCase();

  return await db.sequelize.transaction(async (t) => {
    const pedido = await db.pedido.findByPk(id, { transaction: t });
    if (!pedido) throw new AppError("Pedido no encontrado", 404);

    if (pedido.estado === "ANULADO" || pedido.estado === "ENTREGADO") {
      throw AppError.reglaNegocio("No se puede cambiar el estado de un pedido finalizado", [
        `El pedido se encuentra actualmente en estado '${pedido.estado}'`
      ]);
    }

    const estadoAnterior = pedido.estado;
    await pedido.update({ estado: estadoUpper }, { transaction: t });

    await db.pedido_historial.create({
      pedido_id: pedido.id,
      estado_anterior: estadoAnterior,
      estado_nuevo: estadoUpper,
      motivo: observacion || `Cambio de estado a ${estadoUpper}`,
      usuario_id: usuario.id
    }, { transaction: t });

    return pedido;
  });
};

// ─── anular ──────────────────────────────────────────────────────────────────
const anular = async (id, motivo, usuario) => {
  return await db.sequelize.transaction(async (t) => {
    const pedido = await db.pedido.findByPk(id, { transaction: t });
    if (!pedido) throw new AppError("Pedido no encontrado", 404);

    if (pedido.estado === "ENTREGADO") {
      throw AppError.reglaNegocio("No se puede anular un pedido que ya fue entregado", []);
    }

    const estadoAnterior = pedido.estado;
    await pedido.update({
      estado: "ANULADO",
      motivo_anulacion: motivo
    }, { transaction: t });

    await db.pedido_historial.create({
      pedido_id: pedido.id,
      estado_anterior: estadoAnterior,
      estado: "ANULADO",
      motivo: `ANULACIÓN: ${motivo}`,
      usuario_id: usuario.id
    }, { transaction: t });

    return pedido;
  });
};

const cargarMasivo = async (clienteId, archivo) => {
  if (!archivo) throw new AppError("No se proporcionó ningún archivo CSV", 400);
  return { mensaje: "Procesamiento masivo de pedidos en construcción" };
};

module.exports = {
  listar,
  obtener,
  crear,
  cambiarEstado,
  anular,
  cargarMasivo
};