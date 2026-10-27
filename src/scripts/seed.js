"use strict";

/**
 * Seed de datos de prueba — INVENTA
 * Valida el modelo de datos de punta a punta antes de distribuir trabajo al equipo.
 *
 * Uso: npm run seed
 */

require("dotenv").config({
  path: `.env.${process.env.NODE_ENV || "development"}`,
});

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
  await db.sequelize.sync({ alter: true });
  console.log("✓ Tablas sincronizadas");

  const t = await db.sequelize.transaction();
  try {

    // ── 0. Limpiar ────────────────────────────────────────────────────────────
    await limpiar(t);
    console.log("✓ Tablas vaciadas");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 1 — Infraestructura base
    // ════════════════════════════════════════════════════════════════════════

    const [sucCentral, sucTienda, sucTienda2] = await db.sucursal.bulkCreate([
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
      {
        codigo: "T002",
        nombre: "Tienda Quetzaltenango",
        direccion: "4a Calle 15-20, Zona 3, Xela",
        telefono: "77600050",
        es_bodega_central: false,
        vende_en_linea: true,
      },
    ], { transaction: t });

    const [zonaMetro, zonaOccidente, zonaOriente, zonaVerapaces, zonaPeten, zonaSur] = await db.zona_envio.bulkCreate([
      { nombre: "Metropolitana", costo:  0.00, dias_estimados: 1, departamentos: "Guatemala,Sacatepéquez,Chimaltenango" },
      { nombre: "Occidente",     costo: 40.00, dias_estimados: 3, departamentos: "Quetzaltenango,San Marcos,Huehuetenango,Totonicapán,Quiché,Sololá,Retalhuleu" },
      { nombre: "Oriente",       costo: 40.00, dias_estimados: 3, departamentos: "Chiquimula,Zacapa,El Progreso,Jalapa,Jutiapa,Santa Rosa,Izabal" },
      { nombre: "Verapaces",     costo: 50.00, dias_estimados: 4, departamentos: "Alta Verapaz,Baja Verapaz" },
      { nombre: "Petén",         costo: 75.00, dias_estimados: 5, departamentos: "Petén" },
      { nombre: "Sur",           costo: 35.00, dias_estimados: 2, departamentos: "Escuintla,Suchitepéquez" },
    ], { transaction: t });

    await db.parametro.bulkCreate([
      { clave: "IVA_PORCENTAJE",    valor: "12",              tipo_dato: "NUMERO", descripcion: "IVA aplicado a ventas locales" },
      { clave: "MONEDA_DEFAULT",    valor: "GTQ",             tipo_dato: "TEXTO",  descripcion: "Moneda base del sistema" },
      { clave: "LIMITE_PAGINA",     valor: "20",              tipo_dato: "NUMERO", descripcion: "Registros por página por defecto" },
      { clave: "CREDITO_MAX_DIAS",  valor: "60",              tipo_dato: "NUMERO", descripcion: "Plazo máximo de crédito en días" },
      { clave: "EMAIL_SOPORTE",     valor: "soporte@inventa.gt", tipo_dato: "TEXTO", descripcion: "Correo de soporte al cliente" },
      { clave: "EMPRESA_NOMBRE",    valor: "AND& Moda",          tipo_dato: "TEXTO", descripcion: "Razón social de la empresa" },
      { clave: "EMPRESA_NIT",       valor: "1234567-8",          tipo_dato: "TEXTO", descripcion: "NIT fiscal de la empresa" },
      { clave: "EMPRESA_DIRECCION", valor: "Ciudad de Guatemala, Guatemala", tipo_dato: "TEXTO", descripcion: "Dirección fiscal de la empresa" },
    ], { transaction: t });

    await db.correlativo.bulkCreate([
      { sucursal_id: sucCentral.id,  tipo_documento: "ENTRADA",  serie: "E",  ultimo_numero: 1 },
      { sucursal_id: sucCentral.id,  tipo_documento: "SALIDA",   serie: "S",  ultimo_numero: 0 },
      { sucursal_id: sucCentral.id,  tipo_documento: "TRASLADO", serie: "TR", ultimo_numero: 2 },
      { sucursal_id: sucTienda.id,   tipo_documento: "ENTRADA",  serie: "E",  ultimo_numero: 0 },
      { sucursal_id: sucTienda.id,   tipo_documento: "SALIDA",   serie: "S",  ultimo_numero: 2 },
      { sucursal_id: sucTienda.id,   tipo_documento: "TRASLADO", serie: "TR", ultimo_numero: 0 },
      { sucursal_id: sucTienda2.id,  tipo_documento: "ENTRADA",  serie: "E",  ultimo_numero: 0 },
      { sucursal_id: sucTienda2.id,  tipo_documento: "SALIDA",   serie: "S",  ultimo_numero: 1 },
      { sucursal_id: sucTienda2.id,  tipo_documento: "TRASLADO", serie: "TR", ultimo_numero: 0 },
    ], { transaction: t });

    console.log("✓ Infraestructura base (3 sucursales, 3 zonas, 5 parámetros, 9 correlativos)");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 2 — Catálogo base
    // ════════════════════════════════════════════════════════════════════════

    const [marcaAdidas, marcaNike, marcaPuma, marcaUnderArmour] = await db.marca.bulkCreate([
      { nombre: "Adidas",        descripcion: "Indumentaria deportiva de alto desempeño" },
      { nombre: "Nike",          descripcion: "Just Do It — ropa y calzado deportivo" },
      { nombre: "Puma",          descripcion: "Sport lifestyle y moda urbana" },
      { nombre: "Under Armour",  descripcion: "Ropa técnica de rendimiento" },
    ], { transaction: t });

    const [temp2026, tempOtonio] = await db.temporada.bulkCreate([
      { nombre: "Verano",  anio: 2026, descripcion: "Colección Verano 2026" },
      { nombre: "Otoño",   anio: 2025, descripcion: "Colección Otoño 2025" },
    ], { transaction: t });

    const [tallaSm, tallaMd, tallaL, tallaXl, tallaXxl, tallaUnico] = await db.talla.bulkCreate([
      { codigo: "S",      descripcion: "Small",       orden: 1 },
      { codigo: "M",      descripcion: "Medium",      orden: 2 },
      { codigo: "L",      descripcion: "Large",       orden: 3 },
      { codigo: "XL",     descripcion: "Extra Large", orden: 4 },
      { codigo: "XXL",    descripcion: "Double XL",   orden: 5 },
      { codigo: "UNICO",  descripcion: "Talla única", orden: 9 },
    ], { transaction: t });

    const [colorNegro, colorBlanco, colorRojo, colorAzul, colorVerde] = await db.color.bulkCreate([
      { nombre: "Negro",  hex: "#000000" },
      { nombre: "Blanco", hex: "#FFFFFF" },
      { nombre: "Rojo",   hex: "#CC0000" },
      { nombre: "Azul",   hex: "#003399" },
      { nombre: "Verde",  hex: "#006633" },
    ], { transaction: t });

    // Categorías con jerarquía
    const [catRopa, catCalzado, catAccesorios] = await db.categoria.bulkCreate([
      { nombre: "Ropa",       descripcion: "Artículos de vestir" },
      { nombre: "Calzado",    descripcion: "Zapatos y zapatillas" },
      { nombre: "Accesorios", descripcion: "Bolsos, gorras y complementos" },
    ], { transaction: t });

    const [catDeportiva, catCalzadoDep] = await db.categoria.bulkCreate([
      { nombre: "Ropa Deportiva",     descripcion: "Ropa para actividad física", categoria_padre_id: catRopa.id },
      { nombre: "Calzado Deportivo",  descripcion: "Zapatillas para deporte",    categoria_padre_id: catCalzado.id },
    ], { transaction: t });

    console.log("✓ Catálogo base (4 marcas, 2 temporadas, 6 tallas, 5 colores, 5 categorías)");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 3 — Terceros (empleados, proveedores, clientes)
    // ════════════════════════════════════════════════════════════════════════

    const [empAdmin, empBodega, empVend1, empVend2, empSup] = await db.empleado.bulkCreate([
      {
        codigo: "EMP-001", nombres: "Carlos Alberto",  apellidos: "Ramírez López",
        dpi: "1234567890101", puesto: "Administrador General",
        sucursal_id: sucCentral.id, fecha_ingreso: "2020-01-15",
        email: "carlos.ramirez@inventa.gt",  telefono: "55001100",
      },
      {
        codigo: "EMP-002", nombres: "María José",      apellidos: "Pérez Gómez",
        dpi: "2345678901202", puesto: "Jefa de Bodega",
        sucursal_id: sucCentral.id, fecha_ingreso: "2021-06-01",
        email: "maria.perez@inventa.gt",     telefono: "55002200",
      },
      {
        codigo: "EMP-003", nombres: "Luis Fernando",   apellidos: "García Solís",
        dpi: "3456789012303", puesto: "Vendedor",
        sucursal_id: sucTienda.id,  fecha_ingreso: "2022-03-10",
        email: "luis.garcia@inventa.gt",     telefono: "55003300",
      },
      {
        codigo: "EMP-004", nombres: "Sofía Elena",     apellidos: "Martínez Cruz",
        dpi: "4567890123404", puesto: "Vendedora",
        sucursal_id: sucTienda2.id, fecha_ingreso: "2023-07-15",
        email: "sofia.martinez@inventa.gt",  telefono: "55004400",
      },
      {
        codigo: "EMP-005", nombres: "Jorge Antonio",   apellidos: "López Barrios",
        dpi: "5678901234505", puesto: "Supervisor de Tiendas",
        sucursal_id: sucCentral.id, fecha_ingreso: "2019-11-20",
        email: "jorge.lopez@inventa.gt",     telefono: "55005500",
      },
    ], { transaction: t });

    const [provTextil, provDeportes, provAccesorios] = await db.proveedor.bulkCreate([
      {
        codigo: "PROV-001", razon_social: "Textiles del Sur S.A.",
        nombre_comercial: "TextilSur",   nit: "1234567-8",
        direccion: "Km 12, Carretera al Pacífico",
        contacto_nombre: "Roberto González", telefono: "22334455",
        email: "ventas@textilsur.gt",
        condiciones_pago: "30 días neto",    plazo_entrega_dias: 7,
      },
      {
        codigo: "PROV-002", razon_social: "Deportes Americanos S.A.",
        nombre_comercial: "DeporAm",     nit: "2345678-9",
        direccion: "7a Avenida 22-35 Zona 4, Guatemala",
        contacto_nombre: "Andrea Fuentes", telefono: "22998800",
        email: "compras@deporam.gt",
        condiciones_pago: "15 días neto",    plazo_entrega_dias: 5,
      },
      {
        codigo: "PROV-003", razon_social: "Accesorios y Más S.R.L.",
        nombre_comercial: "AccesMás",    nit: "3456789-0",
        direccion: "Zona 10, Ciudad de Guatemala",
        contacto_nombre: "Marco Rivas",    telefono: "24550011",
        email: "ventas@accesmas.gt",
        condiciones_pago: "Contado",         plazo_entrega_dias: 3,
      },
    ], { transaction: t });

    // Clientes se crean sin aprobado_por (FK circular con usuario)
    const [cliMinorista, cliMayorista, cli3, cli4, cli5, cli6] = await db.cliente.bulkCreate([
      {
        codigo: "CLI-001", tipo: "MINORISTA", nombre: "Ana Lucía Morales",
        email: "ana.morales@gmail.com",       nit: "5566778-9",
        telefono: "55441122", estado: "APROBADO",
        limite_credito: 0, terminos_aceptados_en: ahora(), version_terminos: "1.0",
      },
      {
        codigo: "CLI-002", tipo: "MAYORISTA", nombre: "Distribuidora Morales",
        nombre_comercial: "DisMorales",
        email: "compras@dismorales.gt",        nit: "7788990-1",
        telefono: "22998877", estado: "APROBADO",
        limite_credito: 50000.00, plazo_credito_dias: 30,
        terminos_aceptados_en: ahora(), version_terminos: "1.0",
      },
      {
        codigo: "CLI-003", tipo: "MINORISTA", nombre: "Pedro José Hernández",
        email: "pedro.hernandez@gmail.com",    nit: "6677889-2",
        telefono: "55332211", estado: "APROBADO",
        limite_credito: 0, terminos_aceptados_en: ahora(), version_terminos: "1.0",
      },
      {
        codigo: "CLI-004", tipo: "MINORISTA", nombre: "Laura Beatriz Santos",
        email: "laura.santos@gmail.com",       nit: "8899001-3",
        telefono: "55662233", estado: "APROBADO",
        limite_credito: 0, terminos_aceptados_en: ahora(), version_terminos: "1.0",
      },
      {
        codigo: "CLI-005", tipo: "MAYORISTA", nombre: "Importaciones del Norte S.A.",
        nombre_comercial: "ImporNorte",
        email: "pedidos@impornorte.gt",        nit: "9900112-4",
        telefono: "77800099", estado: "APROBADO",
        limite_credito: 80000.00, plazo_credito_dias: 45,
        terminos_aceptados_en: ahora(), version_terminos: "1.0",
      },
      {
        codigo: "CLI-006", tipo: "MINORISTA", nombre: "Roberto Carlos Fuentes",
        email: "roberto.fuentes@hotmail.com",  nit: "1122334-5",
        telefono: "55773344", estado: "PENDIENTE",
        limite_credito: 0,
      },
    ], { transaction: t });

    console.log("✓ Terceros (5 empleados, 3 proveedores, 6 clientes)");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 4 — Usuarios (circular con clientes; se resuelve en dos pasos)
    // ════════════════════════════════════════════════════════════════════════

    const [hAdmin, hBodega, hVend1, hVend2, hCli1, hCli2, hCli3, hCli4] = await Promise.all([
      bcrypt.hash("Admin123!",    10),
      bcrypt.hash("Bodega123!",   10),
      bcrypt.hash("Vendedor123!", 10),
      bcrypt.hash("Vendedor123!", 10),
      bcrypt.hash("Cliente123!",  10),
      bcrypt.hash("Cliente123!",  10),
      bcrypt.hash("Cliente123!",  10),
      bcrypt.hash("Cliente123!",  10),
    ]);

    const [usrAdmin, usrBodega, usrVend1, usrVend2] = await db.usuario.bulkCreate([
      {
        email: "admin@inventa.gt",      password_hash: hAdmin,
        perfil: "ADMIN",    app: "INTERNO",
        empleado_id: empAdmin.id,  sucursal_id: sucCentral.id,
        activo: true, email_verificado: true,
      },
      {
        email: "bodega@inventa.gt",     password_hash: hBodega,
        perfil: "BODEGUERO", app: "INTERNO",
        empleado_id: empBodega.id, sucursal_id: sucCentral.id,
        activo: true, email_verificado: true,
      },
      {
        email: "vendedor1@inventa.gt",  password_hash: hVend1,
        perfil: "VENDEDOR",  app: "INTERNO",
        empleado_id: empVend1.id,  sucursal_id: sucTienda.id,
        activo: true, email_verificado: true,
      },
      {
        email: "vendedor2@inventa.gt",  password_hash: hVend2,
        perfil: "VENDEDOR",  app: "INTERNO",
        empleado_id: empVend2.id,  sucursal_id: sucTienda2.id,
        activo: true, email_verificado: true,
      },
    ], { transaction: t });

    const [usrCli1, usrCli2, usrCli3, usrCli4] = await db.usuario.bulkCreate([
      {
        email: "ana.morales@gmail.com",      password_hash: hCli1,
        perfil: "CLIENTE", app: "TIENDA",
        cliente_id: cliMinorista.id, activo: true, email_verificado: true,
      },
      {
        email: "compras@dismorales.gt",      password_hash: hCli2,
        perfil: "CLIENTE", app: "TIENDA",
        cliente_id: cliMayorista.id, activo: true, email_verificado: true,
      },
      {
        email: "pedro.hernandez@gmail.com",  password_hash: hCli3,
        perfil: "CLIENTE", app: "TIENDA",
        cliente_id: cli3.id, activo: true, email_verificado: true,
      },
      {
        email: "laura.santos@gmail.com",     password_hash: hCli4,
        perfil: "CLIENTE", app: "TIENDA",
        cliente_id: cli4.id, activo: true, email_verificado: true,
      },
    ], { transaction: t });

    // Resolver el círculo: aprobado_por para todos los clientes APROBADO
    await db.cliente.update(
      { aprobado_por: usrAdmin.id, fecha_aprobacion: ahora() },
      { where: { id: [cliMinorista.id, cliMayorista.id, cli3.id, cli4.id, cli5.id] }, transaction: t }
    );

    await db.direccion_cliente.bulkCreate([
      {
        cliente_id: cliMinorista.id, alias: "Casa",
        destinatario: "Ana Lucía Morales",
        direccion: "5a Calle 3-40 Zona 10",
        municipio: "Guatemala",   departamento: "Guatemala",
        telefono: "55441122", zona_envio_id: zonaMetro.id, es_predeterminada: true,
      },
      {
        cliente_id: cliMayorista.id, alias: "Bodega",
        destinatario: "Distribuidora Morales",
        direccion: "23 Calle 7-55 Zona 5",
        municipio: "Guatemala",   departamento: "Guatemala",
        telefono: "22998877", zona_envio_id: zonaMetro.id, es_predeterminada: true,
      },
      {
        cliente_id: cli3.id, alias: "Casa",
        destinatario: "Pedro José Hernández",
        direccion: "10a Calle 5-30 Zona 3, Xela",
        municipio: "Quetzaltenango", departamento: "Quetzaltenango",
        telefono: "55332211", zona_envio_id: zonaOccidente.id, es_predeterminada: true,
      },
      {
        cliente_id: cli4.id, alias: "Casa",
        destinatario: "Laura Beatriz Santos",
        direccion: "Residenciales Las Palmas, Lote 14",
        municipio: "Mixco",       departamento: "Guatemala",
        telefono: "55662233", zona_envio_id: zonaMetro.id, es_predeterminada: true,
      },
      {
        cliente_id: cli4.id, alias: "Oficina",
        destinatario: "Laura Santos — Dpto. Compras",
        direccion: "Edificio Plaza 10, 4o nivel, Zona 10",
        municipio: "Guatemala",   departamento: "Guatemala",
        telefono: "24660099", zona_envio_id: zonaMetro.id, es_predeterminada: false,
      },
      {
        cliente_id: cli5.id, alias: "Bodega Norte",
        destinatario: "Importaciones del Norte S.A.",
        direccion: "Calzada Roosevelt 15-80 Zona 7",
        municipio: "Guatemala",   departamento: "Guatemala",
        telefono: "77800099", zona_envio_id: zonaMetro.id, es_predeterminada: true,
      },
    ], { transaction: t });

    console.log("✓ Usuarios + direcciones (8 usuarios, círculo cliente↔usuario resuelto, 6 direcciones)");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 5 — Catálogo de productos
    // ════════════════════════════════════════════════════════════════════════

    const [prodCamiseta, prodPantalon, prodShort, prodSudadera, prodPolo, prodBolso] =
      await db.producto.bulkCreate([
        {
          codigo: "PROD-001", nombre: "Camiseta Deportiva Climalite",
          descripcion: "Camiseta de alto desempeño, tela transpirable",
          categoria_id: catDeportiva.id, marca_id: marcaAdidas.id,
          temporada_id: temp2026.id, genero: "UNISEX",
        },
        {
          codigo: "PROD-002", nombre: "Pantalón Cargo Táctico",
          descripcion: "Pantalón multibolsillos de alta resistencia",
          categoria_id: catDeportiva.id, marca_id: marcaAdidas.id,
          temporada_id: temp2026.id, genero: "HOMBRE",
        },
        {
          codigo: "PROD-003", nombre: "Short Running Dri-Fit",
          descripcion: "Short ligero con tecnología de secado rápido",
          categoria_id: catDeportiva.id, marca_id: marcaNike.id,
          temporada_id: temp2026.id, genero: "UNISEX",
        },
        {
          codigo: "PROD-004", nombre: "Sudadera Hoodie Classic",
          descripcion: "Sudadera con capucha de algodón fleece",
          categoria_id: catRopa.id, marca_id: marcaPuma.id,
          temporada_id: tempOtonio.id, genero: "UNISEX",
        },
        {
          codigo: "PROD-005", nombre: "Polo Performance HeatGear",
          descripcion: "Polo técnico de alto rendimiento con tejido elástico",
          categoria_id: catDeportiva.id, marca_id: marcaUnderArmour.id,
          temporada_id: temp2026.id, genero: "HOMBRE",
        },
        {
          codigo: "PROD-006", nombre: "Bolso Deportivo Stadium",
          descripcion: "Bolso de lona resistente con múltiples compartimentos",
          categoria_id: catAccesorios.id, marca_id: marcaAdidas.id,
          temporada_id: temp2026.id, genero: "UNISEX",
        },
      ], { transaction: t });

    // ── Variantes (17 en total) ───────────────────────────────────────────────
    // PROD-001 Camiseta: S/Negro, M/Blanco, L/Rojo
    // PROD-002 Pantalón: M/Negro, XL/Negro, L/Azul
    // PROD-003 Short:    S/Negro, M/Azul,   L/Rojo
    // PROD-004 Sudadera: M/Negro, L/Blanco, XL/Verde
    // PROD-005 Polo:     S/Blanco, M/Azul, L/Negro
    // PROD-006 Bolso:    UNICO/Negro, UNICO/Rojo
    const [
      varCamSN, varCamMB, varCamLR,
      varPanMN, varPanXLN, varPanLAz,
      varShoSN, varShoMAz, varShoLR,
      varSudMN, varSudLB, varSudXLV,
      varPolSB, varPolMAz, varPolLN,
      varBolUN, varBolUR,
    ] = await db.variante.bulkCreate([
      { sku: "CAM-S-NGR",  producto_id: prodCamiseta.id, talla_id: tallaSm.id,    color_id: colorNegro.id,  codigo_barras: "7500000000001" },
      { sku: "CAM-M-BLC",  producto_id: prodCamiseta.id, talla_id: tallaMd.id,    color_id: colorBlanco.id, codigo_barras: "7500000000002" },
      { sku: "CAM-L-ROJ",  producto_id: prodCamiseta.id, talla_id: tallaL.id,     color_id: colorRojo.id,   codigo_barras: "7500000000003" },
      { sku: "PAN-M-NGR",  producto_id: prodPantalon.id, talla_id: tallaMd.id,    color_id: colorNegro.id,  codigo_barras: "7500000000004" },
      { sku: "PAN-XL-NGR", producto_id: prodPantalon.id, talla_id: tallaXl.id,    color_id: colorNegro.id,  codigo_barras: "7500000000005" },
      { sku: "PAN-L-AZU",  producto_id: prodPantalon.id, talla_id: tallaL.id,     color_id: colorAzul.id,   codigo_barras: "7500000000006" },
      { sku: "SHO-S-NGR",  producto_id: prodShort.id,    talla_id: tallaSm.id,    color_id: colorNegro.id,  codigo_barras: "7500000000007" },
      { sku: "SHO-M-AZU",  producto_id: prodShort.id,    talla_id: tallaMd.id,    color_id: colorAzul.id,   codigo_barras: "7500000000008" },
      { sku: "SHO-L-ROJ",  producto_id: prodShort.id,    talla_id: tallaL.id,     color_id: colorRojo.id,   codigo_barras: "7500000000009" },
      { sku: "SUD-M-NGR",  producto_id: prodSudadera.id, talla_id: tallaMd.id,    color_id: colorNegro.id,  codigo_barras: "7500000000010" },
      { sku: "SUD-L-BLC",  producto_id: prodSudadera.id, talla_id: tallaL.id,     color_id: colorBlanco.id, codigo_barras: "7500000000011" },
      { sku: "SUD-XL-VER", producto_id: prodSudadera.id, talla_id: tallaXl.id,    color_id: colorVerde.id,  codigo_barras: "7500000000012" },
      { sku: "POL-S-BLC",  producto_id: prodPolo.id,     talla_id: tallaSm.id,    color_id: colorBlanco.id, codigo_barras: "7500000000013" },
      { sku: "POL-M-AZU",  producto_id: prodPolo.id,     talla_id: tallaMd.id,    color_id: colorAzul.id,   codigo_barras: "7500000000014" },
      { sku: "POL-L-NGR",  producto_id: prodPolo.id,     talla_id: tallaL.id,     color_id: colorNegro.id,  codigo_barras: "7500000000015" },
      { sku: "BOL-U-NGR",  producto_id: prodBolso.id,    talla_id: tallaUnico.id, color_id: colorNegro.id,  codigo_barras: "7500000000016" },
      { sku: "BOL-U-ROJ",  producto_id: prodBolso.id,    talla_id: tallaUnico.id, color_id: colorRojo.id,   codigo_barras: "7500000000017" },
    ], { transaction: t });

    // ── Precios (costo, minorista, mayorista) por producto ────────────────────
    // [variante, costo, minorista, mayorista]
    const tablaPreciosRaw = [
      [varCamSN,   45.00, 125.00,  95.00],
      [varCamMB,   45.00, 125.00,  95.00],
      [varCamLR,   45.00, 125.00,  95.00],
      [varPanMN,   80.00, 199.00, 155.00],
      [varPanXLN,  80.00, 199.00, 155.00],
      [varPanLAz,  80.00, 199.00, 155.00],
      [varShoSN,   35.00,  89.00,  69.00],
      [varShoMAz,  35.00,  89.00,  69.00],
      [varShoLR,   35.00,  89.00,  69.00],
      [varSudMN,   65.00, 175.00, 139.00],
      [varSudLB,   65.00, 175.00, 139.00],
      [varSudXLV,  65.00, 175.00, 139.00],
      [varPolSB,   55.00, 149.00, 115.00],
      [varPolMAz,  55.00, 149.00, 115.00],
      [varPolLN,   55.00, 149.00, 115.00],
      [varBolUN,  120.00, 279.00, 219.00],
      [varBolUR,  120.00, 279.00, 219.00],
    ];

    const preciosRows = [];
    for (const [v, costo, min, may] of tablaPreciosRaw) {
      preciosRows.push(
        { variante_id: v.id, tipo: "COSTO",     monto: costo, vigente_desde: hoy(), registrado_por: usrAdmin.id },
        { variante_id: v.id, tipo: "MINORISTA", monto: min,   vigente_desde: hoy(), registrado_por: usrAdmin.id },
        { variante_id: v.id, tipo: "MAYORISTA", monto: may,   vigente_desde: hoy(), registrado_por: usrAdmin.id }
      );
    }
    await db.precio.bulkCreate(preciosRows, { transaction: t });

    await db.proveedor_producto.bulkCreate([
      { proveedor_id: provTextil.id,    producto_id: prodCamiseta.id,  costo_compra: 42.00, es_principal: true },
      { proveedor_id: provTextil.id,    producto_id: prodPantalon.id,  costo_compra: 78.00, es_principal: true },
      { proveedor_id: provDeportes.id,  producto_id: prodShort.id,     costo_compra: 32.00, es_principal: true },
      { proveedor_id: provDeportes.id,  producto_id: prodSudadera.id,  costo_compra: 62.00, es_principal: true },
      { proveedor_id: provDeportes.id,  producto_id: prodPolo.id,      costo_compra: 52.00, es_principal: true },
      { proveedor_id: provAccesorios.id,producto_id: prodBolso.id,     costo_compra: 115.00,es_principal: true },
    ], { transaction: t });

    console.log("✓ Catálogo (6 productos, 17 variantes, 51 precios, 6 proveedor-producto)");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 6 — Inventario
    // ════════════════════════════════════════════════════════════════════════

    const todas_variantes = [
      varCamSN, varCamMB, varCamLR,
      varPanMN, varPanXLN, varPanLAz,
      varShoSN, varShoMAz, varShoLR,
      varSudMN, varSudLB, varSudXLV,
      varPolSB, varPolMAz, varPolLN,
      varBolUN, varBolUR,
    ];
    const todas_sucursales = [sucCentral, sucTienda, sucTienda2];

    // Inicializar existencias en 0
    const existenciasRows = [];
    for (const v of todas_variantes)
      for (const s of todas_sucursales)
        existenciasRows.push({ variante_id: v.id, sucursal_id: s.id });
    await db.existencia.bulkCreate(existenciasRows, { transaction: t });

    // ── Comprobante de compra (ENTRADA_COMPRA — bodega central, 17 variantes) ─
    // [variante, cantidad, costo_unitario]
    const compraItems = [
      [varCamSN,   50, 45.00],
      [varCamMB,   50, 45.00],
      [varCamLR,   40, 45.00],
      [varPanMN,   30, 80.00],
      [varPanXLN,  30, 80.00],
      [varPanLAz,  25, 80.00],
      [varShoSN,   40, 35.00],
      [varShoMAz,  40, 35.00],
      [varShoLR,   30, 35.00],
      [varSudMN,   35, 65.00],
      [varSudLB,   35, 65.00],
      [varSudXLV,  25, 65.00],
      [varPolSB,   40, 55.00],
      [varPolMAz,  40, 55.00],
      [varPolLN,   30, 55.00],
      [varBolUN,   20,120.00],
      [varBolUR,   20,120.00],
    ];
    const totalCompra = compraItems.reduce((s, [, q, c]) => s + q * c, 0);

    const compEntrada = await db.comprobante.create({
      numero: "CENT-E-0001",
      tipo: "ENTRADA", subtipo: "COMPRA",
      sucursal_id: sucCentral.id, proveedor_id: provTextil.id,
      total: totalCompra, usuario_id: usrAdmin.id,
      fecha: ahora(), documento_externo: "FAC-12345",
    }, { transaction: t });

    await db.comprobante_detalle.bulkCreate(
      compraItems.map(([v, qty, costo]) => ({
        comprobante_id: compEntrada.id,
        variante_id: v.id,  sku: v.sku,
        descripcion: `${v.sku} — compra proveedor`,
        cantidad: qty, costo_unitario: costo, subtotal: qty * costo,
      })),
      { transaction: t }
    );

    // Actualizar existencias y registrar movimientos ENTRADA_COMPRA
    for (const [v, qty, costo] of compraItems) {
      await db.existencia.update(
        { cantidad_fisica: qty, costo_promedio: costo },
        { where: { variante_id: v.id, sucursal_id: sucCentral.id }, transaction: t }
      );
    }
    await db.movimiento_inventario.bulkCreate(
      compraItems.map(([v, qty, costo]) => ({
        variante_id: v.id, sucursal_id: sucCentral.id,
        tipo: "ENTRADA_COMPRA", cantidad: qty, costo_unitario: costo,
        saldo_anterior: 0, saldo_resultante: qty,
        referencia_tipo: "comprobante", referencia_id: compEntrada.id,
        comprobante_id: compEntrada.id, usuario_id: usrAdmin.id, fecha: ahora(),
      })),
      { transaction: t }
    );

    // ── Traslado 1: bodega central → Tienda Zona 1 (9 variantes) ─────────────
    // [variante, cantidad, costo, saldo_central_previo]
    const traslado1Items = [
      [varCamSN,  20, 45.00, 50],
      [varCamMB,  20, 45.00, 50],
      [varCamLR,  15, 45.00, 40],
      [varPanMN,  15, 80.00, 30],
      [varPanXLN, 15, 80.00, 30],
      [varShoSN,  15, 35.00, 40],
      [varShoMAz, 15, 35.00, 40],
      [varPolSB,  15, 55.00, 40],
      [varBolUN,  10,120.00, 20],
    ];

    const traslado1 = await db.traslado.create({
      numero: "TR-CENT-T001-001",
      sucursal_origen_id: sucCentral.id, sucursal_destino_id: sucTienda.id,
      estado: "RECIBIDO",
      fecha_despacho: ahora(), fecha_recepcion: ahora(),
      despachado_por: usrAdmin.id, recibido_por: usrVend1.id,
      observaciones: "Traslado inicial de apertura — Tienda Zona 1",
    }, { transaction: t });

    await db.traslado_detalle.bulkCreate(
      traslado1Items.map(([v, qty]) => ({
        traslado_id: traslado1.id,
        variante_id: v.id, cantidad_despachada: qty, cantidad_recibida: qty,
      })),
      { transaction: t }
    );

    const movsTr1 = [];
    for (const [v, qty, costoU, saldoPrevCent] of traslado1Items) {
      await db.existencia.update(
        { cantidad_fisica: saldoPrevCent - qty },
        { where: { variante_id: v.id, sucursal_id: sucCentral.id }, transaction: t }
      );
      await db.existencia.update(
        { cantidad_fisica: qty, costo_promedio: costoU },
        { where: { variante_id: v.id, sucursal_id: sucTienda.id }, transaction: t }
      );
      movsTr1.push(
        {
          variante_id: v.id, sucursal_id: sucCentral.id, tipo: "SALIDA_TRASLADO",
          cantidad: qty, costo_unitario: costoU,
          saldo_anterior: saldoPrevCent, saldo_resultante: saldoPrevCent - qty,
          referencia_tipo: "traslado", referencia_id: traslado1.id,
          usuario_id: usrAdmin.id, fecha: ahora(),
        },
        {
          variante_id: v.id, sucursal_id: sucTienda.id, tipo: "ENTRADA_TRASLADO",
          cantidad: qty, costo_unitario: costoU,
          saldo_anterior: 0, saldo_resultante: qty,
          referencia_tipo: "traslado", referencia_id: traslado1.id,
          usuario_id: usrVend1.id, fecha: ahora(),
        }
      );
    }
    await db.movimiento_inventario.bulkCreate(movsTr1, { transaction: t });

    // ── Traslado 2: bodega central → Tienda Quetzaltenango (8 variantes) ──────
    // [variante, cantidad, costo, saldo_central_previo_al_traslado2]
    const traslado2Items = [
      [varPanLAz,  10, 80.00, 25],
      [varShoLR,   12, 35.00, 30],
      [varSudMN,   15, 65.00, 35],
      [varSudLB,   15, 65.00, 35],
      [varSudXLV,  10, 65.00, 25],
      [varPolMAz,  15, 55.00, 40],
      [varPolLN,   12, 55.00, 30],
      [varBolUR,    8,120.00, 20],
    ];

    const traslado2 = await db.traslado.create({
      numero: "TR-CENT-T002-001",
      sucursal_origen_id: sucCentral.id, sucursal_destino_id: sucTienda2.id,
      estado: "RECIBIDO",
      fecha_despacho: ahora(), fecha_recepcion: ahora(),
      despachado_por: usrAdmin.id, recibido_por: usrVend2.id,
      observaciones: "Traslado inicial de apertura — Tienda Quetzaltenango",
    }, { transaction: t });

    await db.traslado_detalle.bulkCreate(
      traslado2Items.map(([v, qty]) => ({
        traslado_id: traslado2.id,
        variante_id: v.id, cantidad_despachada: qty, cantidad_recibida: qty,
      })),
      { transaction: t }
    );

    const movsTr2 = [];
    for (const [v, qty, costoU, saldoPrevCent] of traslado2Items) {
      await db.existencia.update(
        { cantidad_fisica: saldoPrevCent - qty },
        { where: { variante_id: v.id, sucursal_id: sucCentral.id }, transaction: t }
      );
      await db.existencia.update(
        { cantidad_fisica: qty, costo_promedio: costoU },
        { where: { variante_id: v.id, sucursal_id: sucTienda2.id }, transaction: t }
      );
      movsTr2.push(
        {
          variante_id: v.id, sucursal_id: sucCentral.id, tipo: "SALIDA_TRASLADO",
          cantidad: qty, costo_unitario: costoU,
          saldo_anterior: saldoPrevCent, saldo_resultante: saldoPrevCent - qty,
          referencia_tipo: "traslado", referencia_id: traslado2.id,
          usuario_id: usrAdmin.id, fecha: ahora(),
        },
        {
          variante_id: v.id, sucursal_id: sucTienda2.id, tipo: "ENTRADA_TRASLADO",
          cantidad: qty, costo_unitario: costoU,
          saldo_anterior: 0, saldo_resultante: qty,
          referencia_tipo: "traslado", referencia_id: traslado2.id,
          usuario_id: usrVend2.id, fecha: ahora(),
        }
      );
    }
    await db.movimiento_inventario.bulkCreate(movsTr2, { transaction: t });

    console.log("✓ Inventario (51 existencias, compra CENT, traslado→T001, traslado→T002)");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 7 — Pedidos y pagos
    // ════════════════════════════════════════════════════════════════════════

    // helper para descontar stock y registrar movimiento SALIDA_VENTA
    async function registrarVenta({ variante, sucursal, cantidad, costoUnit, saldoPrev, pedido, comprobante }) {
      await db.existencia.update(
        { cantidad_fisica: saldoPrev - cantidad },
        { where: { variante_id: variante.id, sucursal_id: sucursal.id }, transaction: t }
      );
      await db.movimiento_inventario.create({
        variante_id: variante.id, sucursal_id: sucursal.id,
        tipo: "SALIDA_VENTA", cantidad, costo_unitario: costoUnit,
        saldo_anterior: saldoPrev, saldo_resultante: saldoPrev - cantidad,
        referencia_tipo: "pedido", referencia_id: pedido.id,
        comprobante_id: comprobante ? comprobante.id : null,
        usuario_id: usrAdmin.id, fecha: ahora(),
      }, { transaction: t });
    }

    // ────────────────────────────────────────────────────────────────────────
    // PED-2026-0001 · CLI-001 · MINORISTA · T001 · EN_LINEA · ENTREGADO
    // 2× CAM-S-NGR @ Q125 = Q250 + envío Q25 = Q275
    // ────────────────────────────────────────────────────────────────────────
    const pedido1 = await db.pedido.create({
      numero: "PED-2026-0001",
      cliente_id: cliMinorista.id, tipo_cliente: "MINORISTA",
      sucursal_id: sucTienda.id, canal: "TIENDA", estado: "ENTREGADO",
      forma_pago: "EN_LINEA",
      subtotal: 250.00, costo_envio: 25.00, total: 275.00,
      entrega_tipo: "ENVIO",
      entrega_destinatario: "Ana Lucía Morales",
      entrega_direccion: "5a Calle 3-40 Zona 10",
      entrega_municipio: "Guatemala", entrega_departamento: "Guatemala",
      entrega_telefono: "55441122",
      registrado_por: usrCli1.id,
    }, { transaction: t });

    await db.pedido_detalle.create({
      pedido_id: pedido1.id, variante_id: varCamSN.id, sku: "CAM-S-NGR",
      descripcion: "Camiseta Deportiva Climalite — S / Negro",
      cantidad: 2, cantidad_despachada: 2,
      precio_unitario: 125.00, subtotal: 250.00,
    }, { transaction: t });

    await db.pedido_historial.bulkCreate([
      { pedido_id: pedido1.id, estado_anterior: null,             estado_nuevo: "REGISTRADO",     usuario_id: usrCli1.id,   fecha: ahora() },
      { pedido_id: pedido1.id, estado_anterior: "REGISTRADO",     estado_nuevo: "PENDIENTE_PAGO", usuario_id: usrCli1.id,   fecha: ahora() },
      { pedido_id: pedido1.id, estado_anterior: "PENDIENTE_PAGO", estado_nuevo: "PAGADO",         usuario_id: null, motivo: "Webhook Stripe confirmado", fecha: ahora() },
      { pedido_id: pedido1.id, estado_anterior: "PAGADO",         estado_nuevo: "EN_PREPARACION", usuario_id: usrVend1.id,  fecha: ahora() },
      { pedido_id: pedido1.id, estado_anterior: "EN_PREPARACION", estado_nuevo: "DESPACHADO",     usuario_id: usrVend1.id,  fecha: ahora() },
      { pedido_id: pedido1.id, estado_anterior: "DESPACHADO",     estado_nuevo: "ENTREGADO",      usuario_id: null, motivo: "Confirmación de entrega", fecha: ahora() },
    ], { transaction: t });

    const compVenta1 = await db.comprobante.create({
      numero: "T001-S-0001", tipo: "SALIDA", subtipo: "VENTA",
      sucursal_id: sucTienda.id, cliente_id: cliMinorista.id,
      pedido_id: pedido1.id, total: 275.00,
      usuario_id: usrAdmin.id, fecha: ahora(),
    }, { transaction: t });

    await db.comprobante_detalle.create({
      comprobante_id: compVenta1.id, variante_id: varCamSN.id, sku: "CAM-S-NGR",
      descripcion: "Camiseta Deportiva Climalite — S / Negro",
      cantidad: 2, costo_unitario: 45.00, subtotal: 90.00,
    }, { transaction: t });

    await registrarVenta({ variante: varCamSN, sucursal: sucTienda, cantidad: 2, costoUnit: 45.00, saldoPrev: 20, pedido: pedido1, comprobante: compVenta1 });

    const txPago1 = await db.transaccion_pago.create({
      pedido_id: pedido1.id, proveedor: "STRIPE", id_externo: "pi_3PsKXrGtest001",
      tipo: "PAGO", monto: 275.00, moneda: "GTQ", estado: "EXITOSA",
      mensaje_proveedor: "Payment succeeded", fecha: ahora(),
    }, { transaction: t });

    await db.transaccion_pago.create({
      pedido_id: pedido1.id, proveedor: "STRIPE", id_externo: "re_3PsKXrGtest001",
      tipo: "REEMBOLSO", transaccion_origen_id: txPago1.id,
      monto: 125.00, moneda: "GTQ", estado: "EXITOSA",
      mensaje_proveedor: "Partial refund issued",
      motivo: "Devolución de 1 unidad por talla incorrecta", fecha: ahora(),
    }, { transaction: t });

    // ────────────────────────────────────────────────────────────────────────
    // PED-2026-0002 · CLI-002 · MAYORISTA · T001 · INTERNO · CREDITO · PAGADO
    // 10× PAN-M-NGR @ Q155 = Q1,550
    // ────────────────────────────────────────────────────────────────────────
    const pedido2 = await db.pedido.create({
      numero: "PED-2026-0002",
      cliente_id: cliMayorista.id, tipo_cliente: "MAYORISTA",
      sucursal_id: sucTienda.id, canal: "INTERNO", es_lote: true,
      estado: "PAGADO", forma_pago: "CREDITO",
      subtotal: 1550.00, costo_envio: 0, total: 1550.00,
      entrega_tipo: "RETIRO_SUCURSAL",
      entrega_destinatario: "Distribuidora Morales",
      registrado_por: usrAdmin.id,
    }, { transaction: t });

    await db.pedido_detalle.create({
      pedido_id: pedido2.id, variante_id: varPanMN.id, sku: "PAN-M-NGR",
      descripcion: "Pantalón Cargo Táctico — M / Negro",
      cantidad: 10, cantidad_despachada: 10,
      precio_unitario: 155.00, subtotal: 1550.00,
    }, { transaction: t });

    await db.pedido_historial.bulkCreate([
      { pedido_id: pedido2.id, estado_anterior: null,         estado_nuevo: "REGISTRADO", usuario_id: usrAdmin.id, fecha: ahora() },
      { pedido_id: pedido2.id, estado_anterior: "REGISTRADO", estado_nuevo: "PAGADO",     usuario_id: usrAdmin.id, motivo: "Crédito mayorista autorizado", fecha: ahora() },
    ], { transaction: t });

    await db.credito_movimiento.bulkCreate([
      {
        cliente_id: cliMayorista.id, tipo: "CARGO", pedido_id: pedido2.id,
        monto: 1550.00, saldo_resultante: 1550.00,
        referencia: `Pedido ${pedido2.numero}`,
        usuario_id: usrAdmin.id, fecha: ahora(),
      },
      {
        cliente_id: cliMayorista.id, tipo: "ABONO", pedido_id: pedido2.id,
        monto: 500.00, saldo_resultante: 1050.00,
        referencia: "Pago parcial — transferencia bancaria",
        usuario_id: usrAdmin.id, fecha: ahora(),
      },
    ], { transaction: t });

    await db.cliente.update(
      { credito_utilizado: 1050.00 },
      { where: { id: cliMayorista.id }, transaction: t }
    );

    await registrarVenta({ variante: varPanMN, sucursal: sucTienda, cantidad: 10, costoUnit: 80.00, saldoPrev: 15, pedido: pedido2, comprobante: null });

    // ────────────────────────────────────────────────────────────────────────
    // PED-2026-0003 · CLI-001 · MINORISTA · T001 · EN_LINEA · ENTREGADO
    // 1× CAM-M-BLC @ Q125 + 1× CAM-L-ROJ @ Q125 = Q250 + envío Q25 = Q275
    // ────────────────────────────────────────────────────────────────────────
    const pedido3 = await db.pedido.create({
      numero: "PED-2026-0003",
      cliente_id: cliMinorista.id, tipo_cliente: "MINORISTA",
      sucursal_id: sucTienda.id, canal: "TIENDA", estado: "ENTREGADO",
      forma_pago: "EN_LINEA",
      subtotal: 250.00, costo_envio: 25.00, total: 275.00,
      entrega_tipo: "ENVIO",
      entrega_destinatario: "Ana Lucía Morales",
      entrega_direccion: "5a Calle 3-40 Zona 10",
      entrega_municipio: "Guatemala", entrega_departamento: "Guatemala",
      entrega_telefono: "55441122",
      registrado_por: usrCli1.id,
    }, { transaction: t });

    await db.pedido_detalle.bulkCreate([
      {
        pedido_id: pedido3.id, variante_id: varCamMB.id, sku: "CAM-M-BLC",
        descripcion: "Camiseta Deportiva Climalite — M / Blanco",
        cantidad: 1, cantidad_despachada: 1,
        precio_unitario: 125.00, subtotal: 125.00,
      },
      {
        pedido_id: pedido3.id, variante_id: varCamLR.id, sku: "CAM-L-ROJ",
        descripcion: "Camiseta Deportiva Climalite — L / Rojo",
        cantidad: 1, cantidad_despachada: 1,
        precio_unitario: 125.00, subtotal: 125.00,
      },
    ], { transaction: t });

    await db.pedido_historial.bulkCreate([
      { pedido_id: pedido3.id, estado_anterior: null,             estado_nuevo: "REGISTRADO",     usuario_id: usrCli1.id,   fecha: ahora() },
      { pedido_id: pedido3.id, estado_anterior: "REGISTRADO",     estado_nuevo: "PENDIENTE_PAGO", usuario_id: usrCli1.id,   fecha: ahora() },
      { pedido_id: pedido3.id, estado_anterior: "PENDIENTE_PAGO", estado_nuevo: "PAGADO",         usuario_id: null, motivo: "Webhook Stripe confirmado", fecha: ahora() },
      { pedido_id: pedido3.id, estado_anterior: "PAGADO",         estado_nuevo: "EN_PREPARACION", usuario_id: usrVend1.id,  fecha: ahora() },
      { pedido_id: pedido3.id, estado_anterior: "EN_PREPARACION", estado_nuevo: "DESPACHADO",     usuario_id: usrVend1.id,  fecha: ahora() },
      { pedido_id: pedido3.id, estado_anterior: "DESPACHADO",     estado_nuevo: "ENTREGADO",      usuario_id: null, motivo: "Confirmación de entrega", fecha: ahora() },
    ], { transaction: t });

    const compVenta3 = await db.comprobante.create({
      numero: "T001-S-0002", tipo: "SALIDA", subtipo: "VENTA",
      sucursal_id: sucTienda.id, cliente_id: cliMinorista.id,
      pedido_id: pedido3.id, total: 275.00,
      usuario_id: usrAdmin.id, fecha: ahora(),
    }, { transaction: t });

    await db.comprobante_detalle.bulkCreate([
      {
        comprobante_id: compVenta3.id, variante_id: varCamMB.id, sku: "CAM-M-BLC",
        descripcion: "Camiseta Deportiva Climalite — M / Blanco",
        cantidad: 1, costo_unitario: 45.00, subtotal: 45.00,
      },
      {
        comprobante_id: compVenta3.id, variante_id: varCamLR.id, sku: "CAM-L-ROJ",
        descripcion: "Camiseta Deportiva Climalite — L / Rojo",
        cantidad: 1, costo_unitario: 45.00, subtotal: 45.00,
      },
    ], { transaction: t });

    await registrarVenta({ variante: varCamMB, sucursal: sucTienda, cantidad: 1, costoUnit: 45.00, saldoPrev: 20, pedido: pedido3, comprobante: compVenta3 });
    await registrarVenta({ variante: varCamLR, sucursal: sucTienda, cantidad: 1, costoUnit: 45.00, saldoPrev: 15, pedido: pedido3, comprobante: compVenta3 });

    await db.transaccion_pago.create({
      pedido_id: pedido3.id, proveedor: "STRIPE", id_externo: "pi_3PsKXrGtest003",
      tipo: "PAGO", monto: 275.00, moneda: "GTQ", estado: "EXITOSA",
      mensaje_proveedor: "Payment succeeded", fecha: ahora(),
    }, { transaction: t });

    // ────────────────────────────────────────────────────────────────────────
    // PED-2026-0004 · CLI-003 · MINORISTA · T002 · EN_LINEA · ENTREGADO
    // 2× SHO-L-ROJ @ Q89 = Q178 + envío Q35 = Q213
    // ────────────────────────────────────────────────────────────────────────
    const pedido4 = await db.pedido.create({
      numero: "PED-2026-0004",
      cliente_id: cli3.id, tipo_cliente: "MINORISTA",
      sucursal_id: sucTienda2.id, canal: "TIENDA", estado: "ENTREGADO",
      forma_pago: "EN_LINEA",
      subtotal: 178.00, costo_envio: 35.00, total: 213.00,
      entrega_tipo: "ENVIO",
      entrega_destinatario: "Pedro José Hernández",
      entrega_direccion: "10a Calle 5-30 Zona 3, Xela",
      entrega_municipio: "Quetzaltenango", entrega_departamento: "Quetzaltenango",
      entrega_telefono: "55332211",
      registrado_por: usrCli3.id,
    }, { transaction: t });

    await db.pedido_detalle.create({
      pedido_id: pedido4.id, variante_id: varShoLR.id, sku: "SHO-L-ROJ",
      descripcion: "Short Running Dri-Fit — L / Rojo",
      cantidad: 2, cantidad_despachada: 2,
      precio_unitario: 89.00, subtotal: 178.00,
    }, { transaction: t });

    await db.pedido_historial.bulkCreate([
      { pedido_id: pedido4.id, estado_anterior: null,             estado_nuevo: "REGISTRADO",     usuario_id: usrCli3.id,   fecha: ahora() },
      { pedido_id: pedido4.id, estado_anterior: "REGISTRADO",     estado_nuevo: "PENDIENTE_PAGO", usuario_id: usrCli3.id,   fecha: ahora() },
      { pedido_id: pedido4.id, estado_anterior: "PENDIENTE_PAGO", estado_nuevo: "PAGADO",         usuario_id: null, motivo: "Webhook Stripe confirmado", fecha: ahora() },
      { pedido_id: pedido4.id, estado_anterior: "PAGADO",         estado_nuevo: "EN_PREPARACION", usuario_id: usrVend2.id,  fecha: ahora() },
      { pedido_id: pedido4.id, estado_anterior: "EN_PREPARACION", estado_nuevo: "DESPACHADO",     usuario_id: usrVend2.id,  fecha: ahora() },
      { pedido_id: pedido4.id, estado_anterior: "DESPACHADO",     estado_nuevo: "ENTREGADO",      usuario_id: null, motivo: "Confirmación de entrega", fecha: ahora() },
    ], { transaction: t });

    const compVenta4 = await db.comprobante.create({
      numero: "T002-S-0001", tipo: "SALIDA", subtipo: "VENTA",
      sucursal_id: sucTienda2.id, cliente_id: cli3.id,
      pedido_id: pedido4.id, total: 213.00,
      usuario_id: usrAdmin.id, fecha: ahora(),
    }, { transaction: t });

    await db.comprobante_detalle.create({
      comprobante_id: compVenta4.id, variante_id: varShoLR.id, sku: "SHO-L-ROJ",
      descripcion: "Short Running Dri-Fit — L / Rojo",
      cantidad: 2, costo_unitario: 35.00, subtotal: 70.00,
    }, { transaction: t });

    await registrarVenta({ variante: varShoLR, sucursal: sucTienda2, cantidad: 2, costoUnit: 35.00, saldoPrev: 12, pedido: pedido4, comprobante: compVenta4 });

    await db.transaccion_pago.create({
      pedido_id: pedido4.id, proveedor: "STRIPE", id_externo: "pi_3PsKXrGtest004",
      tipo: "PAGO", monto: 213.00, moneda: "GTQ", estado: "EXITOSA",
      mensaje_proveedor: "Payment succeeded", fecha: ahora(),
    }, { transaction: t });

    // ────────────────────────────────────────────────────────────────────────
    // PED-2026-0005 · CLI-005 · MAYORISTA · T002 · INTERNO · CREDITO · PAGADO
    // 5× SUD-M-NGR @ Q139 + 3× SUD-L-BLC @ Q139 = Q695+Q417 = Q1,112
    // ────────────────────────────────────────────────────────────────────────
    const pedido5 = await db.pedido.create({
      numero: "PED-2026-0005",
      cliente_id: cli5.id, tipo_cliente: "MAYORISTA",
      sucursal_id: sucTienda2.id, canal: "INTERNO", es_lote: true,
      estado: "PAGADO", forma_pago: "CREDITO",
      subtotal: 1112.00, costo_envio: 0, total: 1112.00,
      entrega_tipo: "RETIRO_SUCURSAL",
      entrega_destinatario: "Importaciones del Norte S.A.",
      registrado_por: usrAdmin.id,
    }, { transaction: t });

    await db.pedido_detalle.bulkCreate([
      {
        pedido_id: pedido5.id, variante_id: varSudMN.id, sku: "SUD-M-NGR",
        descripcion: "Sudadera Hoodie Classic — M / Negro",
        cantidad: 5, cantidad_despachada: 5,
        precio_unitario: 139.00, subtotal: 695.00,
      },
      {
        pedido_id: pedido5.id, variante_id: varSudLB.id, sku: "SUD-L-BLC",
        descripcion: "Sudadera Hoodie Classic — L / Blanco",
        cantidad: 3, cantidad_despachada: 3,
        precio_unitario: 139.00, subtotal: 417.00,
      },
    ], { transaction: t });

    await db.pedido_historial.bulkCreate([
      { pedido_id: pedido5.id, estado_anterior: null,         estado_nuevo: "REGISTRADO", usuario_id: usrAdmin.id, fecha: ahora() },
      { pedido_id: pedido5.id, estado_anterior: "REGISTRADO", estado_nuevo: "PAGADO",     usuario_id: usrAdmin.id, motivo: "Crédito mayorista autorizado", fecha: ahora() },
    ], { transaction: t });

    await db.credito_movimiento.bulkCreate([
      {
        cliente_id: cli5.id, tipo: "CARGO", pedido_id: pedido5.id,
        monto: 1112.00, saldo_resultante: 1112.00,
        referencia: `Pedido ${pedido5.numero}`,
        usuario_id: usrAdmin.id, fecha: ahora(),
      },
      {
        cliente_id: cli5.id, tipo: "ABONO", pedido_id: pedido5.id,
        monto: 600.00, saldo_resultante: 512.00,
        referencia: "Pago parcial — cheque bancario",
        usuario_id: usrAdmin.id, fecha: ahora(),
      },
    ], { transaction: t });

    await db.cliente.update(
      { credito_utilizado: 512.00 },
      { where: { id: cli5.id }, transaction: t }
    );

    await registrarVenta({ variante: varSudMN, sucursal: sucTienda2, cantidad: 5, costoUnit: 65.00, saldoPrev: 15, pedido: pedido5, comprobante: null });
    await registrarVenta({ variante: varSudLB, sucursal: sucTienda2, cantidad: 3, costoUnit: 65.00, saldoPrev: 15, pedido: pedido5, comprobante: null });

    // ────────────────────────────────────────────────────────────────────────
    // PED-2026-0006 · CLI-004 · MINORISTA · T001 · EN_LINEA · DESPACHADO
    // 1× POL-S-BLC @ Q149 + envío Q25 = Q174
    // ────────────────────────────────────────────────────────────────────────
    const pedido6 = await db.pedido.create({
      numero: "PED-2026-0006",
      cliente_id: cli4.id, tipo_cliente: "MINORISTA",
      sucursal_id: sucTienda.id, canal: "TIENDA", estado: "DESPACHADO",
      forma_pago: "EN_LINEA",
      subtotal: 149.00, costo_envio: 25.00, total: 174.00,
      entrega_tipo: "ENVIO",
      entrega_destinatario: "Laura Beatriz Santos",
      entrega_direccion: "Residenciales Las Palmas, Lote 14",
      entrega_municipio: "Mixco", entrega_departamento: "Guatemala",
      entrega_telefono: "55662233",
      registrado_por: usrCli4.id,
    }, { transaction: t });

    await db.pedido_detalle.create({
      pedido_id: pedido6.id, variante_id: varPolSB.id, sku: "POL-S-BLC",
      descripcion: "Polo Performance HeatGear — S / Blanco",
      cantidad: 1, cantidad_despachada: 1,
      precio_unitario: 149.00, subtotal: 149.00,
    }, { transaction: t });

    await db.pedido_historial.bulkCreate([
      { pedido_id: pedido6.id, estado_anterior: null,             estado_nuevo: "REGISTRADO",     usuario_id: usrCli4.id,   fecha: ahora() },
      { pedido_id: pedido6.id, estado_anterior: "REGISTRADO",     estado_nuevo: "PENDIENTE_PAGO", usuario_id: usrCli4.id,   fecha: ahora() },
      { pedido_id: pedido6.id, estado_anterior: "PENDIENTE_PAGO", estado_nuevo: "PAGADO",         usuario_id: null, motivo: "Webhook Stripe confirmado", fecha: ahora() },
      { pedido_id: pedido6.id, estado_anterior: "PAGADO",         estado_nuevo: "EN_PREPARACION", usuario_id: usrVend1.id,  fecha: ahora() },
      { pedido_id: pedido6.id, estado_anterior: "EN_PREPARACION", estado_nuevo: "DESPACHADO",     usuario_id: usrVend1.id,  fecha: ahora() },
    ], { transaction: t });

    await db.transaccion_pago.create({
      pedido_id: pedido6.id, proveedor: "STRIPE", id_externo: "pi_3PsKXrGtest006",
      tipo: "PAGO", monto: 174.00, moneda: "GTQ", estado: "EXITOSA",
      mensaje_proveedor: "Payment succeeded", fecha: ahora(),
    }, { transaction: t });

    await registrarVenta({ variante: varPolSB, sucursal: sucTienda, cantidad: 1, costoUnit: 55.00, saldoPrev: 15, pedido: pedido6, comprobante: null });

    // ────────────────────────────────────────────────────────────────────────
    // PED-2026-0007 · CLI-003 · MINORISTA · T001 · EN_LINEA · EN_PREPARACION
    // 2× BOL-U-NGR @ Q279 = Q558 + envío Q25 = Q583
    // ────────────────────────────────────────────────────────────────────────
    const pedido7 = await db.pedido.create({
      numero: "PED-2026-0007",
      cliente_id: cli3.id, tipo_cliente: "MINORISTA",
      sucursal_id: sucTienda.id, canal: "TIENDA", estado: "EN_PREPARACION",
      forma_pago: "EN_LINEA",
      subtotal: 558.00, costo_envio: 25.00, total: 583.00,
      entrega_tipo: "ENVIO",
      entrega_destinatario: "Pedro José Hernández",
      entrega_direccion: "10a Calle 5-30 Zona 3, Xela",
      entrega_municipio: "Quetzaltenango", entrega_departamento: "Quetzaltenango",
      entrega_telefono: "55332211",
      registrado_por: usrCli3.id,
    }, { transaction: t });

    await db.pedido_detalle.create({
      pedido_id: pedido7.id, variante_id: varBolUN.id, sku: "BOL-U-NGR",
      descripcion: "Bolso Deportivo Stadium — Negro",
      cantidad: 2, cantidad_despachada: 0,
      precio_unitario: 279.00, subtotal: 558.00,
    }, { transaction: t });

    await db.pedido_historial.bulkCreate([
      { pedido_id: pedido7.id, estado_anterior: null,             estado_nuevo: "REGISTRADO",     usuario_id: usrCli3.id,   fecha: ahora() },
      { pedido_id: pedido7.id, estado_anterior: "REGISTRADO",     estado_nuevo: "PENDIENTE_PAGO", usuario_id: usrCli3.id,   fecha: ahora() },
      { pedido_id: pedido7.id, estado_anterior: "PENDIENTE_PAGO", estado_nuevo: "PAGADO",         usuario_id: null, motivo: "Webhook Stripe confirmado", fecha: ahora() },
      { pedido_id: pedido7.id, estado_anterior: "PAGADO",         estado_nuevo: "EN_PREPARACION", usuario_id: usrVend1.id,  fecha: ahora() },
    ], { transaction: t });

    await db.transaccion_pago.create({
      pedido_id: pedido7.id, proveedor: "STRIPE", id_externo: "pi_3PsKXrGtest007",
      tipo: "PAGO", monto: 583.00, moneda: "GTQ", estado: "EXITOSA",
      mensaje_proveedor: "Payment succeeded", fecha: ahora(),
    }, { transaction: t });

    await registrarVenta({ variante: varBolUN, sucursal: sucTienda, cantidad: 2, costoUnit: 120.00, saldoPrev: 10, pedido: pedido7, comprobante: null });

    // ────────────────────────────────────────────────────────────────────────
    // PED-2026-0008 · CLI-005 · MAYORISTA · T001 · INTERNO · CREDITO · REGISTRADO
    // 5× PAN-XL-NGR @ Q155 = Q775
    // ────────────────────────────────────────────────────────────────────────
    const pedido8 = await db.pedido.create({
      numero: "PED-2026-0008",
      cliente_id: cli5.id, tipo_cliente: "MAYORISTA",
      sucursal_id: sucTienda.id, canal: "INTERNO", es_lote: true,
      estado: "REGISTRADO", forma_pago: "CREDITO",
      subtotal: 775.00, costo_envio: 0, total: 775.00,
      entrega_tipo: "RETIRO_SUCURSAL",
      entrega_destinatario: "Importaciones del Norte S.A.",
      registrado_por: usrAdmin.id,
    }, { transaction: t });

    await db.pedido_detalle.create({
      pedido_id: pedido8.id, variante_id: varPanXLN.id, sku: "PAN-XL-NGR",
      descripcion: "Pantalón Cargo Táctico — XL / Negro",
      cantidad: 5, cantidad_despachada: 0,
      precio_unitario: 155.00, subtotal: 775.00,
    }, { transaction: t });

    await db.pedido_historial.create({
      pedido_id: pedido8.id, estado_anterior: null,
      estado_nuevo: "REGISTRADO", usuario_id: usrAdmin.id, fecha: ahora(),
    }, { transaction: t });

    // ── Carrito activo de 3 clientes ─────────────────────────────────────────
    const carrito1 = await db.carrito.create(
      { cliente_id: cliMinorista.id, activo: true }, { transaction: t }
    );
    await db.carrito_detalle.bulkCreate([
      { carrito_id: carrito1.id, variante_id: varCamMB.id,  cantidad: 1 },
      { carrito_id: carrito1.id, variante_id: varShoSN.id,  cantidad: 2 },
    ], { transaction: t });

    const carrito2 = await db.carrito.create(
      { cliente_id: cli3.id, activo: true }, { transaction: t }
    );
    await db.carrito_detalle.bulkCreate([
      { carrito_id: carrito2.id, variante_id: varSudMN.id,  cantidad: 1 },
      { carrito_id: carrito2.id, variante_id: varPolMAz.id, cantidad: 1 },
    ], { transaction: t });

    const carrito3 = await db.carrito.create(
      { cliente_id: cli4.id, activo: true }, { transaction: t }
    );
    await db.carrito_detalle.create(
      { carrito_id: carrito3.id, variante_id: varBolUR.id, cantidad: 1 },
      { transaction: t }
    );

    console.log("✓ Pedidos y pagos (8 pedidos, 10 detalles, 32 historial, 6 transacciones, 4 créditos, 3 carritos)");

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
  // Movimientos: 17 ENTRADA_COMPRA
  //            + 9 SALIDA_TRASLADO1 + 9 ENTRADA_TRASLADO1 (traslado→T001)
  //            + 8 SALIDA_TRASLADO2 + 8 ENTRADA_TRASLADO2 (traslado→T002)
  //            + 9 SALIDA_VENTA (ped1..ped7 excluyendo ped8)
  //            = 60
  // Comprobante_detalle: 17 (compra) + 1 (ped1) + 2 (ped3) + 1 (ped4) = 21
  // Pedido_historial: 6+2+6+6+2+5+4+1 = 32
  const modelos = [
    ["sucursal",             2],
    ["zona_envio",           1],
    ["parametro",            6],
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
    for (const ex of varT.existencias) {
      console.log(
        `      ${ex.sucursal.nombre.padEnd(24)}` +
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

  // ── 7. Crédito mayorista CLI-002: CARGO - ABONO == saldo_resultante ───────
  console.log("\n── 7. Crédito mayorista CLI-002 (saldo_resultante consistente) ──");
  const cliMay = await db.cliente.findOne({ where: { codigo: "CLI-002" } });
  const movsCred = await db.credito_movimiento.findAll({
    where: { cliente_id: cliMay.id },
    order: [["id", "ASC"]],
  });

  if (movsCred.length !== 2) {
    console.log(`  ✗ Esperados 2 movimientos de crédito para CLI-002, encontrados ${movsCred.length}`);
    todoOk = false;
  } else {
    const cargo = movsCred[0];
    const abono = movsCred[1];
    const calculado = parseFloat(cargo.monto) - parseFloat(abono.monto);
    const registrado = parseFloat(abono.saldo_resultante);
    const ok = Math.abs(calculado - registrado) < 0.01;
    if (!ok) todoOk = false;
    console.log(`  ${ok ? "✓" : "✗"} CARGO Q${cargo.monto}  ABONO Q${abono.monto}  →  calculado=${calculado.toFixed(2)}  registrado=${registrado.toFixed(2)}`);
  }

  // ── 8. Resumen de inventario por sucursal ─────────────────────────────────
  console.log("\n── 8. Resumen de stock por sucursal ──");
  for (const suc of ["CENT", "T001", "T002"]) {
    const [row] = await db.sequelize.query(
      `SELECT COUNT(*) AS variantes,
              SUM(cantidad_fisica) AS total_unidades
       FROM   existencia e
       JOIN   sucursals s ON s.id = e.sucursal_id
       WHERE  s.codigo = :codigo AND e.cantidad_fisica > 0`,
      { replacements: { codigo: suc }, type: db.sequelize.QueryTypes.SELECT }
    );
    console.log(`  ${suc.padEnd(6)}  variantes con stock: ${row.variantes}  unidades: ${row.total_unidades ?? 0}`);
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
