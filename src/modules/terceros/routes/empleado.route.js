// empleado.route.js — endpoints REST del recurso empleados.
// Permisos según API.md: solo ADMIN escribe y da de baja; ADMIN y GERENTE consultan.
"use strict";

module.exports = (app) => {
  const ctrl   = require("../controllers/empleado.controller");
  const router = require("express").Router();
  const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
  const validar = require("../../../core/middlewares/validar");
  const { crearValidator, actualizarValidator, cambiarSucursalValidator } =
    require("../validators/empleado.validator");

  const interno   = [verifyToken, onlyApp("interno")];
  const consulta  = [...interno, hasRole("ADMIN", "GERENTE")];
  const soloAdmin = [...interno, hasRole("ADMIN")];

  router.get("/",    ...consulta,  ctrl.listar);
  router.get("/:id", ...consulta,  ctrl.obtener);

  router.post("/",    ...soloAdmin, crearValidator,       validar, ctrl.crear);
  router.put( "/:id", ...soloAdmin, actualizarValidator,  validar, ctrl.actualizar);
  router.delete("/:id", ...soloAdmin, ctrl.desactivar);

  // Reasignación de sucursal: aplica hacia adelante, historial intacto
  router.put("/:id/sucursal", ...soloAdmin, cambiarSucursalValidator, validar, ctrl.cambiarSucursal);

  app.use("/api/empleados", router);
};
