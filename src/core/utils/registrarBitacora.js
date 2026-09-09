// registrarBitacora.js — escribe un registro de auditoría en la tabla bitacora.
//
// Por qué es una utilidad en core y no un método del servicio de bitácora:
//   La bitácora se escribe desde múltiples servicios (auth, usuarios, pedidos…).
//   Si fuera parte del servicio de bitácora, habría una dependencia circular entre
//   módulos. Al ponerla en core/utils, cualquier servicio la puede importar sin
//   acoplamientos de módulo a módulo.
//
// Por qué no lanza excepciones:
//   La auditoría no debe cortar el flujo de negocio. Si falla al escribir un log
//   de login exitoso, la sesión del usuario no debe invalidarse. Se registra el
//   error en consola para que operaciones puedan investigarlo.

"use strict";

const db = require("../../loaders/models.loader");

/**
 * Escribe una entrada en la tabla bitacora.
 *
 * @param {object}  datos
 * @param {number|null} datos.usuario_id         - ID del usuario que ejecutó la acción
 * @param {string}  datos.operacion              - Código de la operación ("LOGIN_EXITOSO", "ALTA_USUARIO"…)
 * @param {string}  datos.entidad                - Nombre del recurso afectado ("usuario", "cliente"…)
 * @param {number|null} [datos.entidad_id]       - PK del recurso afectado
 * @param {object|null} [datos.valores_anteriores] - Snapshot antes del cambio
 * @param {object|null} [datos.valores_nuevos]   - Snapshot después del cambio
 * @param {string|null} [datos.ip]               - IP del cliente
 */
const registrarBitacora = async ({
  usuario_id        = null,
  operacion,
  entidad,
  entidad_id        = null,
  valores_anteriores = null,
  valores_nuevos    = null,
  ip                = null
}) => {
  try {
    await db.bitacora.create({
      usuario_id,
      operacion,
      entidad,
      entidad_id,
      valores_anteriores,
      valores_nuevos,
      ip
    });
  } catch (err) {
    // Error no crítico: se loguea en consola pero no interrumpe la operación principal
    console.error(`[bitácora] Error al registrar operación "${operacion}":`, err.message);
  }
};

module.exports = registrarBitacora;
