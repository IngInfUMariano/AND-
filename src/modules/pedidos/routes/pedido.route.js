"use strict";

const multer = require("multer");

// Configuración de Multer para parseo CSV en memoria
const storage = multer.memoryStorage();
const uploadCSV = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
  fileFilter: (req, file, cb) => {
    const nombreValido = file.originalname.toLowerCase().endsWith(".csv");
    const mimetypesValidos = [
      "text/csv",
      "text/plain",
      "text/x-csv",
      "application/csv",
      "application/x-csv",
      "application/vnd.ms-excel",
      "application/octet-stream"
    ];

    if (nombreValido || mimetypesValidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Formato no soportado. El archivo debe ser un CSV válido."));
    }
  }
});

module.exports = (app) => {
  const controlador = require("../controllers/pedido.controller.js");
  const router      = require("express").Router();

  const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
  const validar                           = require("../../../core/middlewares/validar");
  const { crearPedidoValidator, cambiarEstadoValidator, anularPedidoValidator } = require("../validators/pedido.validator");

  // Middleware global de token para todo el módulo de pedidos
  router.use(verifyToken);

  // ── Consultas y Cargas Estáticas ─────────────────────────────────────────
  // GET /api/pedidos -> Listar pedidos
  router.get("/", controlador.listar);

  // POST /api/pedidos/masivo -> Carga masiva CSV (Intercalamos uploadCSV.single('archivo'))
  router.post(
    "/masivo",
    uploadCSV.single("archivo"),
    controlador.cargarMasivo
  );

  // GET /api/pedidos/:id/hoja-recoleccion -> Generar Picking List para almacén
  router.get("/:id/hoja-recoleccion", controlador.generarHojaRecoleccion);

  // GET /api/pedidos/:id -> Ver detalle completo de un pedido
  router.get("/:id", controlador.obtener);

  // ── Creación de Pedidos ───────────────────────────────────────────────────
  // POST /api/pedidos -> Realizar Checkout desde carrito
  router.post(
    "/",
    crearPedidoValidator,
    validar,
    controlador.crear
  );

  // ── Gestión Operativa (Portal Interno) ───────────────────────────────────
  // PATCH /api/pedidos/:id/estado -> Cambiar estado del pedido
  router.patch(
    "/:id/estado",
    onlyApp("interno"),
    hasRole("ADMIN", "GERENTE", "VENDEDOR", "BODEGUERO"),
    cambiarEstadoValidator,
    validar,
    controlador.cambiarEstado
  );

  // POST /api/pedidos/:id/anular -> Anular un pedido
  router.post(
    "/:id/anular",
    onlyApp("interno"),
    hasRole("ADMIN", "GERENTE"),
    anularPedidoValidator,
    validar,
    controlador.anular
  );

  // Montar el router bajo el prefijo del recurso
  app.use("/api/pedidos", router);
};