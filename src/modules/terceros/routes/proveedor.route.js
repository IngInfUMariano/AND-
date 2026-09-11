// proveedor.route.js — endpoints REST del recurso proveedores.
// Permisos según API.md:
//   Consulta: ADMIN, GERENTE, BODEGUERO
//   Escritura: ADMIN, GERENTE
//   Baja:      ADMIN
"use strict";

module.exports = (app) => {
  const ctrl   = require("../controllers/proveedor.controller");
  const router = require("express").Router();
  const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
  const validar = require("../../../core/middlewares/validar");
  const { crearValidator, actualizarValidator, asociarProductoValidator } =
    require("../validators/proveedor.validator");

  const interno    = [verifyToken, onlyApp("interno")];
  const consulta   = [...interno, hasRole("ADMIN", "GERENTE", "BODEGUERO")];
  const escritura  = [...interno, hasRole("ADMIN", "GERENTE")];
  const soloAdmin  = [...interno, hasRole("ADMIN")];

  // ── CRUD principal ────────────────────────────────────────────────────────
  router.get("/",    ...consulta,  ctrl.listar);
  router.get("/:id", ...consulta,  ctrl.obtener);

  router.post("/",    ...escritura, crearValidator,     validar, ctrl.crear);
  router.put( "/:id", ...escritura, actualizarValidator, validar, ctrl.actualizar);
  router.delete("/:id", ...soloAdmin, ctrl.desactivar);

  // ── Productos del proveedor ───────────────────────────────────────────────
  router.get("/:id/productos",     ...consulta,  ctrl.listarProductos);
  router.post("/:id/productos",    ...escritura, asociarProductoValidator, validar, ctrl.asociarProducto);
  router.delete("/:id/productos/:pid", ...soloAdmin, ctrl.desasociarProducto);

  // ── Historial de entradas de mercadería ───────────────────────────────────
  router.get("/:id/historial", ...consulta, ctrl.historial);

  app.use("/api/proveedores", router);
};
