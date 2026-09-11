// empleado.service.js — lógica de negocio del recurso empleados.
"use strict";

const { Op } = require("sequelize");
const db     = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

const SORTABLES = ["codigo", "nombres", "apellidos", "created_at", "activo"];

// ─── listar ───────────────────────────────────────────────────────────────────
const listar = async (query) => {
  const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);
  const where = {};

  if (query.q) {
    where[Op.or] = [
      { nombres:   { [Op.iLike]: `%${query.q}%` } },
      { apellidos: { [Op.iLike]: `%${query.q}%` } },
      { codigo:    { [Op.iLike]: `%${query.q}%` } },
      { dpi:       { [Op.iLike]: `%${query.q}%` } },
      { puesto:    { [Op.iLike]: `%${query.q}%` } },
    ];
  }

  if (query.sucursal_id) where.sucursal_id = parseInt(query.sucursal_id, 10);

  if      (query.activo === "false") where.activo = false;
  else if (query.activo === "todos") { /* sin filtro */ }
  else                               where.activo = true;

  const { rows, count } = await db.empleado.findAndCountAll({
    where,
    limit,
    offset,
    order:   order.length ? order : [["apellidos", "asc"]],
    include: [{ model: db.sucursal, attributes: ["id", "codigo", "nombre"] }],
  });

  return { rows, count, page, limit };
};

// ─── obtener ──────────────────────────────────────────────────────────────────
const obtener = async (id) => {
  const empleado = await db.empleado.findByPk(id, {
    include: [
      { model: db.sucursal, attributes: ["id", "codigo", "nombre"] },
      { model: db.usuario,  attributes: ["id", "email", "perfil", "activo"] },
    ],
  });
  if (!empleado) throw AppError.noEncontrado("Empleado");
  return empleado;
};

// ─── crear ────────────────────────────────────────────────────────────────────
const crear = async (datos) => {
  const { codigo, nombres, apellidos, dpi, puesto, sucursal_id,
          fecha_ingreso, telefono, email } = datos;

  const sucursal = await db.sucursal.findByPk(sucursal_id);
  if (!sucursal) throw AppError.noEncontrado("Sucursal");

  return db.empleado.create({
    codigo, nombres, apellidos, dpi, puesto, sucursal_id,
    fecha_ingreso, telefono: telefono || null, email: email || null,
  });
};

// ─── actualizar ───────────────────────────────────────────────────────────────
const actualizar = async (id, datos) => {
  const empleado = await db.empleado.findByPk(id);
  if (!empleado) throw AppError.noEncontrado("Empleado");

  if (datos.sucursal_id) {
    const sucursal = await db.sucursal.findByPk(datos.sucursal_id);
    if (!sucursal) throw AppError.noEncontrado("Sucursal");
  }

  const editables = ["nombres", "apellidos", "dpi", "puesto", "sucursal_id",
                     "fecha_ingreso", "telefono", "email"];
  const campos = {};
  for (const c of editables) {
    if (c in datos) campos[c] = datos[c];
  }

  return empleado.update(campos);
};

// ─── desactivar ───────────────────────────────────────────────────────────────
// Regla: no se puede dar de baja con movimientos de inventario registrados.
// Al dar de baja: también desactiva el usuario vinculado.
const desactivar = async (id) => {
  const empleado = await db.empleado.findByPk(id, {
    include: [{ model: db.usuario, attributes: ["id"] }],
  });
  if (!empleado) throw AppError.noEncontrado("Empleado");

  if (empleado.usuario) {
    const movimientos = await db.movimiento_inventario.count({
      where: { usuario_id: empleado.usuario.id },
    });
    if (movimientos > 0) {
      throw AppError.reglaNegocio(
        "No se puede dar de baja un empleado con movimientos de inventario registrados",
        [`El empleado tiene ${movimientos} movimiento(s) de inventario registrado(s)`]
      );
    }

    await empleado.usuario.update({ activo: false });
  }

  await empleado.update({ activo: false });
};

// ─── cambiarSucursal ──────────────────────────────────────────────────────────
// Reasigna el empleado a otra sucursal. Los movimientos históricos conservan
// la sucursal en que ocurrieron; este cambio solo aplica hacia adelante.
const cambiarSucursal = async (id, sucursal_id) => {
  const empleado = await db.empleado.findByPk(id, {
    include: [{ model: db.usuario, attributes: ["id"] }],
  });
  if (!empleado) throw AppError.noEncontrado("Empleado");

  const sucursal = await db.sucursal.findByPk(sucursal_id);
  if (!sucursal) throw AppError.noEncontrado("Sucursal");

  await empleado.update({ sucursal_id });

  // Sincronizar también el usuario para que el JWT refleje la nueva sucursal
  if (empleado.usuario) {
    await empleado.usuario.update({ sucursal_id });
  }

  return empleado.reload({
    include: [{ model: db.sucursal, attributes: ["id", "codigo", "nombre"] }],
  });
};

module.exports = { listar, obtener, crear, actualizar, desactivar, cambiarSucursal };
