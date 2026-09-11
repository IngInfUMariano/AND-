"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, paginado } = require("../../../core/utils/respuesta");
const CorrelativoService = require("../services/correlativo.service");

// GET /api/correlativos
const listar = asyncHandler(async (req, res) => {
    const { rows, count, page, limit } = await CorrelativoService.listar(req.query);
    paginado(res, rows, count, page, limit);
});

// GET /api/correlativos/:id
const obtener = asyncHandler(async (req, res) => {
    const correlativo = await CorrelativoService.obtener(req.params.id);
    ok(res, correlativo);
});

// POST /api/correlativos
const crear = asyncHandler(async (req, res) => {
    const correlativo = await CorrelativoService.crear(req.body);
    creado(res, correlativo);
});

// PUT /api/correlativos/:id
const actualizar = asyncHandler(async (req, res) => {
    const correlativo = await CorrelativoService.actualizar(req.params.id, req.body);
    ok(res, correlativo);
});

module.exports = { listar, obtener, crear, actualizar };