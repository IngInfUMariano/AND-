"use strict";

module.exports = (app) => {
    const controlador = require("../controllers/sucursal.controller.js");
    const router = require("express").Router();

    const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
    const validar = require("../../../core/middlewares/validar");
    const { crearValidator, actualizarValidator } = require("../validators/sucursal.validator");

    //  Rutas 
    // A diferencia de productos, la lista de sucursales podría requerir estar 
    // pública para la tienda en línea (puntos de recogida, etc.), o protegida.
    // Asumiremos acceso público para GET para consultar disponibilidad por sucursal.
    router.get("/", controlador.listar);
    router.get("/:id", controlador.obtener);

    //  Rutas protegidas: solo perfil ADMIN 
    // La gestión de sucursales es crítica y suele estar reservada a administradores.
    router.post(
        "/",
        verifyToken, onlyApp("interno"), hasRole("ADMIN"),
        crearValidator, validar,
        controlador.crear
    );

    router.put(
        "/:id",
        verifyToken, onlyApp("interno"), hasRole("ADMIN"),
        actualizarValidator, validar,
        controlador.actualizar
    );

    router.delete(
        "/:id",
        verifyToken, onlyApp("interno"), hasRole("ADMIN"),
        controlador.desactivar
    );

    app.use("/api/sucursales", router);
};