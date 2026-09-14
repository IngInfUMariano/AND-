"use strict";

module.exports = (app) => {
    const controlador = require("../controllers/existencia.controller.js");
    const router = require("express").Router();

    const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
    const validar = require("../../../core/middlewares/validar");
    const { crearValidator, actualizarValidator } = require("../validators/existencia.validator");

    //  Rutas protegidas 
    // Las existencias son de uso interno del sistema
    router.use(verifyToken, onlyApp("interno"));

    router.get("/", controlador.listar);
    router.get("/:id", controlador.obtener);

    router.post(
        "/",
        hasRole("ADMIN", "GERENTE", "BODEGUERO"),
        crearValidator,
        validar,
        controlador.crear
    );

    router.put(
        "/:id",
        hasRole("ADMIN", "GERENTE"),
        actualizarValidator,
        validar,
        controlador.actualizar
    );

    app.use("/api/existencias", router);
};