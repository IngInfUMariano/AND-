"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const ProductoService = require("../services/producto.service");

// GET /api/productos
const listar = asyncHandler(async (req, res) => {
    const { rows, count, page, limit } = await ProductoService.listar(req.query);
    paginado(res, rows, count, page, limit);
});

// GET /api/productos/:id
const obtener = asyncHandler(async (req, res) => {
    const producto = await ProductoService.obtener(req.params.id);
    ok(res, producto);
});

// POST /api/productos
const crear = asyncHandler(async (req, res) => {
    const producto = await ProductoService.crear(req.body);
    creado(res, producto);
});

// PUT /api/productos/:id
const actualizar = asyncHandler(async (req, res) => {
    const producto = await ProductoService.actualizar(req.params.id, req.body);
    ok(res, producto);
});

// DELETE /api/productos/:id  (baja lógica → 204)
const desactivar = asyncHandler(async (req, res) => {
    await ProductoService.desactivar(req.params.id);
    sinContenido(res);
});

module.exports = { listar, obtener, crear, actualizar, desactivar };