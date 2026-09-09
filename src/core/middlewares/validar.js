const { validationResult } = require("express-validator");

// validar recoge los errores que acumularon los express-validator checks
// definidos antes de él en la cadena de middlewares y los formatea según el
// contrato. Si hay errores corta la cadena y responde 400; si no, pasa al
// controlador con req limpio.
//
// Uso en una ruta:
//   const { body } = require("express-validator");
//   router.post(
//     "/productos",
//     body("codigo").notEmpty().withMessage("El código es obligatorio"),
//     body("nombre").notEmpty(),
//     validar,           // ← aquí se evalúan todos los checks anteriores
//     asyncHandler(controlador)
//   );
const validar = (req, res, next) => {
  const errores = validationResult(req);
  if (errores.isEmpty()) return next();

  // Se mapea a mensajes planos para que el cliente sepa exactamente qué campo
  // falló sin necesidad de parsear la estructura de express-validator
  const detalles = errores.array().map((e) => `${e.path}: ${e.msg}`);

  return res.status(400).json({
    error: {
      mensaje: "Datos de entrada inválidos",
      detalles
    }
  });
};

module.exports = validar;
