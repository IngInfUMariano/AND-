// categoria.route.js — define los endpoints REST del recurso categorías.
//
// Estructura del archivo:
//   Exporta una función que recibe `app`. El routes.loader la llama al arrancar
//   el servidor y pasa el objeto app de Express. Así este archivo queda igual
//   al tutorial y aun así se monta automáticamente sin tocar server.js ni app.js.
//
// Por qué se validan permisos en el servidor:
//   Ocultar un botón en el frontend no protege el endpoint. Cualquier cliente
//   HTTP puede ignorar la interfaz y llamar directamente a la API. La cadena
//   verifyToken → onlyApp → hasRole garantiza que, aunque el cliente sea
//   malicioso, el servidor rechaza la petición con el código correcto.
//
// Nota sobre el campo `app` del JWT:
//   onlyApp compara req.usuario.app con la cadena que se le pasa.
//   El módulo de autenticación debe guardar el valor en minúsculas ("interno" /
//   "tienda") al firmar el token, en concordancia con el contrato de API.md.

"use strict";

module.exports = (app) => {
  const controlador = require("../controllers/categoria.controller.js");
  const router      = require("express").Router();

  const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
  const validar = require("../../../core/middlewares/validar");
  const { crearValidator, actualizarValidator } = require("../validators/categoria.validator");

  // ── Rutas públicas ────────────────────────────────────────────────────────
  // GET es público porque la tienda en línea necesita mostrar el catálogo de
  // categorías sin que el visitante tenga cuenta ni sesión iniciada.
  router.get("/",    controlador.listar);
  router.get("/:id", controlador.obtener);

  // ── Rutas protegidas: solo portal interno, perfil ADMIN o GERENTE ─────────
  // POST y PUT permiten ADMIN y GERENTE (API.md §7 módulo catálogo).
  // DELETE (baja lógica) es solo ADMIN para evitar borrados accidentales.
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
  app.use("/api/categorias", router);
};
