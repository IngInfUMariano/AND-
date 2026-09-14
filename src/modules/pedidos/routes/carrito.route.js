"use strict";

module.exports = (app) => {
  const controlador = require("../controllers/carrito.controller.js");
  const router      = require("express").Router();

  const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
  const validar         = require("../../../core/middlewares/validar");
  const { agregarItemValidator, actualizarCantidadValidator } = require("../validators/carrito.validator");

  // Todas las rutas del carrito son exclusivas del portal tienda (CLIENTE)
  router.use(verifyToken, onlyApp("tienda"), hasRole("CLIENTE"));

  // GET /api/carrito -> Obtener carrito activo del usuario
  router.get("/", controlador.obtenerCarrito);

  // POST /api/carrito/revalidar -> Revalidar stock y precios vigentes antes del checkout (RF-PED-03)
  router.post("/revalidar", controlador.revalidarCarrito);

  // POST /api/carrito/items -> Agregar producto/variante al carrito
  router.post(
    "/items",
    agregarItemValidator,
    validar,
    controlador.agregarItem
  );

  // PUT /api/carrito/items/:itemId -> Actualizar cantidad de un ítem
  router.put(
    "/items/:itemId",
    actualizarCantidadValidator,
    validar,
    controlador.actualizarCantidad
  );

  // DELETE /api/carrito/items/:itemId -> Quitar un ítem del carrito
  router.delete("/items/:itemId", controlador.eliminarItem);

  // DELETE /api/carrito -> Vaciar el carrito por completo
  router.delete("/", controlador.vaciarCarrito);

  // Montar el router bajo el prefijo del recurso
  app.use("/api/carrito", router);
};