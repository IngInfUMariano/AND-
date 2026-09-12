"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const TallaService = require("../services/talla.service");

// GET /api/tallas
const listar = asyncHandler(async (req, res) => {
    const { rows, count, page, limit } = await TallaService.listar(req.query);
    paginado(res, rows, count, page, limit);
});

// GET /api/tallas/:id
const obtener = asyncHandler(async (req, res) => {
    const talla = await TallaService.obtener(req.params.id);
    ok(res, talla);
});

// POST /api/tallas
const crear = asyncHandler(async (req, res) => {
    const talla = await TallaService.crear(req.body);
    creado(res, talla);
});

// PUT /api/tallas/:id
const actualizar = asyncHandler(async (req, res) => {
    const talla = await TallaService.actualizar(req.params.id, req.body);
    ok(res, talla);
});

// DELETE /api/tallas/:id  (baja lógica → 204)
const desactivar = asyncHandler(async (req, res) => {
    await TallaService.desactivar(req.params.id);
    sinContenido(res);
});

module.exports = { listar, obtener, crear, actualizar, desactivar };