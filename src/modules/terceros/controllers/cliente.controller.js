// cliente.controller.js — traduce HTTP ↔ servicio para el recurso clientes.
//
// Regla de presentación: el perfil VENDEDOR no ve límite_credito ni condiciones
// comerciales. El servicio devuelve siempre los datos completos; el controlador
// filtra en los endpoints GET antes de responder.
"use strict";

const asyncHandler = require("../../../core/utils/asyncHandler");
const { ok, creado, sinContenido, paginado } = require("../../../core/utils/respuesta");
const ClienteService = require("../services/cliente.service");

// Campos comerciales que el perfil VENDEDOR no debe ver.
const CAMPOS_COMERCIALES = ["limite_credito", "credito_utilizado", "plazo_credito_dias"];

const ocultarComercialesParaVendedor = (perfil, cliente) => {
  if (perfil !== "VENDEDOR") return cliente;
  const data = cliente.toJSON ? cliente.toJSON() : { ...cliente };
  CAMPOS_COMERCIALES.forEach((c) => delete data[c]);
  return data;
};

// ── CRUD principal ────────────────────────────────────────────────────────────

const listar = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await ClienteService.listar(req.query);
  const perfil = req.usuario.perfil;
  const data   = rows.map((c) => ocultarComercialesParaVendedor(perfil, c));
  paginado(res, data, count, page, limit);
});

const listarPendientes = asyncHandler(async (req, res) => {
  const { rows, count, page, limit } = await ClienteService.listarPendientes(req.query);
  paginado(res, rows, count, page, limit);
});

const obtener = asyncHandler(async (req, res) => {
  const cliente = await ClienteService.obtener(req.params.id);
  ok(res, ocultarComercialesParaVendedor(req.usuario.perfil, cliente));
});

const crear = asyncHandler(async (req, res) => {
  creado(res, await ClienteService.crear(req.body));
});

const actualizar = asyncHandler(async (req, res) => {
  // VENDEDOR no puede tocar condiciones comerciales aunque tenga acceso al endpoint
  const datos = { ...req.body };
  if (req.usuario.perfil === "VENDEDOR") {
    CAMPOS_COMERCIALES.forEach((c) => delete datos[c]);
    delete datos.tipo;
  }
  ok(res, await ClienteService.actualizar(req.params.id, datos));
});

const desactivar = asyncHandler(async (req, res) => {
  await ClienteService.desactivar(req.params.id);
  sinContenido(res);
});

// ── Flujo de aprobación ───────────────────────────────────────────────────────

const aprobar = asyncHandler(async (req, res) => {
  const cliente = await ClienteService.aprobar(
    req.params.id, req.body, req.usuario.id
  );
  ok(res, cliente);
});

const rechazar = asyncHandler(async (req, res) => {
  const cliente = await ClienteService.rechazar(req.params.id, req.body.motivo);
  ok(res, cliente);
});

// ── Crédito ───────────────────────────────────────────────────────────────────

const obtenerCredito = asyncHandler(async (req, res) => {
  ok(res, await ClienteService.obtenerCredito(req.params.id));
});

// ── Direcciones (portal interno: /api/clientes/:id/direcciones) ───────────────

const listarDirecciones = asyncHandler(async (req, res) => {
  ok(res, await ClienteService.listarDirecciones(req.params.id, req.query));
});

const crearDireccion = asyncHandler(async (req, res) => {
  creado(res, await ClienteService.crearDireccion(req.params.id, req.body));
});

const actualizarDireccion = asyncHandler(async (req, res) => {
  ok(res, await ClienteService.actualizarDireccion(
    req.params.id, req.params.did, req.body
  ));
});

const desactivarDireccion = asyncHandler(async (req, res) => {
  await ClienteService.desactivarDireccion(req.params.id, req.params.did);
  sinContenido(res);
});

// ── Mis direcciones (tienda: /api/mis-direcciones) ────────────────────────────
// El cliente_id siempre viene del token; nunca de la URL.

const listarMisDirecciones = asyncHandler(async (req, res) => {
  const clienteId = await ClienteService.obtenerClienteDeUsuario(req.usuario.id);
  ok(res, await ClienteService.listarDirecciones(clienteId, req.query));
});

const crearMiDireccion = asyncHandler(async (req, res) => {
  const clienteId = await ClienteService.obtenerClienteDeUsuario(req.usuario.id);
  creado(res, await ClienteService.crearDireccion(clienteId, req.body));
});

const actualizarMiDireccion = asyncHandler(async (req, res) => {
  const clienteId = await ClienteService.obtenerClienteDeUsuario(req.usuario.id);
  ok(res, await ClienteService.actualizarDireccion(clienteId, req.params.did, req.body));
});

const desactivarMiDireccion = asyncHandler(async (req, res) => {
  const clienteId = await ClienteService.obtenerClienteDeUsuario(req.usuario.id);
  await ClienteService.desactivarDireccion(clienteId, req.params.did);
  sinContenido(res);
});

module.exports = {
  listar, listarPendientes, obtener, crear, actualizar, desactivar,
  aprobar, rechazar, obtenerCredito,
  listarDirecciones, crearDireccion, actualizarDireccion, desactivarDireccion,
  listarMisDirecciones, crearMiDireccion, actualizarMiDireccion, desactivarMiDireccion,
};
