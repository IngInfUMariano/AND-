"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const SucursalService = require("../services/sucursal.service");

// GET /api/sucursales
const listar = asyncHandler(async (req, res) => {
    const { rows, count, page, limit } = await SucursalService.listar(req.query);
    paginado(res, rows, count, page, limit);
});

// GET /api/sucursales/:id
const obtener = asyncHandler(async (req, res) => {
    const sucursal = await SucursalService.obtener(req.params.id);
    ok(res, sucursal);
});

// POST /api/sucursales
const crear = asyncHandler(async (req, res) => {
    const sucursal = await SucursalService.crear(req.body);
    creado(res, sucursal);
});

// PUT /api/sucursales/:id
const actualizar = asyncHandler(async (req, res) => {
    const sucursal = await SucursalService.actualizar(req.params.id, req.body);
    ok(res, sucursal);
});

// DELETE /api/sucursales/:id  (baja lógica → 204)
const desactivar = asyncHandler(async (req, res) => {
    await SucursalService.desactivar(req.params.id);
    sinContenido(res);
});

module.exports = { listar, obtener, crear, actualizar, desactivar };