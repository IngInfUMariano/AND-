// usuario.service.js — gestión de usuarios internos (ADMIN, GERENTE, BODEGUERO, VENDEDOR).
//
// Este servicio opera solo sobre usuarios con app = "INTERNO".
// Los usuarios de tienda (CLIENTE) se crean y gestionan desde auth.service.js.

"use strict";

const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");

const db                = require("../../../loaders/models.loader");
const AppError          = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");
const registrarBitacora = require("../../../core/utils/registrarBitacora");

const SORTABLES = ["email", "perfil", "created_at", "ultimo_acceso"];

// ─── listar ──────────────────────────────────────────────────────────────────
// Lista usuarios internos con filtros y paginación.
const listar = async (query) => {
  const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

  const where = { app: "INTERNO" };

  if (query.activo === "false")      where.activo = false;
  else if (query.activo === "todos") { /* sin filtro */ }
  else                               where.activo = true;

  if (query.perfil)      where.perfil      = query.perfil;
  if (query.sucursal_id) where.sucursal_id = parseInt(query.sucursal_id, 10);

  if (query.q) {
    where[Op.or] = [{ email: { [Op.iLike]: `%${query.q}%` } }];
  }

  const { rows, count } = await db.usuario.findAndCountAll({
    where,
    limit,
    offset,
    order: order.length ? order : [["created_at", "desc"]],
    attributes: { exclude: ["password_hash", "token_recuperacion", "token_expira"] },
    include: [
      { model: db.empleado, attributes: ["nombres", "apellidos", "puesto"] },
      { model: db.sucursal, attributes: ["id", "nombre"] }
    ]
  });

  return { rows, count, page, limit };
};

// ─── obtener ─────────────────────────────────────────────────────────────────
const obtener = async (id) => {
  const usuario = await db.usuario.findOne({
    where: { id, app: "INTERNO" },
    attributes: { exclude: ["password_hash", "token_recuperacion", "token_expira"] },
    include: [
      { model: db.empleado, attributes: ["nombres", "apellidos", "puesto"] },
      { model: db.sucursal, attributes: ["id", "nombre"] }
    ]
  });

  if (!usuario) throw AppError.noEncontrado("Usuario");
  return usuario;
};

// ─── crear ────────────────────────────────────────────────────────────────────
// Crea un usuario interno. El admin fija la contraseña inicial; el usuario
// debería cambiarla en su primer acceso (flujo fuera del alcance actual).
const crear = async (datos, solicitanteId, ip) => {
  const { email, password, perfil, empleado_id, sucursal_id } = datos;

  // Los usuarios CLIENTE se registran vía /api/auth/registro, no desde aquí.
  if (perfil === "CLIENTE") {
    throw AppError.reglaNegocio(
      "Los usuarios con perfil CLIENTE se crean desde el registro de tienda"
    );
  }

  const hash = bcrypt.hashSync(password, 10);

  const usuario = await db.usuario.create({
    email,
    password_hash:    hash,
    perfil,
    app:              "INTERNO",
    empleado_id:      empleado_id || null,
    sucursal_id:      sucursal_id || null,
    activo:           true,
    // Admin crea → verificado automáticamente; no necesita link de correo.
    email_verificado: true
  });

  await registrarBitacora({
    usuario_id:    solicitanteId,
    operacion:     "ALTA_USUARIO",
    entidad:       "usuario",
    entidad_id:    usuario.id,
    valores_nuevos: { email, perfil, app: "interno" },
    ip
  });

  const { password_hash: _, token_recuperacion: __, token_expira: ___, ...datos_usuario } =
    usuario.toJSON();
  return datos_usuario;
};

// ─── actualizar ───────────────────────────────────────────────────────────────
// Actualiza campos del usuario. Si se cambia el perfil, se registra en bitácora.
const actualizar = async (id, datos, solicitanteId, ip) => {
  const usuario = await db.usuario.findOne({ where: { id, app: "INTERNO" } });
  if (!usuario) throw AppError.noEncontrado("Usuario");

  if ("perfil" in datos && datos.perfil === "CLIENTE") {
    throw AppError.reglaNegocio("No se puede asignar perfil CLIENTE a un usuario interno");
  }

  const perfilAnterior = usuario.perfil;

  const campos = {};
  if ("email"            in datos) campos.email            = datos.email;
  if ("perfil"           in datos) campos.perfil           = datos.perfil;
  if ("empleado_id"      in datos) campos.empleado_id      = datos.empleado_id;
  if ("sucursal_id"      in datos) campos.sucursal_id      = datos.sucursal_id;
  if ("email_verificado" in datos) campos.email_verificado = datos.email_verificado;

  const actualizado = await usuario.update(campos);

  if ("perfil" in campos && campos.perfil !== perfilAnterior) {
    await registrarBitacora({
      usuario_id:         solicitanteId,
      operacion:          "CAMBIO_PERFIL",
      entidad:            "usuario",
      entidad_id:         id,
      valores_anteriores: { perfil: perfilAnterior },
      valores_nuevos:     { perfil: campos.perfil },
      ip
    });
  }

  const {
    password_hash: _,
    token_recuperacion: __,
    token_expira: ___,
    ...resultado
  } = actualizado.toJSON();
  return resultado;
};

// ─── desactivar ───────────────────────────────────────────────────────────────
// Baja lógica del usuario. Rechaza si es el último ADMIN activo.
//
// Por qué no cerramos las sesiones JWT activas:
//   JWT es stateless; no hay lista de tokens emitidos. Las sesiones activas
//   siguen siendo válidas hasta su vencimiento natural. Para cierre real se
//   necesitaría una lista negra en Redis o un campo `password_version` en el
//   modelo — fuera del alcance de este módulo.
const desactivar = async (id, solicitanteId, ip) => {
  const usuario = await db.usuario.findOne({ where: { id, app: "INTERNO" } });
  if (!usuario) throw AppError.noEncontrado("Usuario");
  if (!usuario.activo) throw AppError.reglaNegocio("El usuario ya está inactivo");

  // Proteger el acceso al sistema: debe quedar al menos un ADMIN activo.
  if (usuario.perfil === "ADMIN") {
    const adminsActivos = await db.usuario.count({
      where: { perfil: "ADMIN", activo: true, app: "INTERNO" }
    });
    if (adminsActivos <= 1) {
      throw AppError.reglaNegocio(
        "No se puede desactivar al último usuario con perfil ADMIN",
        ["Asigna el perfil ADMIN a otro usuario antes de desactivar éste"]
      );
    }
  }

  await usuario.update({ activo: false });

  await registrarBitacora({
    usuario_id:         solicitanteId,
    operacion:          "BAJA_USUARIO",
    entidad:            "usuario",
    entidad_id:         id,
    valores_anteriores: { activo: true },
    valores_nuevos:     { activo: false },
    ip
  });
};

module.exports = { listar, obtener, crear, actualizar, desactivar };
