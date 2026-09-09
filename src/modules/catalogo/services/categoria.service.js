// categoria.service.js — toda la lógica de negocio del recurso categorías.
//
// Por qué la lógica va aquí y no en el controlador:
//   El controlador solo conoce HTTP (req, res). Si mezclamos reglas de negocio
//   ahí, cualquier cambio en la regla obliga a tocar código HTTP, y viceversa.
//   El servicio no sabe nada de Express: recibe datos planos y devuelve objetos
//   o lanza AppError. Eso lo hace reutilizable desde cron jobs, workers, etc.

"use strict";

const { Op }           = require("sequelize");
const db               = require("../../../loaders/models.loader");
const AppError         = require("../../../core/utils/AppError");
const { parsearPaginacion } = require("../../../core/utils/paginacion");

// Columnas por las que se puede ordenar en la lista pública.
// Las que no estén aquí se ignoran silenciosamente (ver parsearPaginacion).
const SORTABLES = ["nombre", "created_at", "activo"];

// ─── listar ──────────────────────────────────────────────────────────────────
// Devuelve una página de categorías con filtros opcionales.
// ?q=texto   → búsqueda ILIKE en nombre y descripción
// ?activo=   → "true" (default), "false", "todos"
const listar = async (query) => {
  const { limit, offset, order, page } = parsearPaginacion(query, SORTABLES);

  const where = {};

  // Búsqueda de texto libre en nombre o descripción
  if (query.q) {
    where[Op.or] = [
      { nombre:      { [Op.iLike]: `%${query.q}%` } },
      { descripcion: { [Op.iLike]: `%${query.q}%` } }
    ];
  }

  // Filtro de activo: el default es "solo activos" para que la tienda no vea registros desactivados
  if (query.activo === "false") {
    where.activo = false;
  } else if (query.activo === "todos") {
    // Sin filtro: muestra activos e inactivos (para el panel de administración)
  } else {
    where.activo = true;
  }

  const { rows, count } = await db.categoria.findAndCountAll({
    where,
    limit,
    offset,
    // Si no se especificó ?sort=, ordenar alfabéticamente por nombre
    order: order.length ? order : [["nombre", "asc"]],
    // Incluir el padre para que la tienda pueda mostrar la jerarquía
    include: [
      {
        model:      db.categoria,
        as:         "categoriaPadre",
        attributes: ["id", "nombre"]
      }
    ]
  });

  return { rows, count, page, limit };
};

// ─── obtener ──────────────────────────────────────────────────────────────────
// Devuelve una categoría con su padre y sus subcategorías directas.
const obtener = async (id) => {
  const categoria = await db.categoria.findByPk(id, {
    include: [
      {
        model:      db.categoria,
        as:         "categoriaPadre",
        attributes: ["id", "nombre"]
      },
      {
        model:      db.categoria,
        as:         "subcategorias",
        attributes: ["id", "nombre", "activo"]
      }
    ]
  });

  if (!categoria) throw new AppError("Categoría no encontrada", 404);
  return categoria;
};

// ─── crear ────────────────────────────────────────────────────────────────────
// Crea una categoría nueva.
// La unicidad del nombre no se valida aquí: si se viola el UNIQUE de la BD,
// Sequelize lanza UniqueConstraintError y el errorHandler lo convierte en 409.
// Centralizar ese manejo en errorHandler evita repetirlo en cada servicio.
const crear = async (datos) => {
  const { nombre, descripcion, categoria_padre_id } = datos;
  return db.categoria.create({ nombre, descripcion, categoria_padre_id });
};

// ─── actualizar ───────────────────────────────────────────────────────────────
// Actualiza los campos enviados; los que no vienen en el cuerpo no se tocan.
const actualizar = async (id, datos) => {
  const categoria = await db.categoria.findByPk(id);
  if (!categoria) throw new AppError("Categoría no encontrada", 404);

  // Whitelist explícita: solo dejamos pasar los campos del esquema.
  // Si alguien manda "activo: false" por PUT, lo ignoramos (para eso es DELETE).
  const campos = {};
  if ("nombre"             in datos) campos.nombre             = datos.nombre;
  if ("descripcion"        in datos) campos.descripcion        = datos.descripcion;
  if ("categoria_padre_id" in datos) campos.categoria_padre_id = datos.categoria_padre_id;

  return categoria.update(campos);
};

// ─── desactivar ───────────────────────────────────────────────────────────────
// Baja lógica: activo = false. NUNCA se elimina el registro.
//
// Por qué la baja es lógica y no un DELETE físico:
//   Los productos ya vendidos tienen categoria_id. Si borramos la fila, esas
//   FKs quedan huérfanas o el motor rechaza el DELETE con un error de
//   integridad. La baja lógica preserva el historial y permite reactivar.
//
// Regla de negocio: no se puede desactivar una categoría con productos activos.
//   Si la tienda sigue mostrando esos productos, la categoría debe existir.
const desactivar = async (id) => {
  const categoria = await db.categoria.findByPk(id);
  if (!categoria) throw new AppError("Categoría no encontrada", 404);

  const productosActivos = await db.producto.count({
    where: { categoria_id: id, activo: true }
  });

  if (productosActivos > 0) {
    throw AppError.reglaNegocio(
      "No se puede desactivar una categoría con productos activos",
      [`La categoría tiene ${productosActivos} producto(s) activo(s) asociado(s)`]
    );
  }

  await categoria.update({ activo: false });
  // 204 sin cuerpo: el controlador llama a sinContenido(res)
};

module.exports = { listar, obtener, crear, actualizar, desactivar };
