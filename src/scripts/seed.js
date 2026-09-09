"use strict";

/**
 * Seed de datos de prueba — INVENTA
 * Valida el modelo de datos de punta a punta antes de distribuir trabajo al equipo.
 *
 * Uso: npm run seed
 */

const bcrypt = require("bcryptjs");
const db = require("../loaders/models.loader");

// ── utilidades ────────────────────────────────────────────────────────────────
const hoy = () => new Date().toISOString().slice(0, 10);
const ahora = () => new Date();

async function limpiar(t) {
  // CASCADE elimina dependencias en el orden correcto sin importar el listado.
  // Se usan los nombres reales de tablas que genera Sequelize (pluralizados por inflection).
  await db.sequelize.query(
    `TRUNCATE
       credito_movimientos, transaccion_pagos,
       comprobante_detalles, comprobantes,
       pedido_historials, pedido_detalles, pedidos,
       carrito_detalles, carritos,
       traslado_detalles, traslados,
       movimiento_inventarios, existencia, correlativos,
       proveedor_productos, precios, imagen_productos,
       variantes, productos,
       direccion_clientes, bitacoras, usuarios,
       clientes, empleados, proveedors,
       zona_envios, temporadas, tallas, colors, marcas,
       categoria, sucursals, parametros
     RESTART IDENTITY CASCADE`,
    { transaction: t }
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SEED PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════
async function seed() {
  console.log("Iniciando seed…\n");
  await db.sequelize.authenticate();
  await db.sequelize.sync({ force: false });
  console.log("✓ Tablas sincronizadas");

  const t = await db.sequelize.transaction();
  try {

    // ── 0. Limpiar ────────────────────────────────────────────────────────────
    await limpiar(t);
    console.log("✓ Tablas vaciadas");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 1 — Infraestructura base
    // ════════════════════════════════════════════════════════════════════════

    const [sucCentral, sucTienda] = await db.sucursal.bulkCreate([
      {
        codigo: "CENT",
        nombre: "Bodega Central",
        direccion: "Zona 12, Ciudad de Guatemala",
        telefono: "24100000",
        es_bodega_central: true,
        vende_en_linea: false,
      },
      {
        codigo: "T001",
        nombre: "Tienda Zona 1",
        direccion: "6a Avenida, Zona 1, Guatemala",
        telefono: "24100001",
        es_bodega_central: false,
        vende_en_linea: true,
      },
    ], { transaction: t });

    const [zonaMetro] = await db.zona_envio.bulkCreate([
      { nombre: "Metropolitana", costo: 25.00, dias_estimados: 2 },
    ], { transaction: t });

    await db.parametro.bulkCreate([
      { clave: "IVA_PORCENTAJE",  valor: "12",  tipo_dato: "NUMERO",   descripcion: "IVA aplicado a ventas locales" },
      { clave: "MONEDA_DEFAULT",  valor: "GTQ", tipo_dato: "TEXTO",    descripcion: "Moneda base del sistema" },
      { clave: "LIMITE_PAGINA",   valor: "20",  tipo_dato: "NUMERO",   descripcion: "Registros por página por defecto" },
    ], { transaction: t });

    await db.correlativo.bulkCreate([
      { sucursal_id: sucCentral.id, tipo_documento: "ENTRADA",  serie: "E",  ultimo_numero: 1 },
      { sucursal_id: sucCentral.id, tipo_documento: "SALIDA",   serie: "S",  ultimo_numero: 0 },
      { sucursal_id: sucCentral.id, tipo_documento: "TRASLADO", serie: "TR", ultimo_numero: 1 },
      { sucursal_id: sucTienda.id,  tipo_documento: "ENTRADA",  serie: "E",  ultimo_numero: 0 },
      { sucursal_id: sucTienda.id,  tipo_documento: "SALIDA",   serie: "S",  ultimo_numero: 1 },
      { sucursal_id: sucTienda.id,  tipo_documento: "TRASLADO", serie: "TR", ultimo_numero: 0 },
    ], { transaction: t });

    console.log("✓ Infraestructura base (sucursales, zona_envio, parámetros, correlativos)");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 2 — Catálogo base
    // ════════════════════════════════════════════════════════════════════════

    const [marcaAdidas] = await db.marca.bulkCreate([
      { nombre: "Adidas", descripcion: "Indumentaria deportiva de alto desempeño" },
    ], { transaction: t });

    const [temp2026] = await db.temporada.bulkCreate([
      { nombre: "Verano", anio: 2026, descripcion: "Colección Verano 2026" },
    ], { transaction: t });

    const [tallaSm, tallaMd, tallaXl] = await db.talla.bulkCreate([
      { codigo: "S",  descripcion: "Small",       orden: 1 },
      { codigo: "M",  descripcion: "Medium",      orden: 2 },
      { codigo: "XL", descripcion: "Extra Large", orden: 4 },
    ], { transaction: t });

    const [colorNegro, colorBlanco] = await db.color.bulkCreate([
      { nombre: "Negro",  hex: "#000000" },
      { nombre: "Blanco", hex: "#FFFFFF" },
    ], { transaction: t });

    // Categorías: padre → subcategoría
    const [catRopa] = await db.categoria.bulkCreate([
      { nombre: "Ropa", descripcion: "Artículos de vestir" },
    ], { transaction: t });

    const [catDeportiva] = await db.categoria.bulkCreate([
      { nombre: "Ropa Deportiva", descripcion: "Ropa para actividad física", categoria_padre_id: catRopa.id },
    ], { transaction: t });

    console.log("✓ Catálogo base (marca, temporada, tallas, colores, categorías)");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 3 — Terceros (empleados, proveedor, clientes)
    // ════════════════════════════════════════════════════════════════════════

    const [empAdmin, empBodega] = await db.empleado.bulkCreate([
      {
        codigo: "EMP-001",
        nombres: "Carlos Alberto",
        apellidos: "Ramírez López",
        dpi: "1234567890101",
        puesto: "Administrador General",
        sucursal_id: sucCentral.id,
        fecha_ingreso: "2020-01-15",
        email: "carlos.ramirez@inventa.gt",
        telefono: "55001100",
      },
      {
        codigo: "EMP-002",
        nombres: "María José",
        apellidos: "Pérez Gómez",
        dpi: "2345678901202",
        puesto: "Jefa de Bodega",
        sucursal_id: sucCentral.id,
        fecha_ingreso: "2021-06-01",
        email: "maria.perez@inventa.gt",
        telefono: "55002200",
      },
    ], { transaction: t });

    const [provTextil] = await db.proveedor.bulkCreate([
      {
        codigo: "PROV-001",
        razon_social: "Textiles del Sur S.A.",
        nombre_comercial: "TextilSur",
        nit: "1234567-8",
        direccion: "Km 12, Carretera al Pacífico",
        contacto_nombre: "Roberto González",
        telefono: "22334455",
        email: "ventas@textilsur.gt",
        condiciones_pago: "30 días neto",
        plazo_entrega_dias: 7,
      },
    ], { transaction: t });

    // Clientes se crean sin aprobado_por (FK circular con usuario)
    const [cliMinorista, cliMayorista] = await db.cliente.bulkCreate([
      {
        codigo: "CLI-001",
        tipo: "MINORISTA",
        nombre: "Ana Lucía Morales",
        email: "ana.morales@gmail.com",
        nit: "5566778-9",
        telefono: "55441122",
        estado: "APROBADO",
        limite_credito: 0,
        terminos_aceptados_en: ahora(),
        version_terminos: "1.0",
      },
      {
        codigo: "CLI-002",
        tipo: "MAYORISTA",
        nombre: "Distribuidora Morales",
        nombre_comercial: "DisMorales",
        email: "compras@dismorales.gt",
        nit: "7788990-1",
        telefono: "22998877",
        estado: "APROBADO",
        limite_credito: 50000.00,
        plazo_credito_dias: 30,
        terminos_aceptados_en: ahora(),
        version_terminos: "1.0",
      },
    ], { transaction: t });

    console.log("✓ Terceros (empleados, proveedor, clientes)");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 4 — Usuarios (circular con clientes; se resuelve en dos pasos)
    // ════════════════════════════════════════════════════════════════════════

    const [hashAdmin, hashBodega, hashCli1, hashCli2] = await Promise.all([
      bcrypt.hash("Admin123!", 10),
      bcrypt.hash("Bodega123!", 10),
      bcrypt.hash("Cliente123!", 10),
      bcrypt.hash("Cliente123!", 10),
    ]);

    const [usrAdmin, usrBodega, usrCli1] = await db.usuario.bulkCreate([
      {
        email: "admin@inventa.gt",
        password_hash: hashAdmin,
        perfil: "ADMIN",
        app: "INTERNO",
        empleado_id: empAdmin.id,
        sucursal_id: sucCentral.id,
        activo: true,
        email_verificado: true,
      },
      {
        email: "bodega@inventa.gt",
        password_hash: hashBodega,
        perfil: "BODEGUERO",
        app: "INTERNO",
        empleado_id: empBodega.id,
        sucursal_id: sucCentral.id,
        activo: true,
        email_verificado: true,
      },
      {
        email: "ana.morales@gmail.com",
        password_hash: hashCli1,
        perfil: "CLIENTE",
        app: "TIENDA",
        cliente_id: cliMinorista.id,
        activo: true,
        email_verificado: true,
      },
    ], { transaction: t });

    const [usrCli2] = await db.usuario.bulkCreate([
      {
        email: "compras@dismorales.gt",
        password_hash: hashCli2,
        perfil: "CLIENTE",
        app: "TIENDA",
        cliente_id: cliMayorista.id,
        activo: true,
        email_verificado: true,
      },
    ], { transaction: t });

    // Resolver el círculo: ahora que los usuarios existen, se asigna aprobado_por
    await db.cliente.update(
      { aprobado_por: usrAdmin.id, fecha_aprobacion: ahora() },
      { where: { id: [cliMinorista.id, cliMayorista.id] }, transaction: t }
    );

    await db.direccion_cliente.create({
      cliente_id: cliMinorista.id,
      alias: "Casa",
      destinatario: "Ana Lucía Morales",
      direccion: "5a Calle 3-40 Zona 10",
      municipio: "Guatemala",
      departamento: "Guatemala",
      telefono: "55441122",
      zona_envio_id: zonaMetro.id,
      es_predeterminada: true,
    }, { transaction: t });

    console.log("✓ Usuarios + dirección cliente (círculo usuario↔cliente resuelto)");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 5 — Catálogo de productos
    // ════════════════════════════════════════════════════════════════════════

    const [prodCamiseta, prodPantalon] = await db.producto.bulkCreate([
      {
        codigo: "PROD-001",
        nombre: "Camiseta Deportiva Climalite",
        descripcion: "Camiseta de alto desempeño, tela transpirable",
        categoria_id: catDeportiva.id,
        marca_id: marcaAdidas.id,
        temporada_id: temp2026.id,
        genero: "UNISEX",
      },
      {
        codigo: "PROD-002",
        nombre: "Pantalón Cargo Táctico",
        descripcion: "Pantalón multibolsillos de alta resistencia",
        categoria_id: catDeportiva.id,
        marca_id: marcaAdidas.id,
        temporada_id: temp2026.id,
        genero: "HOMBRE",
      },
    ], { transaction: t });

    // Camiseta: S/Negro, M/Blanco — Pantalón: M/Negro, XL/Negro
    const [varCamSN, varCamMB, varPanMN, varPanXLN] = await db.variante.bulkCreate([
      { sku: "CAM-S-NGR",  producto_id: prodCamiseta.id, talla_id: tallaSm.id, color_id: colorNegro.id,  codigo_barras: "7500000000001" },
      { sku: "CAM-M-BLC",  producto_id: prodCamiseta.id, talla_id: tallaMd.id, color_id: colorBlanco.id, codigo_barras: "7500000000002" },
      { sku: "PAN-M-NGR",  producto_id: prodPantalon.id, talla_id: tallaMd.id, color_id: colorNegro.id,  codigo_barras: "7500000000003" },
      { sku: "PAN-XL-NGR", producto_id: prodPantalon.id, talla_id: tallaXl.id, color_id: colorNegro.id,  codigo_barras: "7500000000004" },
    ], { transaction: t });

    const variantes = [varCamSN, varCamMB, varPanMN, varPanXLN];
    // [costo, minorista, mayorista] por variante
    const tablaPrecios = [
      [45.00, 125.00,  95.00],
      [45.00, 125.00,  95.00],
      [80.00, 199.00, 155.00],
      [80.00, 199.00, 155.00],
    ];
    const preciosRows = [];
    for (let i = 0; i < variantes.length; i++) {
      const [costo, min, may] = tablaPrecios[i];
      preciosRows.push(
        { variante_id: variantes[i].id, tipo: "COSTO",     monto: costo, vigente_desde: hoy(), registrado_por: usrAdmin.id },
        { variante_id: variantes[i].id, tipo: "MINORISTA", monto: min,   vigente_desde: hoy(), registrado_por: usrAdmin.id },
        { variante_id: variantes[i].id, tipo: "MAYORISTA", monto: may,   vigente_desde: hoy(), registrado_por: usrAdmin.id }
      );
    }
    await db.precio.bulkCreate(preciosRows, { transaction: t });

    await db.proveedor_producto.bulkCreate([
      { proveedor_id: provTextil.id, producto_id: prodCamiseta.id, costo_compra: 42.00, es_principal: true },
      { proveedor_id: provTextil.id, producto_id: prodPantalon.id, costo_compra: 78.00, es_principal: true },
    ], { transaction: t });

    console.log("✓ Catálogo de productos (productos, variantes, precios, proveedor-producto)");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 6 — Inventario
    // ════════════════════════════════════════════════════════════════════════

    // Inicializar existencias en 0 para todas las combinaciones variante × sucursal
    const sucursales = [sucCentral, sucTienda];
    const existenciasRows = [];
    for (const v of variantes) {
      for (const s of sucursales) {
        existenciasRows.push({ variante_id: v.id, sucursal_id: s.id });
      }
    }
    await db.existencia.bulkCreate(existenciasRows, { transaction: t });

    // ── Comprobante de compra (ENTRADA_COMPRA en bodega central) ─────────────
    const entradasCompra = [
      { v: varCamSN,  qty: 50, costo: 45.00 },
      { v: varCamMB,  qty: 50, costo: 45.00 },
      { v: varPanMN,  qty: 30, costo: 80.00 },
      { v: varPanXLN, qty: 30, costo: 80.00 },
    ];
    const totalCompra = entradasCompra.reduce((acc, e) => acc + e.qty * e.costo, 0);

    const compEntrada = await db.comprobante.create({
      numero: "CENT-E-0001",
      tipo: "ENTRADA",
      subtipo: "COMPRA",
      sucursal_id: sucCentral.id,
      proveedor_id: provTextil.id,
      total: totalCompra,
      usuario_id: usrAdmin.id,
      fecha: ahora(),
      documento_externo: "FAC-12345",
    }, { transaction: t });

    await db.comprobante_detalle.bulkCreate(
      entradasCompra.map((e) => ({
        comprobante_id: compEntrada.id,
        variante_id: e.v.id,
        sku: e.v.sku,
        descripcion: `${e.v.sku} — compra proveedor`,
        cantidad: e.qty,
        costo_unitario: e.costo,
        subtotal: e.qty * e.costo,
      })),
      { transaction: t }
    );

    // Actualizar existencias y registrar movimientos de entrada
    const movsEntrada = [];
    for (const e of entradasCompra) {
      await db.existencia.update(
        { cantidad_fisica: e.qty, costo_promedio: e.costo },
        { where: { variante_id: e.v.id, sucursal_id: sucCentral.id }, transaction: t }
      );
      movsEntrada.push({
        variante_id: e.v.id,
        sucursal_id: sucCentral.id,
        tipo: "ENTRADA_COMPRA",
        cantidad: e.qty,
        costo_unitario: e.costo,
        saldo_anterior: 0,
        saldo_resultante: e.qty,
        referencia_tipo: "comprobante",
        referencia_id: compEntrada.id,
        comprobante_id: compEntrada.id,
        usuario_id: usrAdmin.id,
        fecha: ahora(),
      });
    }
    await db.movimiento_inventario.bulkCreate(movsEntrada, { transaction: t });

    // ── Traslado (bodega central → tienda) ────────────────────────────────────
    const itemsTraslado = [
      { v: varCamSN,  qty: 20, costoU: 45.00, saldoCent: 50 },
      { v: varCamMB,  qty: 20, costoU: 45.00, saldoCent: 50 },
      { v: varPanMN,  qty: 15, costoU: 80.00, saldoCent: 30 },
      { v: varPanXLN, qty: 15, costoU: 80.00, saldoCent: 30 },
    ];

    const traslado = await db.traslado.create({
      numero: "TR-CENT-T001-001",
      sucursal_origen_id: sucCentral.id,
      sucursal_destino_id: sucTienda.id,
      estado: "RECIBIDO",
      fecha_despacho: ahora(),
      fecha_recepcion: ahora(),
      despachado_por: usrAdmin.id,
      recibido_por: usrBodega.id,
      observaciones: "Traslado inicial de apertura de tienda",
    }, { transaction: t });

    await db.traslado_detalle.bulkCreate(
      itemsTraslado.map((it) => ({
        traslado_id: traslado.id,
        variante_id: it.v.id,
        cantidad_despachada: it.qty,
        cantidad_recibida: it.qty,
      })),
      { transaction: t }
    );

    const movsTraslado = [];
    for (const it of itemsTraslado) {
      await db.existencia.update(
        { cantidad_fisica: it.saldoCent - it.qty },
        { where: { variante_id: it.v.id, sucursal_id: sucCentral.id }, transaction: t }
      );
      await db.existencia.update(
        { cantidad_fisica: it.qty, costo_promedio: it.costoU },
        { where: { variante_id: it.v.id, sucursal_id: sucTienda.id }, transaction: t }
      );
      movsTraslado.push(
        {
          variante_id: it.v.id,
          sucursal_id: sucCentral.id,
          tipo: "SALIDA_TRASLADO",
          cantidad: it.qty,
          costo_unitario: it.costoU,
          saldo_anterior: it.saldoCent,
          saldo_resultante: it.saldoCent - it.qty,
          referencia_tipo: "traslado",
          referencia_id: traslado.id,
          usuario_id: usrAdmin.id,
          fecha: ahora(),
        },
        {
          variante_id: it.v.id,
          sucursal_id: sucTienda.id,
          tipo: "ENTRADA_TRASLADO",
          cantidad: it.qty,
          costo_unitario: it.costoU,
          saldo_anterior: 0,
          saldo_resultante: it.qty,
          referencia_tipo: "traslado",
          referencia_id: traslado.id,
          usuario_id: usrBodega.id,
          fecha: ahora(),
        }
      );
    }
    await db.movimiento_inventario.bulkCreate(movsTraslado, { transaction: t });

    console.log("✓ Inventario (existencias, comprobante compra, traslado, movimientos)");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 7 — Pedidos y pagos
    // ════════════════════════════════════════════════════════════════════════

    // ── Pedido 1: minorista, TIENDA, EN_LINEA, 2× CAM-S-NGR ─────────────────
    const pedido1 = await db.pedido.create({
      numero: "PED-2026-0001",
      cliente_id: cliMinorista.id,
      tipo_cliente: "MINORISTA",
      sucursal_id: sucTienda.id,
      canal: "TIENDA",
      estado: "ENTREGADO",
      forma_pago: "EN_LINEA",
      subtotal: 250.00,
      costo_envio: 25.00,
      total: 275.00,
      entrega_tipo: "ENVIO",
      entrega_destinatario: "Ana Lucía Morales",
      entrega_direccion: "5a Calle 3-40 Zona 10",
      entrega_municipio: "Guatemala",
      entrega_departamento: "Guatemala",
      entrega_telefono: "55441122",
      registrado_por: usrCli1.id,
    }, { transaction: t });

    await db.pedido_detalle.create({
      pedido_id: pedido1.id,
      variante_id: varCamSN.id,
      sku: "CAM-S-NGR",
      descripcion: "Camiseta Deportiva Climalite — S / Negro",
      cantidad: 2,
      cantidad_despachada: 2,
      precio_unitario: 125.00,
      subtotal: 250.00,
    }, { transaction: t });

    await db.pedido_historial.bulkCreate([
      { pedido_id: pedido1.id, estado_anterior: null,             estado_nuevo: "REGISTRADO",     usuario_id: usrCli1.id,   fecha: ahora() },
      { pedido_id: pedido1.id, estado_anterior: "REGISTRADO",     estado_nuevo: "PENDIENTE_PAGO", usuario_id: usrCli1.id,   fecha: ahora() },
      { pedido_id: pedido1.id, estado_anterior: "PENDIENTE_PAGO", estado_nuevo: "PAGADO",         usuario_id: null,         motivo: "Webhook Stripe confirmado", fecha: ahora() },
      { pedido_id: pedido1.id, estado_anterior: "PAGADO",         estado_nuevo: "EN_PREPARACION", usuario_id: usrAdmin.id,  fecha: ahora() },
      { pedido_id: pedido1.id, estado_anterior: "EN_PREPARACION", estado_nuevo: "DESPACHADO",     usuario_id: usrBodega.id, fecha: ahora() },
      { pedido_id: pedido1.id, estado_anterior: "DESPACHADO",     estado_nuevo: "ENTREGADO",      usuario_id: null,         motivo: "Confirmación de entrega", fecha: ahora() },
    ], { transaction: t });

    // Comprobante de venta (SALIDA / VENTA)
    const compVenta = await db.comprobante.create({
      numero: "T001-S-0001",
      tipo: "SALIDA",
      subtipo: "VENTA",
      sucursal_id: sucTienda.id,
      cliente_id: cliMinorista.id,
      pedido_id: pedido1.id,
      total: 275.00,
      usuario_id: usrAdmin.id,
      fecha: ahora(),
    }, { transaction: t });

    await db.comprobante_detalle.create({
      comprobante_id: compVenta.id,
      variante_id: varCamSN.id,
      sku: "CAM-S-NGR",
      descripcion: "Camiseta Deportiva Climalite — S / Negro",
      cantidad: 2,
      costo_unitario: 45.00,
      subtotal: 90.00,
    }, { transaction: t });

    // SALIDA_VENTA: 2 × CAM-S-NGR en tienda (saldo previo = 20 del traslado)
    const saldoPrevCamSNTienda = 20;
    await db.existencia.update(
      { cantidad_fisica: saldoPrevCamSNTienda - 2 },
      { where: { variante_id: varCamSN.id, sucursal_id: sucTienda.id }, transaction: t }
    );
    await db.movimiento_inventario.create({
      variante_id: varCamSN.id,
      sucursal_id: sucTienda.id,
      tipo: "SALIDA_VENTA",
      cantidad: 2,
      costo_unitario: 45.00,
      saldo_anterior: saldoPrevCamSNTienda,
      saldo_resultante: saldoPrevCamSNTienda - 2,
      referencia_tipo: "pedido",
      referencia_id: pedido1.id,
      comprobante_id: compVenta.id,
      usuario_id: usrAdmin.id,
      fecha: ahora(),
    }, { transaction: t });

    // ── Transacción Stripe + reembolso parcial (autorreferencia) ─────────────
    const txPago = await db.transaccion_pago.create({
      pedido_id: pedido1.id,
      proveedor: "STRIPE",
      id_externo: "pi_3PsKXrGtest001",
      tipo: "PAGO",
      monto: 275.00,
      moneda: "GTQ",
      estado: "EXITOSA",
      mensaje_proveedor: "Payment succeeded",
      fecha: ahora(),
    }, { transaction: t });

    await db.transaccion_pago.create({
      pedido_id: pedido1.id,
      proveedor: "STRIPE",
      id_externo: "re_3PsKXrGtest001",
      tipo: "REEMBOLSO",
      transaccion_origen_id: txPago.id,
      monto: 125.00,
      moneda: "GTQ",
      estado: "EXITOSA",
      mensaje_proveedor: "Partial refund issued",
      motivo: "Devolución de 1 unidad por talla incorrecta",
      fecha: ahora(),
    }, { transaction: t });

    // ── Pedido 2: mayorista, INTERNO, CREDITO, 10× PAN-M-NGR ─────────────────
    const pedido2 = await db.pedido.create({
      numero: "PED-2026-0002",
      cliente_id: cliMayorista.id,
      tipo_cliente: "MAYORISTA",
      sucursal_id: sucTienda.id,
      canal: "INTERNO",
      es_lote: true,
      estado: "PAGADO",
      forma_pago: "CREDITO",
      subtotal: 1550.00,
      costo_envio: 0,
      total: 1550.00,
      entrega_tipo: "RETIRO_SUCURSAL",
      entrega_destinatario: "Distribuidora Morales",
      registrado_por: usrAdmin.id,
    }, { transaction: t });

    await db.pedido_detalle.create({
      pedido_id: pedido2.id,
      variante_id: varPanMN.id,
      sku: "PAN-M-NGR",
      descripcion: "Pantalón Cargo Táctico — M / Negro",
      cantidad: 10,
      cantidad_despachada: 10,
      precio_unitario: 155.00,
      subtotal: 1550.00,
    }, { transaction: t });

    await db.pedido_historial.bulkCreate([
      { pedido_id: pedido2.id, estado_anterior: null,         estado_nuevo: "REGISTRADO", usuario_id: usrAdmin.id, fecha: ahora() },
      { pedido_id: pedido2.id, estado_anterior: "REGISTRADO", estado_nuevo: "PAGADO",     usuario_id: usrAdmin.id, motivo: "Crédito mayorista autorizado", fecha: ahora() },
    ], { transaction: t });

    // Crédito movimiento: CARGO inicial, luego ABONO parcial
    await db.credito_movimiento.bulkCreate([
      {
        cliente_id: cliMayorista.id,
        tipo: "CARGO",
        pedido_id: pedido2.id,
        monto: 1550.00,
        saldo_resultante: 1550.00,
        referencia: `Pedido ${pedido2.numero}`,
        usuario_id: usrAdmin.id,
        fecha: ahora(),
      },
      {
        cliente_id: cliMayorista.id,
        tipo: "ABONO",
        pedido_id: pedido2.id,
        monto: 500.00,
        saldo_resultante: 1050.00,
        referencia: "Pago parcial — transferencia bancaria",
        usuario_id: usrAdmin.id,
        fecha: ahora(),
      },
    ], { transaction: t });

    await db.cliente.update(
      { credito_utilizado: 1050.00 },
      { where: { id: cliMayorista.id }, transaction: t }
    );

    // ── Carrito activo del cliente minorista ──────────────────────────────────
    const carrito = await db.carrito.create(
      { cliente_id: cliMinorista.id, activo: true },
      { transaction: t }
    );
    await db.carrito_detalle.create(
      { carrito_id: carrito.id, variante_id: varCamMB.id, cantidad: 1 },
      { transaction: t }
    );

    console.log("✓ Pedidos y pagos (2 pedidos, historial, comprobante venta, transacciones, crédito, carrito)");

    await t.commit();
    console.log("\n✓✓ Seed completado. Iniciando validaciones…\n");

  } catch (err) {
    await t.rollback();
    console.error("\n✗ Seed fallido:", err.message);
    if (process.env.NODE_ENV !== "production") console.error(err.stack);
    process.exit(1);
  }

  // validar() corre fuera de la transacción para que sus errores sean visibles
  await validar();
}

// ═════════════════════════════════════════════════════════════════════════════
// VALIDACIONES
// ═════════════════════════════════════════════════════════════════════════════
async function validar() {
  let todoOk = true;

  // ── 1. Conteo de filas ────────────────────────────────────────────────────
  // Movimientos: 4 ENTRADA_COMPRA + 4 SALIDA_TRASLADO + 4 ENTRADA_TRASLADO + 1 SALIDA_VENTA = 13
  // Comprobante_detalle: 4 (compra) + 1 (venta) = 5
  // Pedido_historial: 6 (pedido1) + 2 (pedido2) = 8
  const modelos = [
    ["sucursal",             2],
    ["zona_envio",           1],
    ["parametro",            3],
    ["correlativo",          6],
    ["marca",                1],
    ["temporada",            1],
    ["talla",                3],
    ["color",                2],
    ["categoria",            2],
    ["empleado",             2],
    ["proveedor",            1],
    ["cliente",              2],
    ["usuario",              4],
    ["direccion_cliente",    1],
    ["producto",             2],
    ["variante",             4],
    ["precio",              12],
    ["proveedor_producto",   2],
    ["existencia",           8],
    ["traslado",             1],
    ["traslado_detalle",     4],
    ["comprobante",          2],
    ["comprobante_detalle",  5],
    ["movimiento_inventario",13],
    ["pedido",               2],
    ["pedido_detalle",       2],
    ["pedido_historial",     8],
    ["transaccion_pago",     2],
    ["credito_movimiento",   2],
    ["carrito",              1],
    ["carrito_detalle",      1],
  ];

  console.log("── 1. Conteo de filas ─────────────────────────────────────────────────────");
  for (const [nombre, esperado] of modelos) {
    const real = await db[nombre].count();
    const ok = real === esperado;
    if (!ok) todoOk = false;
    const diff = ok ? "" : `  ← DIFERENCIA (esperado=${esperado})`;
    console.log(`  ${ok ? "✓" : "✗"} ${nombre.padEnd(25)} ${String(real).padStart(3)}${diff}`);
  }

  // ── 2. Verificación kardex ────────────────────────────────────────────────
  // El saldo_resultante del último movimiento debe coincidir con cantidad_fisica
  console.log("\n── 2. Verificación kardex ─────────────────────────────────────────────────");

  const existencias = await db.existencia.findAll({
    include: [
      { model: db.variante, attributes: ["sku"] },
      { model: db.sucursal, attributes: ["codigo"] },
    ],
  });

  for (const ex of existencias) {
    const ultimoMov = await db.movimiento_inventario.findOne({
      where: { variante_id: ex.variante_id, sucursal_id: ex.sucursal_id },
      order: [["fecha", "DESC"], ["id", "DESC"]],
    });

    const sku = ex.variante.sku.padEnd(12);
    const suc = ex.sucursal.codigo.padEnd(5);

    if (!ultimoMov) {
      const ok = ex.cantidad_fisica === 0;
      if (!ok) todoOk = false;
      console.log(`  ${ok ? "✓" : "✗"} ${sku} / ${suc} — sin movimientos, cantidad_fisica=${ex.cantidad_fisica}`);
      continue;
    }

    const ok = ultimoMov.saldo_resultante === ex.cantidad_fisica;
    if (!ok) todoOk = false;
    console.log(
      `  ${ok ? "✓" : "✗"} ${sku} / ${suc}` +
      `  kardex=${String(ultimoMov.saldo_resultante).padStart(3)}` +
      `  existencia=${String(ex.cantidad_fisica).padStart(3)}`
    );
  }

  // ── 3. Traversal directo ──────────────────────────────────────────────────
  // pedido → cliente → pedido_detalle → variante → producto → categoría
  console.log("\n── 3. Traversal: pedido → cliente → detalle → variante → producto → categoría ──");
  const pedidoT = await db.pedido.findOne({
    where: { numero: "PED-2026-0001" },
    include: [
      { model: db.cliente },
      {
        model: db.pedido_detalle,
        include: [
          {
            model: db.variante,
            include: [
              { model: db.producto, include: [{ model: db.categoria }] },
            ],
          },
        ],
      },
    ],
  });

  if (!pedidoT || !pedidoT.pedido_detalles || pedidoT.pedido_detalles.length === 0) {
    console.log("  ✗ Pedido PED-2026-0001 no encontrado con sus detalles");
    todoOk = false;
  } else {
    const det = pedidoT.pedido_detalles[0];
    const prod = det.variante.producto;
    // Con name: { singular: "categoria" }, el accessor es .categoria
    const cat = prod.categoria;
    console.log(`  ✓ Pedido     : ${pedidoT.numero}  (${pedidoT.estado})`);
    console.log(`    Cliente    : ${pedidoT.cliente.nombre}  (${pedidoT.cliente.tipo})`);
    console.log(`    Variante   : ${det.variante.sku}  ×${det.cantidad}  @ Q${det.precio_unitario}`);
    console.log(`    Producto   : ${prod.nombre}  (categoria_id=${prod.categoria_id})`);
    if (cat) {
      console.log(`    Categoría  : ${cat.nombre}  (padre_id: ${cat.categoria_padre_id ?? "—"})`);
    } else {
      console.log(`    Categoría  : ⚠ include retornó null (categoria_id=${prod.categoria_id})`);
      todoOk = false;
    }
  }

  // ── 4. Traversal inverso ──────────────────────────────────────────────────
  // variante → producto → precios vigentes → existencias por sucursal
  console.log("\n── 4. Traversal: variante → producto → precios vigentes → existencias ──");
  const varT = await db.variante.findOne({
    where: { sku: "PAN-M-NGR" },
    include: [
      { model: db.producto },
      { model: db.precio, where: { vigente_hasta: null }, required: false },
      { model: db.existencia, include: [{ model: db.sucursal }] },
    ],
  });

  if (!varT) {
    console.log("  ✗ Variante PAN-M-NGR no encontrada");
    todoOk = false;
  } else {
    console.log(`  ✓ Variante : ${varT.sku}  →  Producto: ${varT.producto.nombre}`);
    console.log("    Precios vigentes:");
    for (const p of varT.precios) {
      console.log(`      ${p.tipo.padEnd(12)} Q${p.monto}`);
    }
    console.log("    Existencias:");
    // Con name: { plural: "existencias" }, el accessor hasMany es .existencias
    for (const ex of varT.existencias) {
      console.log(
        `      ${ex.sucursal.nombre.padEnd(20)}` +
        `  física=${ex.cantidad_fisica}` +
        `  comprometida=${ex.cantidad_comprometida}` +
        `  disponible=${ex.disponible}`
      );
    }
  }

  // ── 5. Autorreferencia: reembolso → pago original ─────────────────────────
  console.log("\n── 5. Autorreferencia transaccion_pago (reembolso → pago original) ──");
  const reembolso = await db.transaccion_pago.findOne({
    where: { tipo: "REEMBOLSO" },
    include: [{ model: db.transaccion_pago, as: "transaccionOrigen" }],
  });

  if (!reembolso || !reembolso.transaccionOrigen) {
    console.log("  ✗ Reembolso sin transaccionOrigen");
    todoOk = false;
  } else {
    console.log(`  ✓ Reembolso ${reembolso.id_externo}  →  Pago original: ${reembolso.transaccionOrigen.id_externo}`);
  }

  // ── 6. Autorreferencia: subcategoría → categoría padre ───────────────────
  console.log("\n── 6. Autorreferencia categoría (subcategoría → padre) ──");
  const catHija = await db.categoria.findOne({
    where: { nombre: "Ropa Deportiva" },
    include: [{ model: db.categoria, as: "categoriaPadre" }],
  });

  if (!catHija || !catHija.categoriaPadre) {
    console.log("  ✗ Subcategoría sin categoriaPadre");
    todoOk = false;
  } else {
    console.log(`  ✓ "${catHija.nombre}"  →  padre: "${catHija.categoriaPadre.nombre}"`);
  }

  // ── 7. Crédito mayorista: CARGO - ABONO == saldo_resultante ──────────────
  console.log("\n── 7. Crédito mayorista (saldo_resultante consistente) ──");
  const cliMay = await db.cliente.findOne({ where: { codigo: "CLI-002" } });
  const movsCred = await db.credito_movimiento.findAll({
    where: { cliente_id: cliMay.id },
    order: [["id", "ASC"]],
  });

  if (movsCred.length !== 2) {
    console.log(`  ✗ Esperados 2 movimientos de crédito, encontrados ${movsCred.length}`);
    todoOk = false;
  } else {
    const cargo = movsCred[0];
    const abono = movsCred[1];
    const calculado = parseFloat(cargo.monto) - parseFloat(abono.monto);
    const registrado = parseFloat(abono.saldo_resultante);
    const ok = Math.abs(calculado - registrado) < 0.01;
    if (!ok) todoOk = false;
    console.log(`  ${ok ? "✓" : "✗"} CARGO Q${cargo.monto}  ABONO Q${abono.monto}  →  saldo calculado=${calculado.toFixed(2)}  registrado=${registrado.toFixed(2)}`);
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(70)}`);
  if (todoOk) {
    console.log("✓✓  Todas las validaciones pasaron. El modelo de datos es correcto.");
  } else {
    console.log("✗   Algunas validaciones fallaron — revisa los mensajes anteriores.");
  }
  console.log("═".repeat(70));

  process.exit(todoOk ? 0 : 1);
}

seed();
