// bitacora.controller.js — expone la consulta de auditoría como endpoint REST.

"use strict";

const asyncHandler    = require("../../../core/utils/asyncHandler");
const { paginado }    = require("../../../core/utils/respuesta");
const BitacoraService = require("../services/bitacora.service");

// GET /api/bitacora
const listar = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await BitacoraService.listar(req.query);
  paginado(res, rows, count, page, limit);
});

module.exports = { listar };
