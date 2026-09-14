"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const VarianteService = require("../services/variante.service");

// GET /api/variantes
const listar = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await VarianteService.listar(req.query);
  paginado(res, rows, count, page, limit);
});

// GET /api/productos/:id/variantes
const listarPorProducto = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await VarianteService.listar({ ...req.query, producto_id: req.params.id });
  paginado(res, rows, count, page, limit);
});

// GET /api/variantes/:id
const obtener = asyncHandler(async (req, res) => {
  const variante = await VarianteService.obtener(req.params.id);
  ok(res, variante);
});

// POST /api/variantes
const crear = asyncHandler(async (req, res) => {
  const variante = await VarianteService.crear(req.body);
  creado(res, variante);
});

// PUT /api/variantes/:id
const actualizar = asyncHandler(async (req, res) => {
  const variante = await VarianteService.actualizar(req.params.id, req.body);
  ok(res, variante);
});

// DELETE /api/variantes/:id  (baja lógica → 204)
const desactivar = asyncHandler(async (req, res) => {
  await VarianteService.desactivar(req.params.id);
  sinContenido(res);
});

module.exports = { listar, listarPorProducto, obtener, crear, actualizar, desactivar };