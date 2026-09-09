// carrito.service.js — toda la lógica de negocio para la gestión del carrito de compras.

"use strict";

const db        = require("../../../loaders/models.loader");
const AppError  = require("../../../core/utils/AppError");

// Helper interno para buscar o crear el carrito activo de un cliente
const _obtenerOCrearCarritoActivo = async (clienteId) => {
  let carrito = await db.carrito.findOne({
    where: { cliente_id: clienteId, activo: true }
  });

  if (!carrito) {
    carrito = await db.carrito.create({
      cliente_id: clienteId,
      activo: true
    });
  }

  return carrito;
};

// ─── obtenerCarrito ──────────────────────────────────────────────────────────
const obtenerCarrito = async (clienteId) => {
  const carrito = await _obtenerOCrearCarritoActivo(clienteId);

  return db.carrito.findByPk(carrito.id, {
    include: [
      {
        model: db.carrito_detalle,
        include: [
          {
            model: db.variante, // <-- Ajustado sin alias "as"
            attributes: ["id", "sku", "precio_venta"],
            include: [
              {
                model: db.producto, // <-- Ajustado sin alias "as"
                attributes: ["id", "nombre"]
              }
            ]
          }
        ]
      }
    ]
  });
};

// ─── agregarItem ─────────────────────────────────────────────────────────────
const agregarItem = async (clienteId, datos) => {
  const { variante_id, cantidad } = datos;

  const variante = await db.variante.findByPk(variante_id);
  if (!variante) {
    throw new AppError("La variante de producto especificada no existe", 404);
  }

  const carrito = await _obtenerOCrearCarritoActivo(clienteId);

  let detalle = await db.carrito_detalle.findOne({
    where: {
      carrito_id: carrito.id,
      variante_id
    }
  });

  if (detalle) {
    const nuevaCantidad = detalle.cantidad + cantidad;
    await detalle.update({ cantidad: nuevaCantidad });
  } else {
    detalle = await db.carrito_detalle.create({
      carrito_id: carrito.id,
      variante_id,
      cantidad
    });
  }

  return detalle;
};

// ─── actualizarCantidad ──────────────────────────────────────────────────────
const actualizarCantidad = async (clienteId, itemId, cantidad) => {
  const carrito = await _obtenerOCrearCarritoActivo(clienteId);

  const detalle = await db.carrito_detalle.findOne({
    where: {
      id: itemId,
      carrito_id: carrito.id
    }
  });

  if (!detalle) {
    throw new AppError("El ítem especificado no existe en tu carrito activo", 404);
  }

  return detalle.update({ cantidad });
};

// ─── eliminarItem ────────────────────────────────────────────────────────────
const eliminarItem = async (clienteId, itemId) => {
  const carrito = await _obtenerOCrearCarritoActivo(clienteId);

  const detalle = await db.carrito_detalle.findOne({
    where: {
      id: itemId,
      carrito_id: carrito.id
    }
  });

  if (!detalle) {
    throw new AppError("El ítem especificado no existe en tu carrito activo", 404);
  }

  await detalle.destroy();
};

// ─── vaciarCarrito ───────────────────────────────────────────────────────────
const vaciarCarrito = async (clienteId) => {
  const carrito = await _obtenerOCrearCarritoActivo(clienteId);

  await db.carrito_detalle.destroy({
    where: { carrito_id: carrito.id }
  });
};

module.exports = {
  obtenerCarrito,
  agregarItem,
  actualizarCantidad,
  eliminarItem,
  vaciarCarrito
};