"use strict";

const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const existenciaService = require("../../inventario/services/existencia.service");

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

// Helper interno para consultar stock disponible (cantidad_fisica - cantidad_comprometida)
const _obtenerStockDisponible = async (varianteId) => {
  const resultado = await existenciaService.listar({ variante_id: varianteId });

  if (!resultado.rows || resultado.rows.length === 0) {
    return 0;
  }

  return resultado.rows.reduce((acc, existencia) => {
    const disponible = (existencia.cantidad_fisica || 0) - (existencia.cantidad_comprometida || 0);
    return acc + (disponible > 0 ? disponible : 0);
  }, 0);
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
            model: db.variante,
            attributes: ["id", "sku", "precio_venta"],
            include: [
              {
                model: db.producto,
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
// RF-PED-01: Advertencia de stock (el mínimo mayorista se evalúa sobre el total global del carrito)
const agregarItem = async (clienteId, datos) => {
  const { variante_id, cantidad } = datos;

  if (!cantidad || cantidad <= 0) {
    throw new AppError("La cantidad debe ser mayor a 0", 400);
  }

  // 1. Validar que exista la variante
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

  const cantidadTotal = detalle ? detalle.cantidad + cantidad : cantidad;

  // 2. Consultar disponibilidad en inventario mediante existencia.service.js
  const stockDisponible = await _obtenerStockDisponible(variante_id);
  let advertencia = null;

  if (cantidadTotal > stockDisponible) {
    advertencia = `La cantidad solicitada (${cantidadTotal}) excede la disponibilidad actual en inventario (${stockDisponible}).`;
  }

  // 3. Crear o actualizar ítem
  if (detalle) {
    await detalle.update({ cantidad: cantidadTotal });
  } else {
    detalle = await db.carrito_detalle.create({
      carrito_id: carrito.id,
      variante_id,
      cantidad
    });
  }

  return {
    detalle,
    advertencia
  };
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

// ─── revalidarCarrito ────────────────────────────────────────────────────────
// RF-PED-03: Revalidación de stock por línea y mínimo total mayorista
const revalidarCarrito = async (clienteId, tipoCliente = "MINORISTA") => {
  const carrito = await obtenerCarrito(clienteId);

  if (!carrito || !carrito.carrito_detalles || carrito.carrito_detalles.length === 0) {
    throw new AppError("El carrito está vacío", 400);
  }

  const reporte = [];
  let requiereAjustes = false;
  let mensajeGlobal = null;

  // 1. Calcular total acumulado de unidades en el carrito
  const totalArticulos = carrito.carrito_detalles.reduce((acc, item) => acc + item.cantidad, 0);

  // 2. Validar mínimo mayorista sobre el TOTAL de unidades
  if (tipoCliente === "MAYORISTA") {
    const paramMinimo = await db.parametro.findOne({ where: { clave: "MIN_CANTIDAD_MAYORISTA" } });
    const minimoRequerido = paramMinimo ? parseInt(paramMinimo.valor, 10) : 80;

    if (totalArticulos < minimoRequerido) {
      requiereAjustes = true;
      mensajeGlobal = `Para compras mayoristas, debes acumular al menos ${minimoRequerido} unidades en total en tu pedido (tienes ${totalArticulos}).`;
    }
  }

  // 3. Validar stock línea por línea
  for (const item of carrito.carrito_detalles) {
    const stockDisponible = await _obtenerStockDisponible(item.variante_id);

    const linea = {
      item_id: item.id,
      variante_id: item.variante_id,
      sku: item.variante ? item.variante.sku : null,
      cantidad_solicitada: item.cantidad,
      precio_actual: item.variante ? item.variante.precio_venta : 0,
      stock_disponible: stockDisponible,
      estado_linea: "OK",
      mensaje: null
    };

    if (stockDisponible === 0) {
      linea.estado_linea = "SIN_STOCK";
      linea.mensaje = "Producto agotado. Debe eliminarse para continuar.";
      requiereAjustes = true;
    } else if (item.cantidad > stockDisponible) {
      linea.estado_linea = "EXCEDE_STOCK";
      linea.mensaje = `La cantidad excede el stock disponible (${stockDisponible}). Debe reajustarse.`;
      requiereAjustes = true;
    }

    reporte.push(linea);
  }

  return {
    listo_para_checkout: !requiereAjustes,
    total_articulos: totalArticulos,
    mensaje_global: mensajeGlobal,
    lineas: reporte
  };
};

module.exports = {
  obtenerCarrito,
  agregarItem,
  actualizarCantidad,
  eliminarItem,
  vaciarCarrito,
  revalidarCarrito
};