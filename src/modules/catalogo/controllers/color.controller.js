"use strict";

const db               = require("../../../loaders/models.loader");
const asyncHandler     = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const ColorService = require("../services/color.service");

// GET /api/colors
const listar = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await ColorService.listar(req.query);
  paginado(res, rows, count, page, limit);
});

// GET /api/colors/:id
const obtener = asyncHandler(async (req, res) => {
  const color = await ColorService.obtener(req.params.id);
  ok(res, color);
});

// POST /api/colors
const crear = asyncHandler(async (req, res) => {
  const color = await ColorService.crear(req.body);
  creado(res, color);
});

// PUT /api/colors/:id
const actualizar = asyncHandler(async (req, res) => {
  const color = await ColorService.actualizar(req.params.id, req.body);
  ok(res, color);
});

// DELETE /api/colors/:id  (baja lógica → 204)
const desactivar = asyncHandler(async (req, res) => {
  await ColorService.desactivar(req.params.id);
  sinContenido(res);
});

module.exports = { listar, obtener, crear, actualizar, desactivar };    