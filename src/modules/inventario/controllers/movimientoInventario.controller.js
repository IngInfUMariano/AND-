"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, paginado } = require("../../../core/utils/respuesta");
const MovimientoService = require("../services/movimientoInventario.service");

// GET /api/movimientos-inventario
const listar = asyncHandler(async (req, res) => {
    const { rows, count, page, limit } = await MovimientoService.listar(req.query);
    paginado(res, rows, count, page, limit);
});

// GET /api/movimientos-inventario/:id
const obtener = asyncHandler(async (req, res) => {
    const movimiento = await MovimientoService.obtener(req.params.id);
    ok(res, movimiento);
});

// POST /api/movimientos-inventario
const crear = asyncHandler(async (req, res) => {
    // Se obtiene el usuario que ejecuta la operación desde la sesión JWT
    const usuarioId = req.usuario.id;
    const movimiento = await MovimientoService.crear(req.body, usuarioId);
    creado(res, movimiento);
});

module.exports = { listar, obtener, crear };