"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const TemporadaService = require("../services/temporada.service");

// GET /api/temporadas
const listar = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await TemporadaService.listar(req.query);
  paginado(res, rows, count, page, limit);
});

// GET /api/temporadas/:id
const obtener = asyncHandler(async (req, res) => {
  const temporada = await TemporadaService.obtener(req.params.id);
  ok(res, temporada);
});

// POST /api/temporadas
const crear = asyncHandler(async (req, res) => {
  const temporada = await TemporadaService.crear(req.body);
  creado(res, temporada);
});

// PUT /api/temporadas/:id
const actualizar = asyncHandler(async (req, res) => {
  const temporada = await TemporadaService.actualizar(req.params.id, req.body);
  ok(res, temporada);
});

// DELETE /api/temporadas/:id  (baja lógica → 204)
const desactivar = asyncHandler(async (req, res) => {
  await TemporadaService.desactivar(req.params.id);
  sinContenido(res);
});

module.exports = { listar, obtener, crear, actualizar, desactivar };