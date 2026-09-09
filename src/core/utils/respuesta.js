// respuesta.js es el único lugar donde se construye el cuerpo JSON de la API.
// Ningún controlador escribe res.json directamente: todos usan estos helpers.
// Así se garantiza que el contrato del API.md se cumpla sin depender de la
// memoria de cada integrante del equipo.

// Uso: ok(res, pedido)
//   → 200 { "data": { ...pedido } }
const ok = (res, data) => res.status(200).json({ data });

// Uso: creado(res, producto)
//   → 201 { "data": { ...producto } }
const creado = (res, data) => res.status(201).json({ data });

// Uso: sinContenido(res)
//   → 204 (sin cuerpo) — para eliminaciones lógicas y acciones sin retorno
const sinContenido = (res) => res.status(204).send();

// Uso: paginado(res, filas, total, 1, 20)
//   → 200 { "data": [...], "meta": { "total": 50, "page": 1, "limit": 20, "pages": 3 } }
const paginado = (res, items, total, page, limit) =>
  res.status(200).json({
    data: items,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });

module.exports = { ok, creado, sinContenido, paginado };
