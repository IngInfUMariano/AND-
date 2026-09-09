// enviarCorreo.js — stub de envío de email.
//
// TODO: integrar un proveedor real (SendGrid, Resend, SES) cuando se defina la
// infraestructura de producción. Por ahora imprime en consola para que el equipo
// pueda trabajar y probar todos los flujos que dependen de email sin bloquearse.

"use strict";

/**
 * Simula el envío de un correo electrónico.
 * En producción esta función llamará al proveedor configurado.
 *
 * @param {object} opciones
 * @param {string} opciones.destinatario - Email del receptor
 * @param {string} opciones.asunto       - Asunto del correo
 * @param {string} [opciones.enlace]     - URL de acción principal (recuperación, verificación…)
 * @param {string} [opciones.cuerpo]     - Texto libre adicional
 */
const enviarCorreo = async ({ destinatario, asunto, enlace, cuerpo }) => {
  console.log("─".repeat(60));
  console.log("[EMAIL STUB] Correo que se enviaría en producción:");
  console.log(`  Para    : ${destinatario}`);
  console.log(`  Asunto  : ${asunto}`);
  if (enlace)  console.log(`  Enlace  : ${enlace}`);
  if (cuerpo)  console.log(`  Cuerpo  : ${cuerpo}`);
  console.log("─".repeat(60));
};

module.exports = enviarCorreo;
