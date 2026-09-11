// pago.route.js — endpoints REST del módulo de pagos.
//
// Rutas registradas:
//   /api/pagos/*          → pagosRouter
//   /api/clientes/:id/abonos y /api/clientes/:id/estado-cuenta → clientesCreditoRouter
//
// IMPORTANTE sobre el webhook:
//   La ruta POST /api/pagos/webhook requiere el body CRUDO (Buffer) para que
//   stripe.webhooks.constructEvent() pueda verificar la firma HMAC.
//   El middleware express.raw({ type: "application/json" }) se aplica
//   específicamente para esa ruta en app.js, ANTES de express.json().
//   Aquí solo se declara la ruta; el parseo ya ocurrió.
//
// Orden de rutas en pagosRouter:
//   Los paths literales (formas-pago, intencion, webhook, transacciones, credito)
//   se registran ANTES que los paths con parámetros (:id) para evitar que Express
//   interprete un segmento literal como un parámetro.

"use strict";

module.exports = (app) => {
  const ctrl   = require("../controllers/pago.controller");
  const router = require("express").Router();

  const { verifyToken, hasRole, onlyApp } = require("../../../core/middlewares/authJwt");
  const validar  = require("../../../core/middlewares/validar");
  const {
    intencionValidator,
    transaccionesValidator,
    reembolsoValidator,
    abonoValidator,
    formasPagoValidator,
    creditoValidator,
  } = require("../validators/pago.validator");

  // Cadenas de middlewares reutilizables
  const tiendaCliente = [verifyToken, onlyApp("tienda"),    hasRole("CLIENTE")];
  const soloAdmin     = [verifyToken, onlyApp("interno"),   hasRole("ADMIN")];
  const adminGerente  = [verifyToken, onlyApp("interno"),   hasRole("ADMIN", "GERENTE")];

  // ── Rutas de la tienda (CLIENTE autenticado) ──────────────────────────────

  // GET /api/pagos/formas-pago/:pedidoId
  // Devuelve formas de pago disponibles según tipo de cliente y crédito disponible
  router.get(
    "/formas-pago/:pedidoId",
    ...tiendaCliente, formasPagoValidator, validar,
    ctrl.obtenerFormasPago
  );

  // POST /api/pagos/intencion
  // Crea un PaymentIntent en Stripe; el frontend usa el client_secret con Stripe Elements
  router.post(
    "/intencion",
    ...tiendaCliente, intencionValidator, validar,
    ctrl.crearIntencion
  );

  // POST /api/pagos/credito/:pedidoId
  // Registra el pago de un pedido mayorista al crédito (sin Stripe)
  router.post(
    "/credito/:pedidoId",
    ...tiendaCliente, creditoValidator, validar,
    ctrl.pagarConCredito
  );

  // ── Webhook de Stripe (público — la firma es la autenticación) ────────────

  // POST /api/pagos/webhook
  // Lo llama Stripe, no el frontend. El body llega como Buffer (ver app.js).
  // No se aplica verifyToken: la autenticación es la firma HMAC de Stripe.
  router.post("/webhook", ctrl.webhook);

  // ── Rutas del portal interno ──────────────────────────────────────────────

  // GET /api/pagos/transacciones
  // Lista transacciones con filtros (pedido_id, estado, tipo, fechas)
  router.get(
    "/transacciones",
    ...soloAdmin, transaccionesValidator, validar,
    ctrl.listarTransacciones
  );

  // POST /api/pagos/:id/reembolso
  // Reembolso total o parcial de una transacción exitosa; motivo obligatorio
  router.post(
    "/:id/reembolso",
    ...adminGerente, reembolsoValidator, validar,
    ctrl.reembolsar
  );

  app.use("/api/pagos", router);

  // ── Rutas de crédito bajo /api/clientes ──────────────────────────────────
  // Se montan en /api/clientes para coherencia con el recurso, aunque la
  // lógica vive en el módulo de pagos.

  const clientesCreditoRouter = require("express").Router();
  const adminGerenteVendedor  = [verifyToken, onlyApp("interno"), hasRole("ADMIN", "GERENTE", "VENDEDOR")];

  // POST /api/clientes/:id/abonos
  // Registra un abono al crédito del cliente. Solo ADMIN.
  clientesCreditoRouter.post(
    "/:id/abonos",
    ...soloAdmin, abonoValidator, validar,
    ctrl.registrarAbono
  );

  // GET /api/clientes/:id/estado-cuenta
  // Historial de movimientos de crédito con resumen
  clientesCreditoRouter.get(
    "/:id/estado-cuenta",
    ...adminGerenteVendedor,
    ctrl.obtenerEstadoCuenta
  );

  app.use("/api/clientes", clientesCreditoRouter);
};
