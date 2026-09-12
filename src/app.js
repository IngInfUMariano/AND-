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

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "API INVENTA" });
});

// Montar todas las rutas de los módulos automáticamente.
// El loader recorre src/modules/*/routes/*.route.js y llama a cada archivo con `app`.
// Así nadie tiene que editar este archivo cuando se agrega un módulo nuevo.
require("./loaders/routes.loader")(app);

// errorHandler debe registrarse después de todas las rutas: Express lo
// identifica como manejador de errores por la aridad de 4 parámetros.
app.use(errorHandler);

module.exports = app;
