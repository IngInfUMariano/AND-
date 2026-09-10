"use strict";

module.exports = (app) => {
  const controlador = require("../controllers/color.controller.js");
  const router      = require("express").Router();

  const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
  const validar = require("../../../core/middlewares/validar");
  const { crearValidator, actualizarValidator } = require("../validators/color.validator");

  // Rutas publicas
    router.get("/",    controlador.listar);
    router.get("/:id", controlador.obtener);

    //Rutas de portal interno
    router.post(
        "/",
        verifyToken, onlyApp("interno"), hasRole("ADMIN", "GERENTE"),
        crearValidator, validar,
        controlador.crear
    );

    router.put(
        "/:id",
        verifyToken, onlyApp("interno"), hasRole("ADMIN", "GERENTE"),
        actualizarValidator, validar,
        controlador.actualizar
    );

    router.delete(
        "/:id",
        verifyToken, onlyApp("interno"), hasRole("ADMIN"),
        controlador.desactivar
    );

  // Montar el router bajo el prefijo del recurso
  app.use("/api/colors", router);
};