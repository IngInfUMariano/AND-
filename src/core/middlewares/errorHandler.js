const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError, DatabaseError } =
  require("sequelize");
const AppError = require("../utils/AppError");

// errorHandler es el único lugar donde se construye la respuesta de error.
// Recibe tanto AppError (errores operacionales conocidos) como errores
// inesperados (bugs, caídas de BD) y los traduce al formato del contrato.
// En producción nunca filtra detalles internos: nombres de tabla, stack traces
// ni mensajes crudos de Sequelize llegan al cliente.

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // --- Traducción de errores de Sequelize al contrato ---
  if (err instanceof UniqueConstraintError) {
    // Registro duplicado: el cliente envió un valor que ya existe en la BD
    const campos = err.errors.map((e) => e.path);
    return res.status(409).json({
      error: {
        mensaje: "Ya existe un registro con esos datos",
        detalles: campos.map((c) => `El campo "${c}" ya está en uso`)
      }
    });
  }

  if (err instanceof ForeignKeyConstraintError) {
    // FK rota: se intenta referenciar o eliminar un registro dependiente
    return res.status(409).json({
      error: {
        mensaje: "Operación rechazada por integridad referencial",
        detalles: []
      }
    });
  }

  if (err instanceof ValidationError) {
    // Validación de Sequelize fallida (constraints de modelo, no de BD)
    const detalles = err.errors.map((e) => `${e.path}: ${e.message}`);
    return res.status(400).json({
      error: { mensaje: "Datos de entrada inválidos", detalles }
    });
  }

  if (err instanceof DatabaseError) {
    // Solo interceptar errores de tipo/sintaxis de PostgreSQL (22P02, 22003, etc.)
    // Los demás DatabaseError son bugs internos y deben ir al bloque de 500.
    const pgCode = err.original?.code;
    const invalidTypeCodes = ["22P02", "22003", "22P05", "22007"];
    if (invalidTypeCodes.includes(pgCode)) {
      return res.status(400).json({
        error: { mensaje: "Parámetro inválido en la solicitud", detalles: [] }
      });
    }
    // Otros DatabaseError caen al bloque de 500 más abajo
  }

  // --- Errores operacionales lanzados con AppError ---
  if (err.esOperacional) {
    return res.status(err.status).json({
      error: {
        mensaje: err.message,
        detalles: err.detalles || []
      }
    });
  }

  // --- Error inesperado (bug, caída de BD, etc.) ---
  // Se registra completo en servidor, pero el cliente solo ve un mensaje genérico
  console.error("[ERROR NO CONTROLADO]", err);

  const esProd = process.env.NODE_ENV === "production";
  res.status(500).json({
    error: {
      mensaje: "Error interno del servidor",
      // En desarrollo se expone el mensaje para facilitar depuración local
      detalles: esProd ? [] : [err.message]
    }
  });
};

module.exports = errorHandler;
