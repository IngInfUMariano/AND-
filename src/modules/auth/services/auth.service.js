// auth.service.js — toda la lógica de autenticación y gestión de sesión propia.
//
// Por qué la lógica de login vive aquí y no en el controlador:
//   El login es la operación de mayor impacto de seguridad del sistema. Si
//   mezcláramos las reglas de verificación con el código HTTP, cualquier cambio
//   en la cadena (orden de checks, manejo del bloqueo, firma del token) obligaría
//   a tocar código de Express. El servicio no conoce req/res: recibe datos planos
//   y devuelve objetos o lanza AppError.

"use strict";

const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const crypto  = require("crypto");

const { JWT_SECRET, JWT_EXPIRES_IN, JWT_EXPIRES_IN_TIENDA } =
  require("../../../config/auth.config");
const db                = require("../../../loaders/models.loader");
const AppError          = require("../../../core/utils/AppError");
const enviarCorreo      = require("../../../core/utils/enviarCorreo");
const registrarBitacora = require("../../../core/utils/registrarBitacora");

const MAX_INTENTOS    = 5;
const MINUTOS_BLOQUEO = 15;

// Hash ficticio para usar cuando el email no existe en BD. Sin esto, un atacante
// puede enumerar qué emails están registrados midiendo latencias: findOne es rápido
// pero bcrypt es lento, por lo que "email inexistente" respondería más rápido.
const HASH_FICTICIO =
  "$2a$10$abcdefghijklmnopqrstuuVGmXIJLBWxkXXSxSuNvOMC9tAb62gkC";

// ─── firmarToken ─────────────────────────────────────────────────────────────
// app va en minúsculas porque onlyApp("interno") compara exactamente así.
// La BD guarda "INTERNO"/"TIENDA" (ENUM mayúsculas) → toLowerCase() aquí.
const firmarToken = (usuario, tipoCliente, expiresIn) =>
  jwt.sign(
    {
      id:           usuario.id,
      perfil:       usuario.perfil,
      sucursal_id:  usuario.sucursal_id || null,
      tipo_cliente: tipoCliente || null,
      app:          usuario.app.toLowerCase()
    },
    JWT_SECRET,
    { expiresIn }
  );

// ─── loginBase ────────────────────────────────────────────────────────────────
// Núcleo compartido para los dos logins.
// appRequerida: "INTERNO" | "TIENDA" tal como lo almacena la BD (mayúsculas).
//
// Orden deliberado de verificaciones:
//   1. Buscar usuario y correr bcrypt SIEMPRE (protección de timing).
//   2. Usuario no encontrado.
//   3. Bloqueo temporal → mensaje específico para que el usuario legítimo sepa
//      cuánto tiempo debe esperar.
//   4. activo / email_verificado / app → mismo mensaje genérico para no revelar
//      cuál condición falla: distinguir ayudaría a un atacante a mapear el sistema.
//   5. Contraseña incorrecta → incrementar contador y posiblemente bloquear.
//   6. Credenciales correctas → reset de contadores, firma del token.
const loginBase = async (email, password, appRequerida, ip) => {
  const usuario = await db.usuario.findOne({
    where: { email },
    include: [
      { model: db.empleado, attributes: ["nombres", "apellidos"] },
      { model: db.cliente,  attributes: ["nombre", "tipo"] },
      { model: db.sucursal, attributes: ["id", "nombre"] }
    ]
  });

  // Correr bcrypt siempre para igualar tiempos de respuesta
  const hashReal   = usuario ? usuario.password_hash : HASH_FICTICIO;
  const passwordOk = bcrypt.compareSync(password, hashReal);

  // ── Usuario no encontrado ─────────────────────────────────────────────────
  if (!usuario) {
    await registrarBitacora({
      usuario_id: null,
      operacion:  "LOGIN_FALLIDO",
      entidad:    "usuario",
      valores_nuevos: { razon: "email_no_encontrado" },
      ip
    });
    throw AppError.noAutenticado("Credenciales inválidas");
  }

  // ── Cuenta bloqueada ──────────────────────────────────────────────────────
  if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
    const hasta = new Date(usuario.bloqueado_hasta).toLocaleTimeString("es-GT", {
      hour: "2-digit", minute: "2-digit"
    });
    throw AppError.noAutenticado(
      `Cuenta bloqueada temporalmente. Intente de nuevo después de las ${hasta}`
    );
  }

  // ── Estado de la cuenta (agrupado para no revelar cuál condición falla) ───
  if (!usuario.activo || !usuario.email_verificado || usuario.app !== appRequerida) {
    throw AppError.noAutenticado("Credenciales inválidas");
  }

  // ── Contraseña incorrecta ─────────────────────────────────────────────────
  if (!passwordOk) {
    // El contador solo se incrementa cuando el usuario existe y su estado es
    // válido. Así un atacante que solo conoce el email no puede bloquear la
    // cuenta enviando peticiones al endpoint incorrecto o sin contraseña.
    const nuevosIntentos = (usuario.intentos_fallidos || 0) + 1;
    const bloquear       = nuevosIntentos >= MAX_INTENTOS;

    await usuario.update({
      intentos_fallidos: nuevosIntentos,
      bloqueado_hasta:   bloquear
        ? new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000)
        : usuario.bloqueado_hasta
    });

    await registrarBitacora({
      usuario_id:    usuario.id,
      operacion:     bloquear ? "BLOQUEO" : "LOGIN_FALLIDO",
      entidad:       "usuario",
      entidad_id:    usuario.id,
      valores_nuevos: { intentos: nuevosIntentos, bloqueado: bloquear },
      ip
    });

    throw AppError.noAutenticado("Credenciales inválidas");
  }

  // ── Login exitoso ─────────────────────────────────────────────────────────
  await usuario.update({
    intentos_fallidos: 0,
    bloqueado_hasta:   null,
    ultimo_acceso:     new Date()
  });

  const tipoCliente = usuario.cliente ? usuario.cliente.tipo : null;
  const expiresIn   = appRequerida === "INTERNO" ? JWT_EXPIRES_IN : JWT_EXPIRES_IN_TIENDA;
  const token       = firmarToken(usuario, tipoCliente, expiresIn);

  const nombre = usuario.empleado
    ? `${usuario.empleado.nombres} ${usuario.empleado.apellidos}`
    : usuario.cliente
      ? usuario.cliente.nombre
      : usuario.email;

  await registrarBitacora({
    usuario_id:    usuario.id,
    operacion:     "LOGIN_EXITOSO",
    entidad:       "usuario",
    entidad_id:    usuario.id,
    valores_nuevos: { app: appRequerida.toLowerCase() },
    ip
  });

  return {
    token,
    expira_en: expiresIn,
    usuario: {
      id:           usuario.id,
      nombre,
      perfil:       usuario.perfil,
      sucursal:     usuario.sucursal || null,
      tipo_cliente: tipoCliente
    }
  };
};

const loginInterno = (email, password, ip) => loginBase(email, password, "INTERNO", ip);
const loginTienda  = (email, password, ip) => loginBase(email, password, "TIENDA",  ip);

// ─── registro ─────────────────────────────────────────────────────────────────
// Crea un cliente MINORISTA y su usuario de tienda en una sola transacción.
// Si cualquiera de los dos inserts falla (email duplicado, etc.) la transacción
// revierte ambos para no dejar datos huérfanos.
const registro = async ({ nombre, email, password, telefono }, ip) => {
  const hash = bcrypt.hashSync(password, 10);

  // Código de cliente auto-generado. La carrera entre solicitudes simultáneas
  // es aceptable aquí: la constraint UNIQUE en clientes.codigo rechazaría duplicados.
  const count  = await db.cliente.count();
  const codigo = `CLI-${String(count + 1).padStart(4, "0")}`;

  const t = await db.sequelize.transaction();
  try {
    const cliente = await db.cliente.create({
      codigo,
      tipo:                  "MINORISTA",
      nombre,
      email,
      telefono:              telefono || null,
      estado:                "PENDIENTE",
      activo:                true,
      terminos_aceptados_en: new Date(),
      version_terminos:      "1.0"
    }, { transaction: t });

    const usuario = await db.usuario.create({
      email,
      password_hash:    hash,
      perfil:           "CLIENTE",
      app:              "TIENDA",
      cliente_id:       cliente.id,
      activo:           true,
      // email_verificado = true porque no hay flujo de verificación en este alcance.
      // En producción sería false y se enviaría un link de confirmación.
      email_verificado: true
    }, { transaction: t });

    await t.commit();

    await registrarBitacora({
      usuario_id:    usuario.id,
      operacion:     "ALTA_USUARIO",
      entidad:       "usuario",
      entidad_id:    usuario.id,
      valores_nuevos: { email, perfil: "CLIENTE", app: "tienda" },
      ip
    });

    await enviarCorreo({
      destinatario: email,
      asunto:       "Bienvenido a INVENTA — cuenta en revisión",
      enlace:       "https://app.inventa.gt/tienda",
      cuerpo:       "Tu cuenta fue creada y está siendo revisada. Te avisaremos cuando sea aprobada."
    });

    return {
      id:      usuario.id,
      email:   usuario.email,
      nombre,
      perfil:  "CLIENTE",
      estado:  cliente.estado
    };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

// ─── recuperar ────────────────────────────────────────────────────────────────
// Genera un token de recuperación de un solo uso y lo envía por email.
// Responde igual exista o no la cuenta para no revelar qué emails están registrados.
const recuperar = async (email, ip) => {
  const usuario = await db.usuario.findOne({ where: { email } });

  if (usuario) {
    const token  = crypto.randomBytes(32).toString("hex");
    const expira = new Date(Date.now() + 60 * 60 * 1000); // 60 minutos

    await usuario.update({ token_recuperacion: token, token_expira: expira });

    await enviarCorreo({
      destinatario: email,
      asunto:       "Recuperación de contraseña — INVENTA",
      enlace:       `https://app.inventa.gt/restablecer?token=${token}`
    });
  }

  // La respuesta es idéntica para emails registrados y no registrados.
  return { mensaje: "Si el email está registrado, recibirás instrucciones en breve." };
};

// ─── restablecer ──────────────────────────────────────────────────────────────
// Cambia la contraseña usando el token de recuperación.
// El token se anula inmediatamente al usarlo (de un solo uso).
const restablecer = async (token, nuevaPassword, ip) => {
  const usuario = await db.usuario.findOne({
    where: { token_recuperacion: token }
  });

  if (!usuario || !usuario.token_expira || new Date(usuario.token_expira) < new Date()) {
    throw AppError.noAutenticado("Token de recuperación inválido o expirado");
  }

  const hash = bcrypt.hashSync(nuevaPassword, 10);

  await usuario.update({
    password_hash:      hash,
    token_recuperacion: null, // invalidar el token para que no pueda reutilizarse
    token_expira:       null,
    intentos_fallidos:  0,
    bloqueado_hasta:    null
  });

  await registrarBitacora({
    usuario_id:    usuario.id,
    operacion:     "CAMBIO_PASSWORD",
    entidad:       "usuario",
    entidad_id:    usuario.id,
    valores_nuevos: { metodo: "token_recuperacion" },
    ip
  });

  // Nota: las sesiones JWT activas siguen siendo válidas hasta su vencimiento
  // natural porque JWT es stateless. Para invalidación real se requeriría un
  // campo `password_version` en el modelo o una lista negra de tokens en Redis.
  // Ambas opciones están fuera del alcance del módulo actual.
  return { mensaje: "Contraseña actualizada. Inicia sesión con tus nuevas credenciales." };
};

// ─── cambiarPassword ──────────────────────────────────────────────────────────
// Permite al usuario autenticado cambiar su propia contraseña validando la actual.
const cambiarPassword = async (usuarioId, passwordActual, nuevaPassword, ip) => {
  const usuario = await db.usuario.findByPk(usuarioId);
  if (!usuario) throw AppError.noEncontrado("Usuario");

  // Verificar la contraseña actual antes de permitir el cambio; sin este check,
  // cualquiera que robara el token podría cambiar la contraseña definitivamente.
  if (!bcrypt.compareSync(passwordActual, usuario.password_hash)) {
    throw AppError.noAutenticado("La contraseña actual es incorrecta");
  }

  const hash = bcrypt.hashSync(nuevaPassword, 10);

  await usuario.update({
    password_hash:     hash,
    intentos_fallidos: 0,
    bloqueado_hasta:   null
  });

  await registrarBitacora({
    usuario_id:    usuarioId,
    operacion:     "CAMBIO_PASSWORD",
    entidad:       "usuario",
    entidad_id:    usuarioId,
    valores_nuevos: { metodo: "cambio_propio" },
    ip
  });

  return { mensaje: "Contraseña actualizada exitosamente." };
};

// ─── obtenerPerfil ────────────────────────────────────────────────────────────
// Devuelve los datos del usuario autenticado desde la BD (no del JWT cache).
// Carga el empleado o cliente vinculado según el tipo de cuenta.
const obtenerPerfil = async (usuarioId) => {
  const usuario = await db.usuario.findByPk(usuarioId, {
    attributes: { exclude: ["password_hash", "token_recuperacion", "token_expira"] },
    include: [
      { model: db.empleado, attributes: ["nombres", "apellidos", "puesto"] },
      { model: db.cliente,  attributes: ["nombre", "tipo", "estado"] },
      { model: db.sucursal, attributes: ["id", "nombre"] }
    ]
  });

  if (!usuario) throw AppError.noEncontrado("Usuario");
  return usuario;
};

module.exports = {
  loginInterno,
  loginTienda,
  registro,
  recuperar,
  restablecer,
  cambiarPassword,
  obtenerPerfil
};
