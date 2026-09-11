"use strict";

module.exports = (app) => {
    const controlador = require("../controllers/producto.controller.js");
    const router = require("express").Router();

    const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
    const validar = require("../../../core/middlewares/validar");
    const { crearValidator, actualizarValidator } = require("../validators/producto.validator");

    //  Rutas públicas 
    router.get("/", controlador.listar);
    router.get("/:id", controlador.obtener);

    //  Rutas protegidas: solo portal interno, perfil ADMIN o GERENTE 
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

    app.use("/api/productos", router);
};