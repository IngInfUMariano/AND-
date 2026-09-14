const express = require("express");
const cors = require("cors");
const errorHandler = require("./core/middlewares/errorHandler");

const app = express();

app.use(cors());

// El webhook de Stripe necesita el body CRUDO (Buffer) para verificar la firma HMAC.
// Este middleware se registra ANTES de express.json() para que el stream no haya
// sido consumido cuando el controlador llame a stripe.webhooks.constructEvent().
// body-parser marca req._body=true después de leer, así que express.json() lo omite.
app.use("/api/pagos/webhook", express.raw({ type: "application/json" }));

// El SyntaxError que lanza express.json() cuando llega un body malformado
// no pasa por el errorHandler normal (tiene err.type === "entity.parse.failed").
// Este middleware lo intercepta y devuelve 400 con el formato del contrato.
app.use(express.json());
app.use((err, _req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { mensaje: "El cuerpo de la solicitud no es JSON válido", detalles: [] }
    });
  }
  next(err);
});

app.get("/", (_req, res) => {
  res.json({ message: "API INVENTA" });
});

// Montar todas las rutas de los módulos automáticamente.
// El loader recorre src/modules/*/routes/*.route.js y llama a cada archivo con `app`.
// Así nadie tiene que editar este archivo cuando se agrega un módulo nuevo.
require("./loaders/routes.loader")(app);

// Ruta no encontrada — responde JSON en lugar del HTML por defecto de Express.
app.use((_req, res) => {
  res.status(404).json({ error: { mensaje: "Ruta no encontrada", detalles: [] } });
});

// errorHandler debe registrarse después de todas las rutas: Express lo
// identifica como manejador de errores por la aridad de 4 parámetros.
app.use(errorHandler);

module.exports = app;
