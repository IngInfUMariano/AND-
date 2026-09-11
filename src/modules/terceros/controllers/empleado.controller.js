// empleado.controller.js — traduce HTTP ↔ servicio para el recurso empleados.
"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const EmpleadoService = require("../services/empleado.service");

const listar = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await EmpleadoService.listar(req.query);
  paginado(res, rows, count, page, limit);
});

const obtener = asyncHandler(async (req, res) => {
  ok(res, await EmpleadoService.obtener(req.params.id));
});

const crear = asyncHandler(async (req, res) => {
  creado(res, await EmpleadoService.crear(req.body));
});

const actualizar = asyncHandler(async (req, res) => {
  ok(res, await EmpleadoService.actualizar(req.params.id, req.body));
});

const desactivar = asyncHandler(async (req, res) => {
  await EmpleadoService.desactivar(req.params.id);
  sinContenido(res);
});

const cambiarSucursal = asyncHandler(async (req, res) => {
  ok(res, await EmpleadoService.cambiarSucursal(req.params.id, req.body.sucursal_id));
});

module.exports = { listar, obtener, crear, actualizar, desactivar, cambiarSucursal };
