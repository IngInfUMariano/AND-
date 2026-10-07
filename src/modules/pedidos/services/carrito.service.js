"use strict";

const db = require("../../../loaders/models.loader");
const AppError = require("../../../core/utils/AppError");
const existenciaService = require("../../inventario/services/existencia.service");

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

const obtenerCarrito = async (clienteId) => {
  const carrito = await _obtenerOCrearCarritoActivo(clienteId);

  return db.carrito.findByPk(carrito.id, {
    include: [
      {
        model: db.carrito_detalle,
        include: [
          {
            model: db.variante,
            attributes: ["id", "sku"],
            include: [
              { model: db.producto, attributes: ["id", "nombre"] },
              { model: db.precio, attributes: ["tipo", "monto"] }
            ]
          }
        ]
      }
    ]
  });
};

const agregarItem = async (clienteId, datos) => {
  const { variante_id, cantidad } = datos;

  if (!cantidad || cantidad <= 0) {
    throw new AppError("La cantidad debe ser mayor a 0", 400);
  }

  const variante = await db.variante.findByPk(variante_id);
  if (!variante) {
    throw new AppError("La variante de producto especificada no existe", 404);
  }

  const carrito = await _obtenerOCrearCarritoActivo(clienteId);

  let detalle = await db.carrito_detalle.findOne({
    where: { carrito_id: carrito.id, variante_id }
  });

  const cantidadTotal = detalle ? detalle.cantidad + cantidad : cantidad;
  const stockDisponible = await _obtenerStockDisponible(variante_id);
  let advertencia = null;

  if (cantidadTotal > stockDisponible) {
    advertencia = `La cantidad solicitada (${cantidadTotal}) excede la disponibilidad actual en inventario (${stockDisponible}).`;
  }

  if (detalle) {
    await detalle.update({ cantidad: cantidadTotal });
  } else {
    detalle = await db.carrito_detalle.create({
      carrito_id: carrito.id,
      variante_id,
      cantidad
    });
  }

  return { detalle, advertencia };
};

const actualizarCantidad = async (clienteId, itemId, cantidad) => {
  const carrito = await _obtenerOCrearCarritoActivo(clienteId);

  const detalle = await db.carrito_detalle.findOne({
    where: { id: itemId, carrito_id: carrito.id }
  });

  if (!detalle) {
    throw new AppError("El ítem especificado no existe en tu carrito activo", 404);
  }

  return detalle.update({ cantidad });
};

const eliminarItem = async (clienteId, itemId) => {
  const carrito = await _obtenerOCrearCarritoActivo(clienteId);

  const detalle = await db.carrito_detalle.findOne({
    where: { id: itemId, carrito_id: carrito.id }
  });

  if (!detalle) {
    throw new AppError("El ítem especificado no existe en tu carrito activo", 404);
  }

  await detalle.destroy();
};

const vaciarCarrito = async (clienteId) => {
  const carrito = await _obtenerOCrearCarritoActivo(clienteId);
  await db.carrito_detalle.destroy({ where: { carrito_id: carrito.id } });
};

// RF-PED-03: Revalidación estricta según estado de aprobación del Cliente y reglas de volumen
const revalidarCarrito = async (clienteId) => {
  const cliente = await db.cliente.findByPk(clienteId);
  if (!cliente) throw new AppError("Cliente no encontrado", 404);

  // Verificación estricta: Solo es mayorista activo si tipo === 'MAYORISTA' Y estado === 'APROBADO'
  const esMayoristaAprobado = cliente.tipo === "MAYORISTA" && cliente.estado === "APROBADO";
  const tipoClienteEfectivo = esMayoristaAprobado ? "MAYORISTA" : "MINORISTA";

  const carrito = await obtenerCarrito(clienteId);

  if (!carrito || !carrito.carrito_detalles || carrito.carrito_detalles.length === 0) {
    throw new AppError("El carrito está vacío", 400);
  }

  // Parámetros de la base de datos
  // Parámetros de la base de datos
  const paramMinMay = await db.parametro.findOne({ where: { clave: "MIN_CANTIDAD_MAYORISTA" } });
  const paramMaxSkuMin = await db.parametro.findOne({ where: { clave: "MAX_CANTIDAD_POR_SKU_MINORISTA" } });
  const paramMaxTotMin = await db.parametro.findOne({ where: { clave: "MAX_CANTIDAD_TOTAL_MINORISTA" } });

  const minMayorista = paramMinMay ? parseInt(paramMinMay.valor, 10) : 40;
  const maxPorSkuMinorista = paramMaxSkuMin ? parseInt(paramMaxSkuMin.valor, 10) : 1000; // Fallback ajustado a 1000
  const maxTotalMinorista = paramMaxTotMin ? parseInt(paramMaxTotMin.valor, 10) : 39;
  
  const totalArticulos = carrito.carrito_detalles.reduce((acc, item) => acc + item.cantidad, 0);

  let requiereAjustes = false;
  let mensajeGlobal = null;

  // Validaciones globales por tipo de cliente
  if (tipoClienteEfectivo === "MAYORISTA" && totalArticulos < minMayorista) {
    requiereAjustes = true;
    mensajeGlobal = `Como cliente mayorista debes acumular al menos ${minMayorista} prendas en total en tu pedido (tienes ${totalArticulos}).`;
  } else if (tipoClienteEfectivo === "MINORISTA" && totalArticulos > maxTotalMinorista) {
    requiereAjustes = true;
    mensajeGlobal = `El límite máximo total para compras minoristas es de ${maxTotalMinorista} prendas (llevas ${totalArticulos}). Para volúmenes mayores debes solicitar y tener aprobada una cuenta mayorista.`;
  }

  const reporte = [];

  // Validaciones por renglón
  for (const item of carrito.carrito_detalles) {
    const stockDisponible = await _obtenerStockDisponible(item.variante_id);

    const precioAplicable = item.variante?.precios?.find(p => p.tipo === tipoClienteEfectivo)?.monto 
                         ?? item.variante?.precios?.find(p => p.tipo === "MINORISTA")?.monto ?? 0;

    const linea = {
      item_id: item.id,
      variante_id: item.variante_id,
      sku: item.variante ? item.variante.sku : null,
      nombre_producto: item.variante?.producto?.nombre || "Producto",
      cantidad_solicitada: item.cantidad,
      precio_actual: Number(precioAplicable),
      stock_disponible: stockDisponible,
      estado_linea: "OK",
      mensaje: null
    };

    if (tipoClienteEfectivo === "MINORISTA" && item.cantidad > maxPorSkuMinorista) {
      linea.estado_linea = "EXCEDE_LIMITE_SKU";
      linea.mensaje = `No puedes llevar más de ${maxPorSkuMinorista} unidades del mismo producto (SKU: ${linea.sku}) en compras minoristas.`;
      requiereAjustes = true;
    } else if (stockDisponible === 0) {
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
    tipo_cliente_aplicado: tipoClienteEfectivo,
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