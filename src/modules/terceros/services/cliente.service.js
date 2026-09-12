// cliente.service.js — lógica de negocio del recurso clientes y sus direcciones.
//
// generarCodigo() se exporta también para que auth.service.js lo reutilice
// sin duplicar la lógica de numeración.
"use strict";

const { Op } = require("sequelize");
const db     = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

const SORTABLES = ["codigo", "nombre", "tipo", "estado", "created_at", "activo"];

// ─── generarCodigo ────────────────────────────────────────────────────────────
// Genera el próximo código CLI-XXXX.
// La race condition es aceptable: la UNIQUE constraint de la BD rechaza duplicados.
const generarCodigo = async () => {
  const count = await db.cliente.count();
  return `CLI-${String(count + 1).padStart(4, "0")}`;
};

// ─── listar ───────────────────────────────────────────────────────────────────
const listar = async (query) => {
  const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);
  const where = {};

  if (query.q) {
    where[Op.or] = [
      { nombre:          { [Op.iLike]: `%${query.q}%` } },
      { nombre_comercial:{ [Op.iLike]: `%${query.q}%` } },
      { email:           { [Op.iLike]: `%${query.q}%` } },
      { codigo:          { [Op.iLike]: `%${query.q}%` } },
      { nit:             { [Op.iLike]: `%${query.q}%` } },
    ];
  }

  if (query.tipo)   where.tipo   = query.tipo;
  if (query.estado) where.estado = query.estado;

  if      (query.activo === "false") where.activo = false;
  else if (query.activo === "todos") { /* sin filtro */ }
  else                               where.activo = true;

  const { rows, count } = await db.cliente.findAndCountAll({
    where,
    limit,
    offset,
    order: order.length ? order : [["nombre", "asc"]],
  });

  return { rows, count, page, limit };
};

// ─── listarPendientes ─────────────────────────────────────────────────────────
// Devuelve solicitudes de mayoristas pendientes de aprobación.
const listarPendientes = async (query) => {
  const { limit, offset, page } = parsearPaginacion(query, SORTABLES);

  const { rows, count } = await db.cliente.findAndCountAll({
    where:  { estado: "PENDIENTE", tipo: "MAYORISTA" },
    limit,
    offset,
    order:  [["created_at", "asc"]],
  });

  return { rows, count, page, limit };
};

// ─── obtener ──────────────────────────────────────────────────────────────────
const obtener = async (id) => {
  const cliente = await db.cliente.findByPk(id, {
    include: [
      {
        model:      db.usuario,
        as:         "aprobador",
        attributes: ["id", "email"],
      },
    ],
  });
  if (!cliente) throw AppError.noEncontrado("Cliente");
  return cliente;
};

// ─── crear ────────────────────────────────────────────────────────────────────
// El admin crea clientes directamente (estado configurable).
const crear = async (datos) => {
  const codigo = await generarCodigo();
  const {
    tipo, nombre, nombre_comercial, nit, email, telefono, direccion_fiscal,
    contacto_nombre, estado, limite_credito, plazo_credito_dias,
    terminos_aceptados_en, version_terminos,
  } = datos;

  return db.cliente.create({
    codigo,
    tipo:                  tipo || "MINORISTA",
    nombre,
    nombre_comercial:      nombre_comercial || null,
    nit:                   nit || null,
    email,
    telefono:              telefono || null,
    direccion_fiscal:      direccion_fiscal || null,
    contacto_nombre:       contacto_nombre || null,
    estado:                estado || "PENDIENTE",
    limite_credito:        limite_credito ?? 0,
    plazo_credito_dias:    plazo_credito_dias ?? 0,
    activo:                true,
    terminos_aceptados_en: terminos_aceptados_en || null,
    version_terminos:      version_terminos || null,
  });
};

// ─── actualizar ───────────────────────────────────────────────────────────────
const actualizar = async (id, datos) => {
  const cliente = await db.cliente.findByPk(id);
  if (!cliente) throw AppError.noEncontrado("Cliente");

  const editables = [
    "nombre", "nombre_comercial", "nit", "email", "telefono",
    "direccion_fiscal", "contacto_nombre",
    // Condiciones comerciales — el controlador filtra según perfil
    "tipo", "limite_credito", "plazo_credito_dias",
  ];
  const campos = {};
  for (const c of editables) {
    if (c in datos) campos[c] = datos[c];
  }

  return cliente.update(campos);
};

// ─── desactivar ───────────────────────────────────────────────────────────────
// Reglas:
//   - No desactivar con pedidos pendientes de entrega.
//   - No desactivar con crédito utilizado > 0.
const desactivar = async (id) => {
  const cliente = await db.cliente.findByPk(id);
  if (!cliente) throw AppError.noEncontrado("Cliente");

  const estadosActivos = ["REGISTRADO", "PENDIENTE_PAGO", "PAGADO", "EN_PREPARACION", "DESPACHADO"];
  const pedidosActivos = await db.pedido.count({
    where: { cliente_id: id, estado: { [Op.in]: estadosActivos } },
  });
  if (pedidosActivos > 0) {
    throw AppError.reglaNegocio(
      "No se puede desactivar un cliente con pedidos pendientes de entrega",
      [`El cliente tiene ${pedidosActivos} pedido(s) pendiente(s)`]
    );
  }

  if (parseFloat(cliente.credito_utilizado) > 0) {
    throw AppError.reglaNegocio(
      "No se puede desactivar un cliente con saldo de crédito utilizado",
      [`Crédito utilizado: Q${cliente.credito_utilizado}`]
    );
  }

  await cliente.update({ activo: false, estado: "INACTIVO" });
};

// ─── aprobar ──────────────────────────────────────────────────────────────────
// Aprueba una solicitud de cliente mayorista.
// Registra quién aprobó y la fecha. Establece condiciones de crédito.
const aprobar = async (id, datos, usuarioAprobadorId) => {
  const cliente = await db.cliente.findByPk(id);
  if (!cliente) throw AppError.noEncontrado("Cliente");

  if (cliente.estado !== "PENDIENTE") {
    throw AppError.reglaNegocio(
      "Solo se pueden aprobar clientes en estado PENDIENTE",
      [`Estado actual: ${cliente.estado}`]
    );
  }

  const { limite_credito, plazo_credito_dias } = datos;

  return cliente.update({
    estado:            "APROBADO",
    aprobado_por:      usuarioAprobadorId,
    fecha_aprobacion:  new Date(),
    limite_credito:    limite_credito ?? 0,
    plazo_credito_dias: plazo_credito_dias ?? 0,
  });
};

// ─── rechazar ─────────────────────────────────────────────────────────────────
const rechazar = async (id, motivo) => {
  const cliente = await db.cliente.findByPk(id);
  if (!cliente) throw AppError.noEncontrado("Cliente");

  if (cliente.estado !== "PENDIENTE") {
    throw AppError.reglaNegocio(
      "Solo se pueden rechazar clientes en estado PENDIENTE",
      [`Estado actual: ${cliente.estado}`]
    );
  }

  return cliente.update({ estado: "RECHAZADO", motivo_rechazo: motivo });
};

// ─── obtenerCredito ───────────────────────────────────────────────────────────
// El disponible se calcula, no se almacena como campo suelto.
const obtenerCredito = async (id) => {
  const cliente = await db.cliente.findByPk(id, {
    attributes: ["id", "nombre", "limite_credito", "credito_utilizado"],
  });
  if (!cliente) throw AppError.noEncontrado("Cliente");

  const limite    = parseFloat(cliente.limite_credito);
  const utilizado = parseFloat(cliente.credito_utilizado);
  const disponible = Math.max(0, limite - utilizado);

  return {
    cliente_id:       cliente.id,
    nombre:           cliente.nombre,
    limite_credito:   limite,
    credito_utilizado: utilizado,
    disponible,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECCIONES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── listarDirecciones ────────────────────────────────────────────────────────
const listarDirecciones = async (clienteId, query = {}) => {
  const cliente = await db.cliente.findByPk(clienteId);
  if (!cliente) throw AppError.noEncontrado("Cliente");

  const where = { cliente_id: clienteId };

  if      (query.activo === "false") where.activo = false;
  else if (query.activo === "todos") { /* sin filtro */ }
  else                               where.activo = true;

  return db.direccion_cliente.findAll({
    where,
    include: [{ model: db.zona_envio, attributes: ["id", "nombre", "costo"] }],
    order:   [["es_predeterminada", "desc"], ["created_at", "asc"]],
  });
};

// ─── crearDireccion ───────────────────────────────────────────────────────────
// Si es_predeterminada=true desmarca la anterior.
const crearDireccion = async (clienteId, datos) => {
  const cliente = await db.cliente.findByPk(clienteId);
  if (!cliente) throw AppError.noEncontrado("Cliente");

  const { alias, destinatario, direccion, referencia, municipio,
          departamento, telefono, zona_envio_id, es_predeterminada } = datos;

  if (es_predeterminada) {
    await db.direccion_cliente.update(
      { es_predeterminada: false },
      { where: { cliente_id: clienteId, es_predeterminada: true } }
    );
  }

  return db.direccion_cliente.create({
    cliente_id: clienteId,
    alias, destinatario, direccion,
    referencia:        referencia || null,
    municipio, departamento,
    telefono:          telefono || null,
    zona_envio_id:     zona_envio_id || null,
    es_predeterminada: es_predeterminada || false,
    activo:            true,
  });
};

// ─── actualizarDireccion ──────────────────────────────────────────────────────
// Verifica que la dirección pertenezca al cliente del parámetro.
const actualizarDireccion = async (clienteId, direccionId, datos) => {
  const dir = await db.direccion_cliente.findOne({
    where: { id: direccionId, cliente_id: clienteId },
  });
  if (!dir) throw AppError.noEncontrado("Dirección");

  if (datos.es_predeterminada) {
    await db.direccion_cliente.update(
      { es_predeterminada: false },
      { where: { cliente_id: clienteId, es_predeterminada: true, id: { [Op.ne]: direccionId } } }
    );
  }

  const editables = ["alias", "destinatario", "direccion", "referencia",
                     "municipio", "departamento", "telefono", "zona_envio_id",
                     "es_predeterminada"];
  const campos = {};
  for (const c of editables) {
    if (c in datos) campos[c] = datos[c];
  }

  return dir.update(campos);
};

// ─── desactivarDireccion ──────────────────────────────────────────────────────
// Baja lógica siempre: si estuvo en un pedido se conserva el historial.
const desactivarDireccion = async (clienteId, direccionId) => {
  const dir = await db.direccion_cliente.findOne({
    where: { id: direccionId, cliente_id: clienteId },
  });
  if (!dir) throw AppError.noEncontrado("Dirección");

  await dir.update({ activo: false, es_predeterminada: false });
};

// ─── obtenerClienteDeUsuario ──────────────────────────────────────────────────
// Resuelve el cliente_id del usuario autenticado (para endpoints de tienda).
// Lanza 403 si el usuario no es un cliente de tienda.
const obtenerClienteDeUsuario = async (usuarioId) => {
  const usuario = await db.usuario.findByPk(usuarioId, {
    attributes: ["id", "cliente_id"],
  });
  if (!usuario || !usuario.cliente_id) {
    throw AppError.sinPermiso("Esta operación es solo para clientes de la tienda");
  }
  return usuario.cliente_id;
};

module.exports = {
  generarCodigo,
  listar, listarPendientes, obtener, crear, actualizar, desactivar,
  aprobar, rechazar, obtenerCredito,
  listarDirecciones, crearDireccion, actualizarDireccion, desactivarDireccion,
  obtenerClienteDeUsuario,
};
