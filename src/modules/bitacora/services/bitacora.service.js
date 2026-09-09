// bitacora.service.js — consulta del registro de auditoría.
//
// La bitácora es INMUTABLE: este servicio solo tiene operación de lectura.
// La escritura se hace desde registrarBitacora.js (core/utils) en cada servicio
// que genera eventos auditables.

"use strict";

const { Op } = require("sequelize");
const db     = require("../../../loaders/models.loader");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

const SORTABLES = ["fecha", "operacion", "entidad"];

// ─── listar ──────────────────────────────────────────────────────────────────
// Devuelve entradas de bitácora con filtros opcionales.
// Orden por defecto: fecha DESC (el más reciente primero, natural para auditoría).
const listar = async (query) => {
  const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

  const where = {};

  if (query.usuario_id) where.usuario_id = parseInt(query.usuario_id, 10);
  if (query.operacion)  where.operacion  = query.operacion;
  if (query.entidad)    where.entidad    = query.entidad;
  if (query.entidad_id) where.entidad_id = parseInt(query.entidad_id, 10);

  // Filtro de rango de fechas: acepta ISO 8601 ("2026-01-01" o "2026-01-01T00:00:00Z")
  if (query.fecha_desde || query.fecha_hasta) {
    where.fecha = {};
    if (query.fecha_desde) where.fecha[Op.gte] = new Date(query.fecha_desde);
    if (query.fecha_hasta) where.fecha[Op.lte] = new Date(query.fecha_hasta);
  }

  const { rows, count } = await db.bitacora.findAndCountAll({
    where,
    limit,
    offset,
    order: order.length ? order : [["fecha", "DESC"]],
    include: [
      {
        model:      db.usuario,
        attributes: ["id", "email", "perfil"],
        required:   false // outer join: hay entradas sin usuario_id (operaciones del sistema)
      }
    ]
  });

  return { rows, count, page, limit };
};

module.exports = { listar };
