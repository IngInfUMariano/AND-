"use strict";

module.exports = (app) => {
    const controlador = require("../controllers/correlativo.controller.js");
    const router = require("express").Router();

    const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
    const validar = require("../../../core/middlewares/validar");
    const {
        crearValidator,
        actualizarValidator
    } = require("../validators/correlativo.validator");

    router.use(verifyToken, onlyApp("interno"));

    // Lectura de configuraciones de correlativos
    router.get("/", hasRole("ADMIN", "GERENTE"), controlador.listar);
    router.get("/:id", hasRole("ADMIN", "GERENTE"), controlador.obtener);

    // Creación y edición (exclusivo para administradores)
    router.post(
        "/",
        hasRole("ADMIN"),
        crearValidator,
        validar,
        controlador.crear
    );

    router.put(
        "/:id",
        hasRole("ADMIN"),
        actualizarValidator,
        validar,
        controlador.actualizar
    );

    app.use("/api/correlativos", router);
};