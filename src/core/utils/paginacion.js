// paginacion.js estandariza cómo se leen los parámetros de paginación y orden
// del query string. Centralizar esto evita que cada servicio repita la lógica
// de coerción y validación de rangos, y garantiza que Sequelize reciba siempre
// valores seguros.

const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 100;
// Columnas permitidas en ?sort= para evitar inyección de nombres de columna.
// Cada módulo puede pasar su propio set si lo necesita.
const ORDEN_PERMITIDO = ["asc", "desc"];

/**
 * Extrae y valida los parámetros de paginación de req.query.
 *
 * Uso:
 *   const { limit, offset, order } = parsearPaginacion(req.query, ["nombre", "created_at"]);
 *   const { rows, count } = await Producto.findAndCountAll({ limit, offset, order });
 *
 * @param {object} query        - req.query completo
 * @param {string[]} sortables  - columnas que se permiten en ?sort=
 * @returns {{ limit, offset, order }}
 */
const parsearPaginacion = (query, sortables = []) => {
  // Coerción a entero; si no es número válido se usa el default
  let page = parseInt(query.page, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(limit) || limit < 1) limit = LIMIT_DEFAULT;
  // El máximo protege contra peticiones que volcarian toda la tabla
  if (limit > LIMIT_MAX) limit = LIMIT_MAX;

  const offset = (page - 1) * limit;

  // Validación de columna de orden: si no está en la lista blanca se ignora
  const sortCol = sortables.includes(query.sort) ? query.sort : null;
  const sortDir = ORDEN_PERMITIDO.includes((query.order || "").toLowerCase())
    ? query.order.toLowerCase()
    : "asc";

  // Sequelize espera [[columna, dirección]] o [] para usar el orden por defecto
  const order = sortCol ? [[sortCol, sortDir]] : [];

  return { limit, offset, order, page };
};

module.exports = { parsearPaginacion };
