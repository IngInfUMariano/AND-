// AppError centraliza todos los errores operacionales conocidos de la aplicación.
// Separarlos de los errores inesperados (bug, caída de BD) permite que el
// errorHandler decida si expone detalles al cliente o solo registra en log.
class AppError extends Error {
  // status:   código HTTP que recibirá el cliente
  // detalles: arreglo de strings adicionales (campos fallidos, motivo, etc.)
  constructor(mensaje, status, detalles = []) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
    // Marca que este error fue lanzado a propósito; el errorHandler no lo loguea como bug
    this.esOperacional = true;
  }
}

// --- Helpers de fábrica ---
// Uso: throw AppError.noEncontrado("Pedido")
//       → 404 "Pedido no encontrado"
AppError.noEncontrado = (entidad) =>
  new AppError(`${entidad} no encontrado`, 404);

// Uso: throw AppError.reglaNegocio("Existencia insuficiente", ["Solo quedan 3 unidades"])
//       → 422 con detalles
AppError.reglaNegocio = (mensaje, detalles = []) =>
  new AppError(mensaje, 422, detalles);

// Uso: throw AppError.conflicto("El correo ya está registrado")
//       → 409
AppError.conflicto = (mensaje) =>
  new AppError(mensaje, 409);

// Uso: throw AppError.sinPermiso("Solo ADMIN puede aprobar clientes")
//       → 403
AppError.sinPermiso = (mensaje) =>
  new AppError(mensaje, 403);

// Uso: throw AppError.noAutenticado()
//       → 401
AppError.noAutenticado = (mensaje = "Token inválido o ausente") =>
  new AppError(mensaje, 401);

module.exports = AppError;
