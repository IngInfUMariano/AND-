"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, paginado } = require("../../../core/utils/respuesta");
const ExistenciaService = require("../services/existencia.service");

// GET /api/existencias
const listar = asyncHandler(async (req, res) => {
    const { rows, count, page, limit } = await ExistenciaService.listar(req.query);
    paginado(res, rows, count, page, limit);
});

// GET /api/existencias/:id
const obtener = asyncHandler(async (req, res) => {
    const existencia = await ExistenciaService.obtener(req.params.id);
    ok(res, existencia);
});

// POST /api/existencias
const crear = asyncHandler(async (req, res) => {
    const existencia = await ExistenciaService.crear(req.body);
    creado(res, existencia);
});

// PUT /api/existencias/:id
const actualizar = asyncHandler(async (req, res) => {
    const existencia = await ExistenciaService.actualizar(req.params.id, req.body);
    ok(res, existencia);
});

module.exports = { listar, obtener, crear, actualizar };