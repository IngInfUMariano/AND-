"use strict";

module.exports = (app) => {
    const controlador = require("../controllers/comprobante.controller.js");
    const router = require("express").Router();

    const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
    const validar = require("../../../core/middlewares/validar");
    const {
        crearValidator,
        anularValidator
    } = require("../validators/comprobante.validator");

    router.use(verifyToken, onlyApp("interno"));

    router.get("/", hasRole("ADMIN", "GERENTE", "BODEGA"), controlador.listar);
    router.get("/:id", hasRole("ADMIN", "GERENTE", "BODEGA"), controlador.obtener);

    router.post(
        "/",
        hasRole("ADMIN", "GERENTE", "BODEGA"),
        crearValidator,
        validar,
        controlador.crear
    );

    router.post(
        "/:id/anular",
        hasRole("ADMIN", "GERENTE"),
        anularValidator,
        validar,
        controlador.anular
    );

    app.use("/api/comprobantes", router);
};