// pago.service.js — lógica de negocio del módulo de pagos.
//
// Arquitectura: Stripe Payment Intents + Stripe Elements.
// El número de tarjeta NUNCA pasa por este servidor: el navegador lo envía
// directamente a Stripe. Nosotros solo manejamos Payment Intents y webhooks.
//
// IMPORTANTE: ningún campo de tarjeta (número, CVV, vencimiento) se almacena
// ni se registra en logs. Cumple RNF-SEG-08 / PCI-DSS.

"use strict";

const { Op }           = require("sequelize");
const db               = require("../../../loaders/models.loader");
const AppError         = require("../../../core/utils/AppError");
const registrarBitacora = require("../../../core/utils/registrarBitacora");
const { parsearPaginacion } = require("../../../core/utils/paginacion");
const pedidoService    = require("../../pedidos/services/pedido.service");
const enviarCorreo     = require("../../../core/utils/enviarCorreo");

// La moneda se configura por variable de entorno. Stripe requiere minúsculas.
const MONEDA_STRIPE = (process.env.STRIPE_CURRENCY || "GTQ").toLowerCase();

const SORTABLES_TX = ["fecha", "monto", "estado", "tipo"];

// ─── _getStripe ───────────────────────────────────────────────────────────────
// Inicialización diferida: permite que el módulo cargue aunque falte la clave
// (por ejemplo en pruebas que no tocan endpoints de Stripe).
// Lanza un error 500 claro si se intenta usar Stripe sin configuración.
const _getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new AppError(
      "Stripe no está configurado. Define STRIPE_SECRET_KEY en las variables de entorno.",
      500
    );
  }
  return require("stripe")(process.env.STRIPE_SECRET_KEY);
};

// ─── _clienteIdDeUsuario ──────────────────────────────────────────────────────
// Resuelve el cliente_id del usuario autenticado desde la BD.
// El JWT no incluye cliente_id para mantener su tamaño pequeño.
// Lanza 403 si el usuario no tiene cliente vinculado.
const _clienteIdDeUsuario = async (usuarioId) => {
  const usuario = await db.usuario.findByPk(usuarioId, {
    attributes: ["cliente_id"],
  });
  if (!usuario || !usuario.cliente_id) {
    throw AppError.sinPermiso("Esta operación es solo para clientes de la tienda");
  }
  return usuario.cliente_id;
};

// Convierte quetzales a centavos enteros para Stripe.
// GTQ usa 2 decimales: Q100.50 → 10050.
const _aCentavos = (monto) => Math.round(parseFloat(monto) * 100);

// ─── obtenerFormasPago ────────────────────────────────────────────────────────
// Devuelve las formas de pago disponibles según el tipo de cliente.
//   MINORISTA                              → [EN_LINEA]
//   MAYORISTA con crédito suficiente       → [EN_LINEA, CREDITO]
//   MAYORISTA sin crédito suficiente       → [EN_LINEA]
const obtenerFormasPago = async (pedidoId, usuarioId) => {
  const clienteId = await _clienteIdDeUsuario(usuarioId);

  const pedido = await db.pedido.findByPk(pedidoId, {
    include: [{ model: db.cliente }],
  });
  if (!pedido) throw AppError.noEncontrado("Pedido");

  if (pedido.cliente_id !== clienteId) {
    throw AppError.sinPermiso("No tienes permiso para ver las formas de pago de este pedido");
  }

  const cliente   = pedido.cliente;
  const formas    = ["EN_LINEA"];

  let creditoDisponible = null;
  if (cliente.tipo === "MAYORISTA") {
    const disponible =
      parseFloat(cliente.limite_credito) - parseFloat(cliente.credito_utilizado);
    creditoDisponible = disponible;
    if (disponible >= parseFloat(pedido.total)) {
      formas.push("CREDITO");
    }
  }

  return {
    pedido_id:         parseInt(pedidoId, 10),
    total:             parseFloat(pedido.total),
    tipo_cliente:      cliente.tipo,
    formas_pago:       formas,
    credito_disponible: creditoDisponible,
  };
};

// ─── crearIntencion ───────────────────────────────────────────────────────────
// Crea un PaymentIntent en Stripe y registra la transacción en estado PENDIENTE.
// Reglas críticas:
//   - El monto se calcula SIEMPRE desde el pedido en BD. No se acepta monto del cliente.
//   - Si ya existe un PaymentIntent pendiente para el pedido, se reutiliza (idempotencia).
//   - Solo el cliente propietario del pedido puede iniciar el pago.
const crearIntencion = async (pedidoId, usuarioId) => {
  const clienteId = await _clienteIdDeUsuario(usuarioId);

  const pedido = await db.pedido.findByPk(pedidoId);
  if (!pedido) throw AppError.noEncontrado("Pedido");

  if (pedido.cliente_id !== clienteId) {
    throw AppError.sinPermiso("No tienes permiso para iniciar el pago de este pedido");
  }

  const estadosTerminales = ["PAGADO", "ANULADO", "ENTREGADO"];
  if (estadosTerminales.includes(pedido.estado)) {
    throw AppError.reglaNegocio(
      "El pedido no puede iniciar un pago en su estado actual",
      [`Estado actual: ${pedido.estado}`]
    );
  }

  if (pedido.forma_pago !== "EN_LINEA") {
    throw AppError.reglaNegocio("Este pedido no utiliza pago en línea", []);
  }

  // Idempotencia: reutilizar PaymentIntent pendiente si ya existe para este pedido
  const txExistente = await db.transaccion_pago.findOne({
    where: {
      pedido_id: pedidoId,
      proveedor: "STRIPE",
      tipo:      "PAGO",
      estado:    "PENDIENTE",
    },
  });

  if (txExistente) {
    // Recuperar el client_secret vigente desde Stripe (puede haber expirado el anterior)
    const stripe = _getStripe();
    const pi     = await stripe.paymentIntents.retrieve(txExistente.id_externo);
    return {
      client_secret: pi.client_secret,
      monto:         parseFloat(txExistente.monto),
    };
  }

  // Monto calculado en el servidor — nunca enviado por el cliente
  const montoOriginal  = parseFloat(pedido.total);
  const montoCentavos  = _aCentavos(montoOriginal);

  const stripe = _getStripe();
  const paymentIntent = await stripe.paymentIntents.create({
    amount:   montoCentavos,
    currency: MONEDA_STRIPE,
    metadata: { pedido_id: String(pedidoId) },
  });

  await db.transaccion_pago.create({
    pedido_id:       pedidoId,
    proveedor:       "STRIPE",
    id_externo:      paymentIntent.id,
    tipo:            "PAGO",
    monto:           montoOriginal,
    moneda:          MONEDA_STRIPE.toUpperCase(),
    estado:          "PENDIENTE",
    respuesta_cruda: { id: paymentIntent.id, status: paymentIntent.status },
  });

  return {
    client_secret: paymentIntent.client_secret,
    monto:         montoOriginal,
  };
};

// ─── procesarWebhook ──────────────────────────────────────────────────────────
// Verifica la firma HMAC de Stripe y despacha el evento al manejador correcto.
// Es idempotente: recibir el mismo evento dos veces no produce efectos duplicados.
// Debe recibir el body CRUDO (Buffer), no parseado como JSON.
const procesarWebhook = async (rawBody, signature, ip) => {
  const stripe = _getStripe();

  let evento;
  try {
    evento = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    // Firma inválida — puede ser un intento no autorizado; se registra en bitácora
    await registrarBitacora({
      usuario_id:    null,
      operacion:     "WEBHOOK_FIRMA_INVALIDA",
      entidad:       "transaccion_pago",
      valores_nuevos: { razon: err.message, signature: String(signature).slice(0, 40) },
      ip,
    });
    throw new AppError("Firma del webhook inválida", 400);
  }

  const { type, data } = evento;
  const paymentIntent  = data.object;

  if (type === "payment_intent.succeeded") {
    await _manejarPagoExitoso(paymentIntent);
  } else if (type === "payment_intent.payment_failed") {
    await _manejarPagoFallido(paymentIntent);
  }
  // Otros eventos se aceptan y se ignoran; Stripe no reintenta si responde 200.

  return { recibido: true };
};

// Construye y envía la factura HTML al email del cliente tras confirmar el pago.
const _enviarFactura = async (pedidoId) => {
  const pedido = await db.pedido.findByPk(pedidoId, {
    include: [
      { model: db.pedido_detalle },
      { model: db.cliente, attributes: ["nombre", "email", "nit"] },
    ],
  });
  if (!pedido || !pedido.cliente?.email) return;

  const fecha = new Date(pedido.created_at).toLocaleDateString("es-GT", {
    year: "numeric", month: "long", day: "numeric",
  });

  const filas = (pedido.pedido_detalles || []).map((d) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${d.descripcion}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${d.sku}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${d.cantidad}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">Q ${parseFloat(d.precio_unitario).toFixed(2)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">Q ${parseFloat(d.subtotal).toFixed(2)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Factura ${pedido.numero}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;color:#222">
  <div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #e0e0e0">
    <div style="background:#0a0a0a;color:#fff;padding:24px 32px">
      <h1 style="margin:0;font-size:22px;letter-spacing:0.1em">AND&</h1>
      <p style="margin:4px 0 0;font-size:12px;opacity:0.6">BOLETA DE VENTA</p>
    </div>
    <div style="padding:24px 32px">
      <table style="width:100%;font-size:13px;margin-bottom:20px">
        <tr>
          <td><strong>Pedido:</strong> ${pedido.numero}</td>
          <td style="text-align:right"><strong>Fecha:</strong> ${fecha}</td>
        </tr>
        <tr>
          <td><strong>Cliente:</strong> ${pedido.cliente.nombre}</td>
          <td style="text-align:right"><strong>NIT:</strong> ${pedido.cliente.nit || "CF"}</td>
        </tr>
      </table>
      <table style="width:100%;font-size:13px;border-collapse:collapse">
        <thead>
          <tr style="background:#f9f9f9">
            <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd">Descripción</th>
            <th style="padding:8px;text-align:center;border-bottom:2px solid #ddd">SKU</th>
            <th style="padding:8px;text-align:center;border-bottom:2px solid #ddd">Cant.</th>
            <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd">Precio unit.</th>
            <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd">Subtotal</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <table style="width:100%;font-size:13px;margin-top:12px">
        ${parseFloat(pedido.costo_envio) > 0
          ? `<tr><td style="text-align:right;padding:4px 8px">Envío:</td><td style="text-align:right;padding:4px 8px">Q ${parseFloat(pedido.costo_envio).toFixed(2)}</td></tr>`
          : ""}
        <tr>
          <td style="text-align:right;padding:8px;font-weight:bold;font-size:15px">TOTAL:</td>
          <td style="text-align:right;padding:8px;font-weight:bold;font-size:15px">Q ${parseFloat(pedido.total).toFixed(2)}</td>
        </tr>
      </table>
    </div>
    <div style="background:#f9f9f9;padding:16px 32px;font-size:11px;color:#888;text-align:center">
      Puedes ver y descargar tu factura en la sección Mis Pedidos de nuestra tienda.
    </div>
  </div>
</body>
</html>`;

  await enviarCorreo({
    destinatario: pedido.cliente.email,
    asunto:       `Factura pedido ${pedido.numero} — AND&`,
    html,
  });
};

// Marca la transacción como EXITOSA y confirma el pedido en una sola transacción BD.
// Si confirmarPago falla, el rollback deja tx en PENDIENTE y Stripe puede reintentar.
// Idempotencia: si ya está EXITOSA, no hace nada (el evento duplicado no genera efectos).
const _manejarPagoExitoso = async (paymentIntent) => {
  const tx = await db.transaccion_pago.findOne({
    where: { id_externo: paymentIntent.id },
  });

  if (!tx || tx.estado === "EXITOSA") return; // ya procesado

  const t = await db.sequelize.transaction();
  try {
    await tx.update({
      estado:            "EXITOSA",
      mensaje_proveedor: "Payment succeeded",
      respuesta_cruda:   { id: paymentIntent.id, status: paymentIntent.status },
    }, { transaction: t });

    await pedidoService.confirmarPago(tx.pedido_id, tx.id, {
      motivo:      "Webhook Stripe confirmado",
      transaction: t,
    });

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  try { await _enviarFactura(tx.pedido_id); } catch (e) { console.error("[EMAIL factura]", e.message); }
};

// Marca la transacción como RECHAZADA.
// Idempotencia: si ya está RECHAZADA, no hace nada.
const _manejarPagoFallido = async (paymentIntent) => {
  const tx = await db.transaccion_pago.findOne({
    where: { id_externo: paymentIntent.id },
  });

  if (!tx || tx.estado === "RECHAZADA") return; // ya procesado

  const motivo = paymentIntent.last_payment_error?.message || "Payment failed";

  await tx.update({
    estado:            "RECHAZADA",
    mensaje_proveedor: motivo,
    respuesta_cruda:   { id: paymentIntent.id, status: paymentIntent.status },
  });

  await pedidoService.revertirPago(tx.pedido_id, { motivo });
};

// ─── listarTransacciones ──────────────────────────────────────────────────────
// Listado de transacciones con filtros opcionales. Solo ADMIN.
// Filtros disponibles: pedido_id, estado, tipo, proveedor, fecha_desde, fecha_hasta.
const listarTransacciones = async (query) => {
  const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES_TX);

  const where = {};
  if (query.pedido_id) where.pedido_id = parseInt(query.pedido_id, 10);
  if (query.estado)    where.estado    = query.estado;
  if (query.tipo)      where.tipo      = query.tipo;
  if (query.proveedor) where.proveedor = query.proveedor;

  if (query.fecha_desde || query.fecha_hasta) {
    where.fecha = {};
    if (query.fecha_desde) where.fecha[Op.gte] = new Date(query.fecha_desde);
    if (query.fecha_hasta) {
      const hasta = new Date(query.fecha_hasta);
      hasta.setHours(23, 59, 59, 999);
      where.fecha[Op.lte] = hasta;
    }
  }

  const { rows, count } = await db.transaccion_pago.findAndCountAll({
    where,
    limit,
    offset,
    order: order.length ? order : [["fecha", "desc"]],
    include: [
      { model: db.pedido, attributes: ["id", "numero", "total"] },
    ],
  });

  return { rows, count, page, limit };
};

// ─── reembolsar ───────────────────────────────────────────────────────────────
// Genera un reembolso total o parcial vía Stripe.
// motivo obligatorio (validado en el validator).
// Si el reembolso es total, la transacción original pasa a REEMBOLSADA.
const reembolsar = async (id, datos) => {
  const tx = await db.transaccion_pago.findByPk(id);
  if (!tx) throw AppError.noEncontrado("Transacción de pago");

  if (tx.tipo !== "PAGO" || tx.estado !== "EXITOSA") {
    throw AppError.reglaNegocio(
      "Solo se pueden reembolsar transacciones de pago exitosas",
      [`Tipo: ${tx.tipo}, Estado: ${tx.estado}`]
    );
  }

  const montoOriginal   = parseFloat(tx.monto);
  const montoReembolso  = datos.monto ? parseFloat(datos.monto) : montoOriginal;

  if (montoReembolso <= 0 || montoReembolso > montoOriginal) {
    throw AppError.reglaNegocio(
      "El monto del reembolso debe ser mayor a 0 y no superar el monto original",
      [`Monto original: Q${montoOriginal.toFixed(2)}, Solicitado: Q${montoReembolso.toFixed(2)}`]
    );
  }

  const stripe = _getStripe();
  const refund = await stripe.refunds.create({
    payment_intent: tx.id_externo,
    amount:         _aCentavos(montoReembolso),
    reason:         "requested_by_customer",
  });

  const esTotal = montoReembolso >= montoOriginal;

  const t = await db.sequelize.transaction();
  try {
    const txReembolso = await db.transaccion_pago.create({
      pedido_id:             tx.pedido_id,
      proveedor:             "STRIPE",
      id_externo:            refund.id,
      tipo:                  "REEMBOLSO",
      transaccion_origen_id: tx.id,
      monto:                 montoReembolso,
      moneda:                tx.moneda,
      estado:                "EXITOSA",
      mensaje_proveedor:     "Refund issued",
      respuesta_cruda:       { id: refund.id, status: refund.status },
      motivo:                datos.motivo,
    }, { transaction: t });

    if (esTotal) {
      await tx.update({ estado: "REEMBOLSADA" }, { transaction: t });
    }

    await pedidoService.procesarReembolso(tx.pedido_id, txReembolso.id, {
      esTotal,
      transaction: t,
    });

    await t.commit();
    return txReembolso;
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

// ─── pagarConCredito ──────────────────────────────────────────────────────────
// Registra un pedido mayorista al crédito del cliente.
// No pasa por Stripe. Valida crédito disponible y crea el movimiento CARGO.
const pagarConCredito = async (pedidoId, usuarioId) => {
  const clienteId = await _clienteIdDeUsuario(usuarioId);

  const pedido = await db.pedido.findByPk(pedidoId, {
    include: [{ model: db.cliente }],
  });
  if (!pedido) throw AppError.noEncontrado("Pedido");

  if (pedido.cliente_id !== clienteId) {
    throw AppError.sinPermiso("No tienes permiso para operar sobre este pedido");
  }

  const cliente = pedido.cliente;

  if (cliente.tipo !== "MAYORISTA") {
    throw AppError.reglaNegocio(
      "El pago con crédito solo está disponible para clientes mayoristas",
      []
    );
  }

  const estadosTerminales = ["PAGADO", "ANULADO", "ENTREGADO"];
  if (estadosTerminales.includes(pedido.estado)) {
    throw AppError.reglaNegocio(
      "El pedido no puede procesarse en su estado actual",
      [`Estado actual: ${pedido.estado}`]
    );
  }

  const total      = parseFloat(pedido.total);
  const utilizado  = parseFloat(cliente.credito_utilizado);
  const limite     = parseFloat(cliente.limite_credito);
  const disponible = limite - utilizado;

  if (disponible < total) {
    throw AppError.reglaNegocio(
      "Crédito disponible insuficiente para cubrir el total del pedido",
      [
        `Disponible: Q${disponible.toFixed(2)}`,
        `Total del pedido: Q${total.toFixed(2)}`,
      ]
    );
  }

  const nuevoCreditoUtilizado = utilizado + total;

  const t = await db.sequelize.transaction();
  try {
    await db.credito_movimiento.create({
      cliente_id:       clienteId,
      tipo:             "CARGO",
      pedido_id:        pedidoId,
      monto:            total,
      saldo_resultante: nuevoCreditoUtilizado,
      referencia:       `Pedido ${pedido.numero}`,
      usuario_id:       usuarioId,
    }, { transaction: t });

    await cliente.update(
      { credito_utilizado: nuevoCreditoUtilizado },
      { transaction: t }
    );

    await pedidoService.confirmarPago(pedidoId, null, {
      formaPago: "CREDITO",
      motivo:    "Crédito mayorista autorizado",
      transaction: t,
    });

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  try { await _enviarFactura(pedidoId); } catch (e) { console.error("[EMAIL factura]", e.message); }

  return {
    pedido_id:          parseInt(pedidoId, 10),
    credito_utilizado:  nuevoCreditoUtilizado,
    credito_disponible: limite - nuevoCreditoUtilizado,
  };
};

// ─── registrarAbono ───────────────────────────────────────────────────────────
// Registra un abono al crédito de un cliente. Solo ADMIN.
// No puede abonar más de lo que el cliente debe (credito_utilizado).
const registrarAbono = async (clienteId, datos, usuarioId) => {
  const cliente = await db.cliente.findByPk(clienteId);
  if (!cliente) throw AppError.noEncontrado("Cliente");

  const utilizado = parseFloat(cliente.credito_utilizado);
  const monto     = parseFloat(datos.monto);

  if (monto > utilizado) {
    throw AppError.reglaNegocio(
      "El abono no puede superar el saldo de crédito utilizado",
      [
        `Crédito utilizado: Q${utilizado.toFixed(2)}`,
        `Abono solicitado: Q${monto.toFixed(2)}`,
      ]
    );
  }

  const nuevoCreditoUtilizado = utilizado - monto;

  const t = await db.sequelize.transaction();
  try {
    const movimiento = await db.credito_movimiento.create({
      cliente_id:       parseInt(clienteId, 10),
      tipo:             "ABONO",
      pedido_id:        datos.pedido_id || null,
      monto,
      saldo_resultante: nuevoCreditoUtilizado,
      referencia:       datos.referencia || null,
      usuario_id:       usuarioId,
    }, { transaction: t });

    await cliente.update(
      { credito_utilizado: nuevoCreditoUtilizado },
      { transaction: t }
    );

    await t.commit();
    return movimiento;
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

// ─── obtenerEstadoCuenta ──────────────────────────────────────────────────────
// Devuelve el resumen de crédito y el historial de movimientos paginado.
const obtenerEstadoCuenta = async (clienteId, query) => {
  const cliente = await db.cliente.findByPk(clienteId, {
    attributes: ["id", "nombre", "tipo", "limite_credito", "credito_utilizado"],
  });
  if (!cliente) throw AppError.noEncontrado("Cliente");

  const { limit, offset, page } = parsearPaginacion(query, ["fecha", "monto", "tipo"]);

  const { rows, count } = await db.credito_movimiento.findAndCountAll({
    where: { cliente_id: clienteId },
    limit,
    offset,
    order:   [["fecha", "desc"]],
    include: [
      { model: db.pedido,  attributes: ["id", "numero"],  required: false },
      { model: db.usuario, attributes: ["id", "email"],   required: false },
    ],
  });

  const utilizado  = parseFloat(cliente.credito_utilizado);
  const limite     = parseFloat(cliente.limite_credito);

  return {
    cliente: {
      id:                cliente.id,
      nombre:            cliente.nombre,
      tipo:              cliente.tipo,
      limite_credito:    limite,
      credito_utilizado: utilizado,
      disponible:        Math.max(0, limite - utilizado),
    },
    movimientos: rows,
    meta: {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
    },
  };
};

module.exports = {
  obtenerFormasPago,
  crearIntencion,
  procesarWebhook,
  listarTransacciones,
  reembolsar,
  pagarConCredito,
  registrarAbono,
  obtenerEstadoCuenta,
};
