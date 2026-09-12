// proveedor.service.js — lógica de negocio del recurso proveedores.
"use strict";

const { Op } = require("sequelize");
const db     = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

const SORTABLES = ["codigo", "razon_social", "created_at", "activo"];

// ─── listar ───────────────────────────────────────────────────────────────────
const listar = async (query) => {
  const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);
  const where = {};

  if (query.q) {
    where[Op.or] = [
      { razon_social:     { [Op.iLike]: `%${query.q}%` } },
      { nombre_comercial: { [Op.iLike]: `%${query.q}%` } },
      { codigo:           { [Op.iLike]: `%${query.q}%` } },
      { nit:              { [Op.iLike]: `%${query.q}%` } },
    ];
  }

  if      (query.activo === "false") where.activo = false;
  else if (query.activo === "todos") { /* sin filtro */ }
  else                               where.activo = true;

  const { rows, count } = await db.proveedor.findAndCountAll({
    where,
    limit,
    offset,
    order: order.length ? order : [["razon_social", "asc"]],
  });

  return { rows, count, page, limit };
};

// ─── obtener ──────────────────────────────────────────────────────────────────
const obtener = async (id) => {
  const proveedor = await db.proveedor.findByPk(id);
  if (!proveedor) throw AppError.noEncontrado("Proveedor");
  return proveedor;
};

// ─── crear ────────────────────────────────────────────────────────────────────
const crear = async (datos) => {
  const { codigo, razon_social, nombre_comercial, nit, direccion,
          contacto_nombre, telefono, email, condiciones_pago, plazo_entrega_dias } = datos;
  return db.proveedor.create({
    codigo, razon_social, nombre_comercial, nit, direccion,
    contacto_nombre, telefono, email, condiciones_pago, plazo_entrega_dias,
  });
};

// ─── actualizar ───────────────────────────────────────────────────────────────
const actualizar = async (id, datos) => {
  const proveedor = await db.proveedor.findByPk(id);
  if (!proveedor) throw AppError.noEncontrado("Proveedor");

  const editables = ["razon_social", "nombre_comercial", "nit", "direccion",
                     "contacto_nombre", "telefono", "email", "condiciones_pago",
                     "plazo_entrega_dias"];
  const campos = {};
  for (const c of editables) {
    if (c in datos) campos[c] = datos[c];
  }

  return proveedor.update(campos);
};

// ─── desactivar ───────────────────────────────────────────────────────────────
// Regla: no se puede desactivar si tiene comprobantes de entrada registrados.
const desactivar = async (id) => {
  const proveedor = await db.proveedor.findByPk(id);
  if (!proveedor) throw AppError.noEncontrado("Proveedor");

  const entradas = await db.comprobante.count({ where: { proveedor_id: id } });
  if (entradas > 0) {
    throw AppError.reglaNegocio(
      "No se puede desactivar un proveedor con entradas de mercadería registradas",
      [`El proveedor tiene ${entradas} entrada(s) de mercadería registrada(s)`]
    );
  }

  await proveedor.update({ activo: false });
};

// ─── listarProductos ──────────────────────────────────────────────────────────
const listarProductos = async (id) => {
  const proveedor = await db.proveedor.findByPk(id);
  if (!proveedor) throw AppError.noEncontrado("Proveedor");

  return db.proveedor_producto.findAll({
    where:   { proveedor_id: id },
    include: [{ model: db.producto, attributes: ["id", "codigo", "nombre", "activo"] }],
    order:   [["created_at", "desc"]],
  });
};

// ─── asociarProducto ──────────────────────────────────────────────────────────
// Crea o actualiza la relación proveedor↔producto.
// Regla: solo un proveedor puede ser el principal de un producto; al marcar
//        uno como principal se desmarca el que lo era antes.
const asociarProducto = async (id, datos) => {
  const proveedor = await db.proveedor.findByPk(id);
  if (!proveedor) throw AppError.noEncontrado("Proveedor");

  const { producto_id, codigo_proveedor, costo_compra, es_principal } = datos;

  const producto = await db.producto.findByPk(producto_id);
  if (!producto) throw AppError.noEncontrado("Producto");

  if (es_principal) {
    await db.proveedor_producto.update(
      { es_principal: false },
      { where: { producto_id, es_principal: true } }
    );
  }

  let relacion = await db.proveedor_producto.findOne({
    where: { proveedor_id: id, producto_id },
  });

  if (relacion) {
    await relacion.update({
      codigo_proveedor: codigo_proveedor || null,
      costo_compra,
      es_principal: es_principal || false,
    });
  } else {
    relacion = await db.proveedor_producto.create({
      proveedor_id: id,
      producto_id,
      codigo_proveedor: codigo_proveedor || null,
      costo_compra,
      es_principal: es_principal || false,
    });
  }

  return relacion;
};

// ─── desasociarProducto ───────────────────────────────────────────────────────
const desasociarProducto = async (id, productoId) => {
  const relacion = await db.proveedor_producto.findOne({
    where: { proveedor_id: id, producto_id: productoId },
  });
  if (!relacion) throw AppError.noEncontrado("Asociación proveedor-producto");
  await relacion.destroy();
};

// ─── historial ────────────────────────────────────────────────────────────────
// Devuelve los comprobantes de entrada ligados al proveedor.
// Filtros: ?fecha_desde, ?fecha_hasta, ?sucursal_id
const historial = async (id, query) => {
  const proveedor = await db.proveedor.findByPk(id);
  if (!proveedor) throw AppError.noEncontrado("Proveedor");

  const { limit, offset, page } = parsearPaginacion(query, ["fecha"]);
  const where = { proveedor_id: id, tipo: "ENTRADA" };

  if (query.fecha_desde || query.fecha_hasta) {
    where.fecha = {};
    if (query.fecha_desde) where.fecha[Op.gte] = new Date(query.fecha_desde);
    if (query.fecha_hasta) where.fecha[Op.lte] = new Date(query.fecha_hasta);
  }

  if (query.sucursal_id) where.sucursal_id = parseInt(query.sucursal_id, 10);

  const { rows, count } = await db.comprobante.findAndCountAll({
    where,
    limit,
    offset,
    order:   [["fecha", "desc"]],
    include: [{ model: db.sucursal, attributes: ["id", "codigo", "nombre"] }],
  });

  return { rows, count, page, limit };
};

module.exports = {
  listar, obtener, crear, actualizar, desactivar,
  listarProductos, asociarProducto, desasociarProducto, historial,
};
