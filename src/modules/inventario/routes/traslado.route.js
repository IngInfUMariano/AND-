"use strict";

module.exports = (app) => {
    const controlador = require("../controllers/traslado.controller.js");
    const router = require("express").Router();

    const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
    const validar = require("../../../core/middlewares/validar");
    const {
        crearValidator,
        recibirValidator,
        anularValidator
    } = require("../validators/traslado.validator");

    // Rutas privadas exclusivas de la aplicación interna
    router.use(verifyToken, onlyApp("interno"));

    router.get("/", hasRole("ADMIN", "GERENTE", "BODEGA"), controlador.listar);
    router.get("/:id", hasRole("ADMIN", "GERENTE", "BODEGA"), controlador.obtener);

    // Despachar traslado
    router.post(
        "/",
        hasRole("ADMIN", "GERENTE", "BODEGA"),
        crearValidator,
        validar,
        controlador.crear
    );

    // Recepcionar traslado en destino
    router.post(
        "/:id/recibir",
        hasRole("ADMIN", "GERENTE", "BODEGA"),
        recibirValidator,
        validar,
        controlador.recibir
    );

    // Anular traslado en tránsito
    router.post(
        "/:id/anular",
        hasRole("ADMIN", "GERENTE"),
        anularValidator,
        validar,
        controlador.anular
    );

    app.use("/api/traslados", router);
};