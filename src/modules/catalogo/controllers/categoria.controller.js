// categoria.controller.js — traduce HTTP ↔ servicio para el recurso categorías.
//
// Por qué el controlador no tiene lógica de negocio:
//   Su único trabajo es leer de req (params, body, query), llamar al servicio
//   y responder con los helpers de respuesta.js. Si aquí hubiera validaciones
//   de negocio, dos personas del equipo podrían implementarlas de forma distinta.
//   El servicio es el único punto de verdad.
//
// Por qué no hay try/catch:
//   asyncHandler captura cualquier excepción (tanto AppError como errores de
//   Sequelize) y la pasa a next(err). El errorHandler la convierte al formato
//   del contrato. Sin asyncHandler habría que repetir try/catch en cada método.

"use strict";

const db               = require("../../../loaders/models.loader");
const asyncHandler     = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const CategoriaService = require("../services/categoria.service");

// GET /api/categorias
const listar = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await CategoriaService.listar(req.query);
  paginado(res, rows, count, page, limit);
});

// GET /api/categorias/:id
const obtener = asyncHandler(async (req, res) => {
  const categoria = await CategoriaService.obtener(req.params.id);
  ok(res, categoria);
});

// POST /api/categorias
const crear = asyncHandler(async (req, res) => {
  const categoria = await CategoriaService.crear(req.body);
  creado(res, categoria);
});

// PUT /api/categorias/:id
const actualizar = asyncHandler(async (req, res) => {
  const categoria = await CategoriaService.actualizar(req.params.id, req.body);
  ok(res, categoria);
});

// DELETE /api/categorias/:id  (baja lógica → 204)
const desactivar = asyncHandler(async (req, res) => {
  await CategoriaService.desactivar(req.params.id);
  sinContenido(res);
});

module.exports = { listar, obtener, crear, actualizar, desactivar };
