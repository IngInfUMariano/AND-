"use strict";

const nodemailer = require("nodemailer");

// Transporte SMTP real cuando SMTP_HOST está definido; stub de consola si no.
const _transport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

/**
 * Envía un correo electrónico.
 * Si SMTP_HOST no está configurado, imprime en consola (modo desarrollo).
 *
 * @param {object} opciones
 * @param {string} opciones.destinatario
 * @param {string} opciones.asunto
 * @param {string} [opciones.html]    - Cuerpo HTML (preferido)
 * @param {string} [opciones.enlace]  - URL de acción (usado por flujos de auth)
 * @param {string} [opciones.cuerpo]  - Texto libre adicional (fallback para auth)
 */
const enviarCorreo = async ({ destinatario, asunto, html, enlace, cuerpo }) => {
  if (!_transport) {
    console.log("─".repeat(60));
    console.log("[EMAIL STUB] Correo que se enviaría en producción:");
    console.log(`  Para    : ${destinatario}`);
    console.log(`  Asunto  : ${asunto}`);
    if (enlace) console.log(`  Enlace  : ${enlace}`);
    if (cuerpo) console.log(`  Cuerpo  : ${cuerpo}`);
    if (html)   console.log(`  HTML    : (${html.length} chars)`);
    console.log("─".repeat(60));
    return;
  }

  const htmlFinal = html || `<p>${cuerpo || ""}</p>${enlace ? `<p><a href="${enlace}">${enlace}</a></p>` : ""}`;

  await _transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: destinatario,
    subject: asunto,
    html: htmlFinal,
  });
};

module.exports = enviarCorreo;
