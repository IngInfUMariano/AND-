// cliente.route.js — endpoints REST del recurso clientes.
//
// Dos bases:
//   /api/clientes    → portal interno (ADMIN, GERENTE, VENDEDOR)
//   /api/mis-direcciones → tienda (CLIENTE)
//
// IMPORTANTE: /pendientes se define ANTES que /:id para que Express no interprete
// "pendientes" como un id numérico.
"use strict";

module.exports = (app) => {
  const ctrl   = require("../controllers/cliente.controller");
  const router = require("express").Router();
  const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
  const validar = require("../../../core/middlewares/validar");
  const {
    crearValidator, actualizarValidator,
    aprobarValidator, rechazarValidator,
    crearDireccionValidator, actualizarDireccionValidator, actualizarMiDireccionValidator,
  } = require("../validators/cliente.validator");

  const interno   = [verifyToken, onlyApp("interno")];
  const consulta  = [...interno, hasRole("ADMIN", "GERENTE", "VENDEDOR")];
  const escritura = [...interno, hasRole("ADMIN", "GERENTE")];
  const soloAdmin = [...interno, hasRole("ADMIN")];

  // ── Rutas de listado y pendientes (antes de /:id) ─────────────────────────
  router.get("/",          ...consulta, ctrl.listar);
  router.get("/pendientes", ...escritura, ctrl.listarPendientes);

  // ── CRUD principal ────────────────────────────────────────────────────────
  router.post("/",    ...escritura, crearValidator,     validar, ctrl.crear);

  router.get("/:id",    ...consulta,  ctrl.obtener);
  router.put("/:id",    ...escritura, actualizarValidator, validar, ctrl.actualizar);
  router.delete("/:id", ...soloAdmin, ctrl.desactivar);

  // ── Flujo de aprobación de mayoristas ─────────────────────────────────────
  router.post("/:id/aprobar",  ...escritura, aprobarValidator,  validar, ctrl.aprobar);
  router.post("/:id/rechazar", ...escritura, rechazarValidator, validar, ctrl.rechazar);

  // ── Crédito ───────────────────────────────────────────────────────────────
  router.get("/:id/credito", ...consulta, ctrl.obtenerCredito);

  // ── Direcciones (portal interno) ──────────────────────────────────────────
  router.get("/:id/direcciones",
    ...consulta, ctrl.listarDirecciones);

  router.post("/:id/direcciones",
    ...escritura, crearDireccionValidator, validar, ctrl.crearDireccion);

  router.put("/:id/direcciones/:did",
    ...escritura, actualizarDireccionValidator, validar, ctrl.actualizarDireccion);

  router.delete("/:id/direcciones/:did",
    ...soloAdmin, ctrl.desactivarDireccion);

  app.use("/api/clientes", router);

  // ── Mis direcciones (tienda — CLIENTE autenticado) ────────────────────────
  // Endpoint separado para que el cliente de la tienda acceda solo a sus datos.
  const misDirRouter = require("express").Router();
  const tienda       = [verifyToken, onlyApp("tienda"), hasRole("CLIENTE")];

  misDirRouter.get("/",       ...tienda, ctrl.listarMisDirecciones);
  misDirRouter.post("/",      ...tienda, crearDireccionValidator,       validar, ctrl.crearMiDireccion);
  misDirRouter.put("/:did",   ...tienda, actualizarMiDireccionValidator, validar, ctrl.actualizarMiDireccion);
  misDirRouter.delete("/:did",...tienda, ctrl.desactivarMiDireccion);

  app.use("/api/mis-direcciones", misDirRouter);
};
