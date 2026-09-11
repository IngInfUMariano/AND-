// proveedor.controller.js — traduce HTTP ↔ servicio para el recurso proveedores.
"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const ProveedorService = require("../services/proveedor.service");

// GET /api/proveedores
const listar = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await ProveedorService.listar(req.query);
  paginado(res, rows, count, page, limit);
});

// GET /api/proveedores/:id
const obtener = asyncHandler(async (req, res) => {
  ok(res, await ProveedorService.obtener(req.params.id));
});

// POST /api/proveedores
const crear = asyncHandler(async (req, res) => {
  creado(res, await ProveedorService.crear(req.body));
});

// PUT /api/proveedores/:id
const actualizar = asyncHandler(async (req, res) => {
  ok(res, await ProveedorService.actualizar(req.params.id, req.body));
});

// DELETE /api/proveedores/:id  (baja lógica)
const desactivar = asyncHandler(async (req, res) => {
  await ProveedorService.desactivar(req.params.id);
  sinContenido(res);
});

// GET /api/proveedores/:id/productos
const listarProductos = asyncHandler(async (req, res) => {
  ok(res, await ProveedorService.listarProductos(req.params.id));
});

// POST /api/proveedores/:id/productos
const asociarProducto = asyncHandler(async (req, res) => {
  creado(res, await ProveedorService.asociarProducto(req.params.id, req.body));
});

// DELETE /api/proveedores/:id/productos/:pid
const desasociarProducto = asyncHandler(async (req, res) => {
  await ProveedorService.desasociarProducto(req.params.id, req.params.pid);
  sinContenido(res);
});

// GET /api/proveedores/:id/historial
const historial = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await ProveedorService.historial(req.params.id, req.query);
  paginado(res, rows, count, page, limit);
});

module.exports = { listar, obtener, crear, actualizar, desactivar,
                   listarProductos, asociarProducto, desasociarProducto, historial };
