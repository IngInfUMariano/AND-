"use strict";

/**
 * Seed de datos de prueba — AND& Moda
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
      { nombre: "Metropolitana", costo:   0.00, dias_estimados: 1, departamentos: "Guatemala,Sacatepéquez,Chimaltenango" },
      { nombre: "Occidente",     costo:  40.00, dias_estimados: 3, departamentos: "Quetzaltenango,San Marcos,Huehuetenango,Totonicapán,Quiché,Sololá,Retalhuleu" },
      { nombre: "Oriente",       costo:  40.00, dias_estimados: 3, departamentos: "Chiquimula,Zacapa,El Progreso,Jalapa,Jutiapa,Santa Rosa,Izabal" },
      { nombre: "Verapaces",     costo:  50.00, dias_estimados: 4, departamentos: "Alta Verapaz,Baja Verapaz" },
      { nombre: "Petén",         costo:  75.00, dias_estimados: 5, departamentos: "Petén" },
      { nombre: "Sur",           costo:  35.00, dias_estimados: 2, departamentos: "Escuintla,Suchitepéquez" },
    ], { transaction: t });

    await db.parametro.bulkCreate([
      { clave: "IVA_PORCENTAJE",    valor: "12",                     tipo_dato: "NUMERO", descripcion: "IVA aplicado a ventas locales" },
      { clave: "MONEDA_DEFAULT",    valor: "GTQ",                    tipo_dato: "TEXTO",  descripcion: "Moneda base del sistema" },
      { clave: "LIMITE_PAGINA",     valor: "20",                     tipo_dato: "NUMERO", descripcion: "Registros por página por defecto" },
      { clave: "CREDITO_MAX_DIAS",  valor: "60",                     tipo_dato: "NUMERO", descripcion: "Plazo máximo de crédito en días" },
      { clave: "EMAIL_SOPORTE",     valor: "soporte@andmoda.gt",     tipo_dato: "TEXTO",  descripcion: "Correo de soporte al cliente" },
      { clave: "EMPRESA_NOMBRE",    valor: "AND& Moda",              tipo_dato: "TEXTO",  descripcion: "Razón social de la empresa" },
      { clave: "EMPRESA_NIT",       valor: "1234567-8",              tipo_dato: "TEXTO",  descripcion: "NIT fiscal de la empresa" },
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

    console.log("✓ Infraestructura base (3 sucursales, 6 zonas, 8 parámetros, 9 correlativos)");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 2 — Catálogo base
    // ════════════════════════════════════════════════════════════════════════

    const [marcaLumiere, marcaElite, marcaSoiree, marcaVelour] = await db.marca.bulkCreate([
      { nombre: "Lumière",          descripcion: "Alta costura de inspiración parisina" },
      { nombre: "Élite Collection", descripcion: "Moda contemporánea y sofisticada para la mujer moderna" },
      { nombre: "Soirée",           descripcion: "Prendas exclusivas para ocasiones especiales" },
      { nombre: "Velour",           descripcion: "Accesorios y bolsos de lujo artesanales" },
    ], { transaction: t });

    const [temp2026, tempOtonio] = await db.temporada.bulkCreate([
      { nombre: "Primavera-Verano", anio: 2026, descripcion: "Colección Primavera-Verano 2026" },
      { nombre: "Otoño-Invierno",   anio: 2025, descripcion: "Colección Otoño-Invierno 2025" },
    ], { transaction: t });

    const [tallaXs, tallaSm, tallaMd, tallaL, tallaUnico] = await db.talla.bulkCreate([
      { codigo: "XS",    descripcion: "Extra Small", orden: 1 },
      { codigo: "S",     descripcion: "Small",       orden: 2 },
      { codigo: "M",     descripcion: "Medium",      orden: 3 },
      { codigo: "L",     descripcion: "Large",       orden: 4 },
      { codigo: "UNICO", descripcion: "Talla única", orden: 9 },
    ], { transaction: t });

    const [colorNegro, colorBlanco, colorChampaign, colorBurdeos, colorNude] = await db.color.bulkCreate([
      { nombre: "Negro",    hex: "#000000" },
      { nombre: "Blanco",   hex: "#FFFFFF" },
      { nombre: "Champán",  hex: "#F7E7CE" },
      { nombre: "Burdeos",  hex: "#800020" },
      { nombre: "Nude",     hex: "#E8BEAC" },
    ], { transaction: t });

    // Categorías con jerarquía
    const [catRopa, catAccesorios] = await db.categoria.bulkCreate([
      { nombre: "Ropa",       descripcion: "Prendas de vestir femeninas" },
      { nombre: "Accesorios", descripcion: "Complementos y accesorios de moda" },
    ], { transaction: t });

    const [catVestidos, catBlusas, catBolsos] = await db.categoria.bulkCreate([
      { nombre: "Vestidos",       descripcion: "Vestidos de cóctel, midi y noche",    categoria_padre_id: catRopa.id },
      { nombre: "Blusas & Tops",  descripcion: "Blusas, tops y camisas femeninas",    categoria_padre_id: catRopa.id },
      { nombre: "Bolsos",         descripcion: "Clutches, minaudiéres y bolsos de mano", categoria_padre_id: catAccesorios.id },
    ], { transaction: t });

    console.log("✓ Catálogo base (4 marcas, 2 temporadas, 5 tallas, 5 colores, 5 categorías)");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 3 — Terceros (empleados, proveedores, clientes)
    // ════════════════════════════════════════════════════════════════════════

    const [empAdmin, empBodega, empVend1, empVend2, empSup] = await db.empleado.bulkCreate([
      {
        codigo: "EMP-001", nombres: "Carlos Alberto",  apellidos: "Ramírez López",
        dpi: "1234567890101", puesto: "Administrador General",
        sucursal_id: sucCentral.id, fecha_ingreso: "2020-01-15",
        email: "carlos.ramirez@andmoda.gt",  telefono: "55001100",
      },
      {
        codigo: "EMP-002", nombres: "María José",      apellidos: "Pérez Gómez",
        dpi: "2345678901202", puesto: "Jefa de Bodega",
        sucursal_id: sucCentral.id, fecha_ingreso: "2021-06-01",
        email: "maria.perez@andmoda.gt",     telefono: "55002200",
      },
      {
        codigo: "EMP-003", nombres: "Luis Fernando",   apellidos: "García Solís",
        dpi: "3456789012303", puesto: "Vendedor",
        sucursal_id: sucTienda.id,  fecha_ingreso: "2022-03-10",
        email: "luis.garcia@andmoda.gt",     telefono: "55003300",
      },
      {
        codigo: "EMP-004", nombres: "Sofía Elena",     apellidos: "Martínez Cruz",
        dpi: "4567890123404", puesto: "Vendedora",
        sucursal_id: sucTienda2.id, fecha_ingreso: "2023-07-15",
        email: "sofia.martinez@andmoda.gt",  telefono: "55004400",
      },
      {
        codigo: "EMP-005", nombres: "Jorge Antonio",   apellidos: "López Barrios",
        dpi: "5678901234505", puesto: "Supervisor de Tiendas",
        sucursal_id: sucCentral.id, fecha_ingreso: "2019-11-20",
        email: "jorge.lopez@andmoda.gt",     telefono: "55005500",
      },
    ], { transaction: t });

    const [provTextil, provImport, provAccesorios] = await db.proveedor.bulkCreate([
      {
        codigo: "PROV-001", razon_social: "Textiles Finos S.A.",
        nombre_comercial: "TextilesFinos",  nit: "1234567-8",
        direccion: "Km 12, Carretera al Pacífico",
        contacto_nombre: "Roberto González", telefono: "22334455",
        email: "ventas@textilesfinos.gt",
        condiciones_pago: "30 días neto",    plazo_entrega_dias: 7,
      },
      {
        codigo: "PROV-002", razon_social: "Haute Imports S.A.",
        nombre_comercial: "HauteImports",   nit: "2345678-9",
        direccion: "7a Avenida 22-35 Zona 4, Guatemala",
        contacto_nombre: "Andrea Fuentes",  telefono: "22998800",
        email: "compras@hauteimports.gt",
        condiciones_pago: "15 días neto",    plazo_entrega_dias: 5,
      },
      {
        codigo: "PROV-003", razon_social: "Accesorios Exclusivos S.R.L.",
        nombre_comercial: "AccesExclu",     nit: "3456789-0",
        direccion: "Zona 10, Ciudad de Guatemala",
        contacto_nombre: "Marco Rivas",     telefono: "24550011",
        email: "ventas@accesexclu.gt",
        condiciones_pago: "Contado",         plazo_entrega_dias: 3,
      },
    ], { transaction: t });

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
        email: "admin@andmoda.gt",     password_hash: hAdmin,
        perfil: "ADMIN",     app: "INTERNO",
        empleado_id: empAdmin.id,  sucursal_id: sucCentral.id,
        activo: true, email_verificado: true,
      },
      {
        email: "bodega@andmoda.gt",    password_hash: hBodega,
        perfil: "BODEGUERO", app: "INTERNO",
        empleado_id: empBodega.id, sucursal_id: sucCentral.id,
        activo: true, email_verificado: true,
      },
      {
        email: "vendedor1@andmoda.gt", password_hash: hVend1,
        perfil: "VENDEDOR",  app: "INTERNO",
        empleado_id: empVend1.id,  sucursal_id: sucTienda.id,
        activo: true, email_verificado: true,
      },
      {
        email: "vendedor2@andmoda.gt", password_hash: hVend2,
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

    const [prodVestido, prodBlusa, prodFalda, prodBlazer, prodPantalon, prodClutch] =
      await db.producto.bulkCreate([
        {
          codigo: "PROD-001", nombre: "Vestido Cóctel Midi",
          descripcion: "Vestido entallado de crepé con escote en V y falda midi. Ideal para eventos formales y cócteles.",
          categoria_id: catVestidos.id, marca_id: marcaLumiere.id,
          temporada_id: temp2026.id, genero: "MUJER",
        },
        {
          codigo: "PROD-002", nombre: "Blusa de Seda Asimétrica",
          descripcion: "Blusa fluida de seda natural con dobladillo asimétrico y cuello caído. Elegancia sin esfuerzo.",
          categoria_id: catBlusas.id, marca_id: marcaElite.id,
          temporada_id: temp2026.id, genero: "MUJER",
        },
        {
          codigo: "PROD-003", nombre: "Falda Lápiz de Tweed",
          descripcion: "Falda ajustada de mezcla de tweed con bolsillos laterales. Clásico atemporal con toque moderno. En oferta de temporada.",
          categoria_id: catRopa.id, marca_id: marcaLumiere.id,
          temporada_id: tempOtonio.id, genero: "MUJER",
        },
        {
          codigo: "PROD-004", nombre: "Blazer Estructurado",
          descripcion: "Blazer de sastre con corte italiano y hombreras sutiles. Perfecto para looks de oficina o noche.",
          categoria_id: catRopa.id, marca_id: marcaElite.id,
          temporada_id: temp2026.id, genero: "MUJER",
        },
        {
          codigo: "PROD-005", nombre: "Pantalón Palazzo",
          descripcion: "Pantalón de pierna amplia en satén fluido. Silueta sofisticada que combina comodidad y elegancia.",
          categoria_id: catRopa.id, marca_id: marcaSoiree.id,
          temporada_id: temp2026.id, genero: "MUJER",
        },
        {
          codigo: "PROD-006", nombre: "Clutch Minaudière",
          descripcion: "Bolso de mano estructurado con herrajes dorados y cierre magnético. Acabado en piel vegana premium.",
          categoria_id: catBolsos.id, marca_id: marcaVelour.id,
          temporada_id: temp2026.id, genero: "MUJER",
        },
      ], { transaction: t });

    // ── Variantes (17 en total) ───────────────────────────────────────────────
    // PROD-001 Vestido:   S/Negro, M/Champán, L/Burdeos
    // PROD-002 Blusa:     XS/Blanco, S/Nude, M/Negro
    // PROD-003 Falda:     XS/Negro, S/Burdeos, M/Champán
    // PROD-004 Blazer:    S/Negro, M/Blanco, L/Negro
    // PROD-005 Pantalón:  S/Champán, M/Negro, L/Nude
    // PROD-006 Clutch:    UNICO/Negro, UNICO/Burdeos
    const [
      varVesSN,  varVesMC,  varVesLB,
      varBluXSB, varBluSNu, varBluMN,
      varFalXSN, varFalSB,  varFalMC,
      varBlzSN,  varBlzMB,  varBlzLN,
      varPanSC,  varPanMN,  varPanLNu,
      varCltUN,  varCltUB,
    ] = await db.variante.bulkCreate([
      { sku: "VES-S-NGR",   producto_id: prodVestido.id,   talla_id: tallaSm.id,    color_id: colorNegro.id,     codigo_barras: "7500000000001", existencia_minima: 3 },
      { sku: "VES-M-CHP",   producto_id: prodVestido.id,   talla_id: tallaMd.id,    color_id: colorChampaign.id, codigo_barras: "7500000000002", existencia_minima: 3 },
      { sku: "VES-L-BUR",   producto_id: prodVestido.id,   talla_id: tallaL.id,     color_id: colorBurdeos.id,   codigo_barras: "7500000000003", existencia_minima: 2 },
      { sku: "BLU-XS-BLC",  producto_id: prodBlusa.id,     talla_id: tallaXs.id,    color_id: colorBlanco.id,    codigo_barras: "7500000000004", existencia_minima: 3 },
      { sku: "BLU-S-NUD",   producto_id: prodBlusa.id,     talla_id: tallaSm.id,    color_id: colorNude.id,      codigo_barras: "7500000000005", existencia_minima: 3 },
      { sku: "BLU-M-NGR",   producto_id: prodBlusa.id,     talla_id: tallaMd.id,    color_id: colorNegro.id,     codigo_barras: "7500000000006", existencia_minima: 2 },
      { sku: "FAL-XS-NGR",  producto_id: prodFalda.id,     talla_id: tallaXs.id,    color_id: colorNegro.id,     codigo_barras: "7500000000007", existencia_minima: 3 },
      { sku: "FAL-S-BUR",   producto_id: prodFalda.id,     talla_id: tallaSm.id,    color_id: colorBurdeos.id,   codigo_barras: "7500000000008", existencia_minima: 3 },
      { sku: "FAL-M-CHP",   producto_id: prodFalda.id,     talla_id: tallaMd.id,    color_id: colorChampaign.id, codigo_barras: "7500000000009", existencia_minima: 2 },
      { sku: "BLZ-S-NGR",   producto_id: prodBlazer.id,    talla_id: tallaSm.id,    color_id: colorNegro.id,     codigo_barras: "7500000000010", existencia_minima: 3 },
      { sku: "BLZ-M-BLC",   producto_id: prodBlazer.id,    talla_id: tallaMd.id,    color_id: colorBlanco.id,    codigo_barras: "7500000000011", existencia_minima: 3 },
      { sku: "BLZ-L-NGR",   producto_id: prodBlazer.id,    talla_id: tallaL.id,     color_id: colorNegro.id,     codigo_barras: "7500000000012", existencia_minima: 2 },
      { sku: "PAN-S-CHP",   producto_id: prodPantalon.id,  talla_id: tallaSm.id,    color_id: colorChampaign.id, codigo_barras: "7500000000013", existencia_minima: 3 },
      { sku: "PAN-M-NGR",   producto_id: prodPantalon.id,  talla_id: tallaMd.id,    color_id: colorNegro.id,     codigo_barras: "7500000000014", existencia_minima: 3 },
      { sku: "PAN-L-NUD",   producto_id: prodPantalon.id,  talla_id: tallaL.id,     color_id: colorNude.id,      codigo_barras: "7500000000015", existencia_minima: 2 },
      { sku: "CLT-U-NGR",   producto_id: prodClutch.id,    talla_id: tallaUnico.id, color_id: colorNegro.id,     codigo_barras: "7500000000016", existencia_minima: 2 },
      { sku: "CLT-U-BUR",   producto_id: prodClutch.id,    talla_id: tallaUnico.id, color_id: colorBurdeos.id,   codigo_barras: "7500000000017", existencia_minima: 2 },
    ], { transaction: t });

    // ── Precios (costo, minorista, mayorista + oferta para Falda Lápiz) ───────
    // [variante, costo, minorista, mayorista]
    const tablaPreciosRaw = [
      [varVesSN,  180.00, 495.00, 395.00],
      [varVesMC,  180.00, 495.00, 395.00],
      [varVesLB,  180.00, 495.00, 395.00],
      [varBluXSB, 120.00, 325.00, 259.00],
      [varBluSNu, 120.00, 325.00, 259.00],
      [varBluMN,  120.00, 325.00, 259.00],
      [varFalXSN, 145.00, 385.00, 299.00],
      [varFalSB,  145.00, 385.00, 299.00],
      [varFalMC,  145.00, 385.00, 299.00],
      [varBlzSN,  195.00, 525.00, 419.00],
      [varBlzMB,  195.00, 525.00, 419.00],
      [varBlzLN,  195.00, 525.00, 419.00],
      [varPanSC,  155.00, 425.00, 339.00],
      [varPanMN,  155.00, 425.00, 339.00],
      [varPanLNu, 155.00, 425.00, 339.00],
      [varCltUN,  250.00, 650.00, 520.00],
      [varCltUB,  250.00, 650.00, 520.00],
    ];

    const preciosRows = [];
    for (const [v, costo, min, may] of tablaPreciosRaw) {
      preciosRows.push(
        { variante_id: v.id, tipo: "COSTO",     monto: costo, vigente_desde: hoy(), registrado_por: usrAdmin.id },
        { variante_id: v.id, tipo: "MINORISTA", monto: min,   vigente_desde: hoy(), registrado_por: usrAdmin.id },
        { variante_id: v.id, tipo: "MAYORISTA", monto: may,   vigente_desde: hoy(), registrado_por: usrAdmin.id }
      );
    }

    // Oferta de temporada para Falda Lápiz de Tweed (≈26% descuento sobre minorista)
    for (const v of [varFalXSN, varFalSB, varFalMC]) {
      preciosRows.push({
        variante_id: v.id, tipo: "OFERTA", monto: 285.00,
        vigente_desde: hoy(), registrado_por: usrAdmin.id,
      });
    }

    await db.precio.bulkCreate(preciosRows, { transaction: t });

    await db.proveedor_producto.bulkCreate([
      { proveedor_id: provTextil.id,    producto_id: prodVestido.id,   costo_compra: 175.00, es_principal: true },
      { proveedor_id: provTextil.id,    producto_id: prodBlusa.id,     costo_compra: 115.00, es_principal: true },
      { proveedor_id: provImport.id,    producto_id: prodFalda.id,     costo_compra: 140.00, es_principal: true },
      { proveedor_id: provImport.id,    producto_id: prodBlazer.id,    costo_compra: 190.00, es_principal: true },
      { proveedor_id: provImport.id,    producto_id: prodPantalon.id,  costo_compra: 150.00, es_principal: true },
      { proveedor_id: provAccesorios.id,producto_id: prodClutch.id,    costo_compra: 245.00, es_principal: true },
    ], { transaction: t });

    console.log("✓ Catálogo (6 productos, 17 variantes, 54 precios, 6 proveedor-producto)");

    // ════════════════════════════════════════════════════════════════════════
    // SECCIÓN 6 — Inventario
    // ════════════════════════════════════════════════════════════════════════

    const todas_variantes = [
      varVesSN,  varVesMC,  varVesLB,
      varBluXSB, varBluSNu, varBluMN,
      varFalXSN, varFalSB,  varFalMC,
      varBlzSN,  varBlzMB,  varBlzLN,
      varPanSC,  varPanMN,  varPanLNu,
      varCltUN,  varCltUB,
    ];
    const todas_sucursales = [sucCentral, sucTienda, sucTienda2];

    // Inicializar existencias en 0
    const existenciasRows = [];
    for (const v of todas_variantes)
      for (const s of todas_sucursales)
        existenciasRows.push({ variante_id: v.id, sucursal_id: s.id });
    await db.existencia.bulkCreate(existenciasRows, { transaction: t });

    // ── Comprobante de compra (ENTRADA_COMPRA — bodega central, 17 variantes) ─
    const compraItems = [
      [varVesSN,  40, 180.00],
      [varVesMC,  40, 180.00],
      [varVesLB,  30, 180.00],
      [varBluXSB, 45, 120.00],
      [varBluSNu, 45, 120.00],
      [varBluMN,  35, 120.00],
      [varFalXSN, 40, 145.00],
      [varFalSB,  40, 145.00],
      [varFalMC,  35, 145.00],
      [varBlzSN,  35, 195.00],
      [varBlzMB,  35, 195.00],
      [varBlzLN,  25, 195.00],
      [varPanSC,  40, 155.00],
      [varPanMN,  40, 155.00],
      [varPanLNu, 30, 155.00],
      [varCltUN,  20, 250.00],
      [varCltUB,  20, 250.00],
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
        variante_id: v.id, sku: v.sku,
        descripcion: `${v.sku} — compra proveedor`,
        cantidad: qty, costo_unitario: costo, subtotal: qty * costo,
      })),
      { transaction: t }
    );

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
      [varVesSN,  15, 180.00, 40],
      [varVesMC,  15, 180.00, 40],
      [varVesLB,  10, 180.00, 30],
      [varBluXSB, 18, 120.00, 45],
      [varBluSNu, 18, 120.00, 45],
      [varFalXSN, 15, 145.00, 40],
      [varFalMC,  15, 145.00, 35],
      [varBlzSN,  12, 195.00, 35],
      [varCltUN,   8, 250.00, 20],
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
      [varBluMN,  15, 120.00, 35],
      [varFalSB,  15, 145.00, 40],
      [varBlzMB,  15, 195.00, 35],
      [varBlzLN,  10, 195.00, 25],
      [varPanSC,  15, 155.00, 40],
      [varPanMN,  15, 155.00, 40],
      [varPanLNu, 10, 155.00, 30],
      [varCltUB,   8, 250.00, 20],
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
    // 2× VES-S-NGR @ Q495 = Q990 + envío Q25 = Q1015
    // ────────────────────────────────────────────────────────────────────────
    const pedido1 = await db.pedido.create({
      numero: "PED-2026-0001",
      cliente_id: cliMinorista.id, tipo_cliente: "MINORISTA",
      sucursal_id: sucTienda.id, canal: "TIENDA", estado: "ENTREGADO",
      forma_pago: "EN_LINEA",
      subtotal: 990.00, costo_envio: 25.00, total: 1015.00,
      entrega_tipo: "ENVIO",
      entrega_destinatario: "Ana Lucía Morales",
      entrega_direccion: "5a Calle 3-40 Zona 10",
      entrega_municipio: "Guatemala", entrega_departamento: "Guatemala",
      entrega_telefono: "55441122",
      registrado_por: usrCli1.id,
    }, { transaction: t });

    await db.pedido_detalle.create({
      pedido_id: pedido1.id, variante_id: varVesSN.id, sku: "VES-S-NGR",
      descripcion: "Vestido Cóctel Midi — S / Negro",
      cantidad: 2, cantidad_despachada: 2,
      precio_unitario: 495.00, subtotal: 990.00,
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
      pedido_id: pedido1.id, total: 1015.00,
      usuario_id: usrAdmin.id, fecha: ahora(),
    }, { transaction: t });

    await db.comprobante_detalle.create({
      comprobante_id: compVenta1.id, variante_id: varVesSN.id, sku: "VES-S-NGR",
      descripcion: "Vestido Cóctel Midi — S / Negro",
      cantidad: 2, costo_unitario: 180.00, subtotal: 360.00,
    }, { transaction: t });

    await registrarVenta({ variante: varVesSN, sucursal: sucTienda, cantidad: 2, costoUnit: 180.00, saldoPrev: 15, pedido: pedido1, comprobante: compVenta1 });

    const txPago1 = await db.transaccion_pago.create({
      pedido_id: pedido1.id, proveedor: "STRIPE", id_externo: "pi_3PsKXrGtest001",
      tipo: "PAGO", monto: 1015.00, moneda: "GTQ", estado: "EXITOSA",
      mensaje_proveedor: "Payment succeeded", fecha: ahora(),
    }, { transaction: t });

    await db.transaccion_pago.create({
      pedido_id: pedido1.id, proveedor: "STRIPE", id_externo: "re_3PsKXrGtest001",
      tipo: "REEMBOLSO", transaccion_origen_id: txPago1.id,
      monto: 495.00, moneda: "GTQ", estado: "EXITOSA",
      mensaje_proveedor: "Partial refund issued",
      motivo: "Devolución de 1 unidad por talla incorrecta", fecha: ahora(),
    }, { transaction: t });

    // ────────────────────────────────────────────────────────────────────────
    // PED-2026-0002 · CLI-002 · MAYORISTA · T001 · INTERNO · CREDITO · PAGADO
    // 5× FAL-XS-NGR @ Q299 = Q1,495
    // ────────────────────────────────────────────────────────────────────────
    const pedido2 = await db.pedido.create({
      numero: "PED-2026-0002",
      cliente_id: cliMayorista.id, tipo_cliente: "MAYORISTA",
      sucursal_id: sucTienda.id, canal: "INTERNO", es_lote: true,
      estado: "PAGADO", forma_pago: "CREDITO",
      subtotal: 1495.00, costo_envio: 0, total: 1495.00,
      entrega_tipo: "RETIRO_SUCURSAL",
      entrega_destinatario: "Distribuidora Morales",
      registrado_por: usrAdmin.id,
    }, { transaction: t });

    await db.pedido_detalle.create({
      pedido_id: pedido2.id, variante_id: varFalXSN.id, sku: "FAL-XS-NGR",
      descripcion: "Falda Lápiz de Tweed — XS / Negro",
      cantidad: 5, cantidad_despachada: 5,
      precio_unitario: 299.00, subtotal: 1495.00,
    }, { transaction: t });

    await db.pedido_historial.bulkCreate([
      { pedido_id: pedido2.id, estado_anterior: null,         estado_nuevo: "REGISTRADO", usuario_id: usrAdmin.id, fecha: ahora() },
      { pedido_id: pedido2.id, estado_anterior: "REGISTRADO", estado_nuevo: "PAGADO",     usuario_id: usrAdmin.id, motivo: "Crédito mayorista autorizado", fecha: ahora() },
    ], { transaction: t });

    await db.credito_movimiento.bulkCreate([
      {
        cliente_id: cliMayorista.id, tipo: "CARGO", pedido_id: pedido2.id,
        monto: 1495.00, saldo_resultante: 1495.00,
        referencia: `Pedido ${pedido2.numero}`,
        usuario_id: usrAdmin.id, fecha: ahora(),
      },
      {
        cliente_id: cliMayorista.id, tipo: "ABONO", pedido_id: pedido2.id,
        monto: 500.00, saldo_resultante: 995.00,
        referencia: "Pago parcial — transferencia bancaria",
        usuario_id: usrAdmin.id, fecha: ahora(),
      },
    ], { transaction: t });

    await db.cliente.update(
      { credito_utilizado: 995.00 },
      { where: { id: cliMayorista.id }, transaction: t }
    );

    await registrarVenta({ variante: varFalXSN, sucursal: sucTienda, cantidad: 5, costoUnit: 145.00, saldoPrev: 15, pedido: pedido2, comprobante: null });

    // ────────────────────────────────────────────────────────────────────────
    // PED-2026-0003 · CLI-001 · MINORISTA · T001 · EN_LINEA · ENTREGADO
    // 1× BLU-XS-BLC @ Q325 + 1× BLZ-S-NGR @ Q525 = Q850 + envío Q25 = Q875
    // ────────────────────────────────────────────────────────────────────────
    const pedido3 = await db.pedido.create({
      numero: "PED-2026-0003",
      cliente_id: cliMinorista.id, tipo_cliente: "MINORISTA",
      sucursal_id: sucTienda.id, canal: "TIENDA", estado: "ENTREGADO",
      forma_pago: "EN_LINEA",
      subtotal: 850.00, costo_envio: 25.00, total: 875.00,
      entrega_tipo: "ENVIO",
      entrega_destinatario: "Ana Lucía Morales",
      entrega_direccion: "5a Calle 3-40 Zona 10",
      entrega_municipio: "Guatemala", entrega_departamento: "Guatemala",
      entrega_telefono: "55441122",
      registrado_por: usrCli1.id,
    }, { transaction: t });

    await db.pedido_detalle.bulkCreate([
      {
        pedido_id: pedido3.id, variante_id: varBluXSB.id, sku: "BLU-XS-BLC",
        descripcion: "Blusa de Seda Asimétrica — XS / Blanco",
        cantidad: 1, cantidad_despachada: 1,
        precio_unitario: 325.00, subtotal: 325.00,
      },
      {
        pedido_id: pedido3.id, variante_id: varBlzSN.id, sku: "BLZ-S-NGR",
        descripcion: "Blazer Estructurado — S / Negro",
        cantidad: 1, cantidad_despachada: 1,
        precio_unitario: 525.00, subtotal: 525.00,
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
      pedido_id: pedido3.id, total: 875.00,
      usuario_id: usrAdmin.id, fecha: ahora(),
    }, { transaction: t });

    await db.comprobante_detalle.bulkCreate([
      {
        comprobante_id: compVenta3.id, variante_id: varBluXSB.id, sku: "BLU-XS-BLC",
        descripcion: "Blusa de Seda Asimétrica — XS / Blanco",
        cantidad: 1, costo_unitario: 120.00, subtotal: 120.00,
      },
      {
        comprobante_id: compVenta3.id, variante_id: varBlzSN.id, sku: "BLZ-S-NGR",
        descripcion: "Blazer Estructurado — S / Negro",
        cantidad: 1, costo_unitario: 195.00, subtotal: 195.00,
      },
    ], { transaction: t });

    await registrarVenta({ variante: varBluXSB, sucursal: sucTienda, cantidad: 1, costoUnit: 120.00, saldoPrev: 18, pedido: pedido3, comprobante: compVenta3 });
    await registrarVenta({ variante: varBlzSN,  sucursal: sucTienda, cantidad: 1, costoUnit: 195.00, saldoPrev: 12, pedido: pedido3, comprobante: compVenta3 });

    await db.transaccion_pago.create({
      pedido_id: pedido3.id, proveedor: "STRIPE", id_externo: "pi_3PsKXrGtest003",
      tipo: "PAGO", monto: 875.00, moneda: "GTQ", estado: "EXITOSA",
      mensaje_proveedor: "Payment succeeded", fecha: ahora(),
    }, { transaction: t });

    // ────────────────────────────────────────────────────────────────────────
    // PED-2026-0004 · CLI-003 · MINORISTA · T002 · EN_LINEA · ENTREGADO
    // 1× PAN-S-CHP @ Q425 + envío Q40 = Q465
    // ────────────────────────────────────────────────────────────────────────
    const pedido4 = await db.pedido.create({
      numero: "PED-2026-0004",
      cliente_id: cli3.id, tipo_cliente: "MINORISTA",
      sucursal_id: sucTienda2.id, canal: "TIENDA", estado: "ENTREGADO",
      forma_pago: "EN_LINEA",
      subtotal: 425.00, costo_envio: 40.00, total: 465.00,
      entrega_tipo: "ENVIO",
      entrega_destinatario: "Pedro José Hernández",
      entrega_direccion: "10a Calle 5-30 Zona 3, Xela",
      entrega_municipio: "Quetzaltenango", entrega_departamento: "Quetzaltenango",
      entrega_telefono: "55332211",
      registrado_por: usrCli3.id,
    }, { transaction: t });

    await db.pedido_detalle.create({
      pedido_id: pedido4.id, variante_id: varPanSC.id, sku: "PAN-S-CHP",
      descripcion: "Pantalón Palazzo — S / Champán",
      cantidad: 1, cantidad_despachada: 1,
      precio_unitario: 425.00, subtotal: 425.00,
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
      pedido_id: pedido4.id, total: 465.00,
      usuario_id: usrAdmin.id, fecha: ahora(),
    }, { transaction: t });

    await db.comprobante_detalle.create({
      comprobante_id: compVenta4.id, variante_id: varPanSC.id, sku: "PAN-S-CHP",
      descripcion: "Pantalón Palazzo — S / Champán",
      cantidad: 1, costo_unitario: 155.00, subtotal: 155.00,
    }, { transaction: t });

    await registrarVenta({ variante: varPanSC, sucursal: sucTienda2, cantidad: 1, costoUnit: 155.00, saldoPrev: 15, pedido: pedido4, comprobante: compVenta4 });

    await db.transaccion_pago.create({
      pedido_id: pedido4.id, proveedor: "STRIPE", id_externo: "pi_3PsKXrGtest004",
      tipo: "PAGO", monto: 465.00, moneda: "GTQ", estado: "EXITOSA",
      mensaje_proveedor: "Payment succeeded", fecha: ahora(),
    }, { transaction: t });

    // ────────────────────────────────────────────────────────────────────────
    // PED-2026-0005 · CLI-005 · MAYORISTA · T002 · INTERNO · CREDITO · PAGADO
    // 3× BLZ-M-BLC @ Q419 + 2× PAN-M-NGR @ Q339 = Q1,257 + Q678 = Q1,935
    // ────────────────────────────────────────────────────────────────────────
    const pedido5 = await db.pedido.create({
      numero: "PED-2026-0005",
      cliente_id: cli5.id, tipo_cliente: "MAYORISTA",
      sucursal_id: sucTienda2.id, canal: "INTERNO", es_lote: true,
      estado: "PAGADO", forma_pago: "CREDITO",
      subtotal: 1935.00, costo_envio: 0, total: 1935.00,
      entrega_tipo: "RETIRO_SUCURSAL",
      entrega_destinatario: "Importaciones del Norte S.A.",
      registrado_por: usrAdmin.id,
    }, { transaction: t });

    await db.pedido_detalle.bulkCreate([
      {
        pedido_id: pedido5.id, variante_id: varBlzMB.id, sku: "BLZ-M-BLC",
        descripcion: "Blazer Estructurado — M / Blanco",
        cantidad: 3, cantidad_despachada: 3,
        precio_unitario: 419.00, subtotal: 1257.00,
      },
      {
        pedido_id: pedido5.id, variante_id: varPanMN.id, sku: "PAN-M-NGR",
        descripcion: "Pantalón Palazzo — M / Negro",
        cantidad: 2, cantidad_despachada: 2,
        precio_unitario: 339.00, subtotal: 678.00,
      },
    ], { transaction: t });

    await db.pedido_historial.bulkCreate([
      { pedido_id: pedido5.id, estado_anterior: null,         estado_nuevo: "REGISTRADO", usuario_id: usrAdmin.id, fecha: ahora() },
      { pedido_id: pedido5.id, estado_anterior: "REGISTRADO", estado_nuevo: "PAGADO",     usuario_id: usrAdmin.id, motivo: "Crédito mayorista autorizado", fecha: ahora() },
    ], { transaction: t });

    await db.credito_movimiento.bulkCreate([
      {
        cliente_id: cli5.id, tipo: "CARGO", pedido_id: pedido5.id,
        monto: 1935.00, saldo_resultante: 1935.00,
        referencia: `Pedido ${pedido5.numero}`,
        usuario_id: usrAdmin.id, fecha: ahora(),
      },
      {
        cliente_id: cli5.id, tipo: "ABONO", pedido_id: pedido5.id,
        monto: 700.00, saldo_resultante: 1235.00,
        referencia: "Pago parcial — cheque bancario",
        usuario_id: usrAdmin.id, fecha: ahora(),
      },
    ], { transaction: t });

    await db.cliente.update(
      { credito_utilizado: 1235.00 },
      { where: { id: cli5.id }, transaction: t }
    );

    await registrarVenta({ variante: varBlzMB, sucursal: sucTienda2, cantidad: 3, costoUnit: 195.00, saldoPrev: 15, pedido: pedido5, comprobante: null });
    await registrarVenta({ variante: varPanMN, sucursal: sucTienda2, cantidad: 2, costoUnit: 155.00, saldoPrev: 15, pedido: pedido5, comprobante: null });

    // ────────────────────────────────────────────────────────────────────────
    // PED-2026-0006 · CLI-004 · MINORISTA · T001 · EN_LINEA · DESPACHADO
    // 1× BLU-S-NUD @ Q325 + envío Q25 = Q350
    // ────────────────────────────────────────────────────────────────────────
    const pedido6 = await db.pedido.create({
      numero: "PED-2026-0006",
      cliente_id: cli4.id, tipo_cliente: "MINORISTA",
      sucursal_id: sucTienda.id, canal: "TIENDA", estado: "DESPACHADO",
      forma_pago: "EN_LINEA",
      subtotal: 325.00, costo_envio: 25.00, total: 350.00,
      entrega_tipo: "ENVIO",
      entrega_destinatario: "Laura Beatriz Santos",
      entrega_direccion: "Residenciales Las Palmas, Lote 14",
      entrega_municipio: "Mixco", entrega_departamento: "Guatemala",
      entrega_telefono: "55662233",
      registrado_por: usrCli4.id,
    }, { transaction: t });

    await db.pedido_detalle.create({
      pedido_id: pedido6.id, variante_id: varBluSNu.id, sku: "BLU-S-NUD",
      descripcion: "Blusa de Seda Asimétrica — S / Nude",
      cantidad: 1, cantidad_despachada: 1,
      precio_unitario: 325.00, subtotal: 325.00,
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
      tipo: "PAGO", monto: 350.00, moneda: "GTQ", estado: "EXITOSA",
      mensaje_proveedor: "Payment succeeded", fecha: ahora(),
    }, { transaction: t });

    await registrarVenta({ variante: varBluSNu, sucursal: sucTienda, cantidad: 1, costoUnit: 120.00, saldoPrev: 18, pedido: pedido6, comprobante: null });

    // ────────────────────────────────────────────────────────────────────────
    // PED-2026-0007 · CLI-003 · MINORISTA · T001 · EN_LINEA · EN_PREPARACION
    // 1× VES-M-CHP @ Q495 + envío Q40 = Q535
    // ────────────────────────────────────────────────────────────────────────
    const pedido7 = await db.pedido.create({
      numero: "PED-2026-0007",
      cliente_id: cli3.id, tipo_cliente: "MINORISTA",
      sucursal_id: sucTienda.id, canal: "TIENDA", estado: "EN_PREPARACION",
      forma_pago: "EN_LINEA",
      subtotal: 495.00, costo_envio: 40.00, total: 535.00,
      entrega_tipo: "ENVIO",
      entrega_destinatario: "Pedro José Hernández",
      entrega_direccion: "10a Calle 5-30 Zona 3, Xela",
      entrega_municipio: "Quetzaltenango", entrega_departamento: "Quetzaltenango",
      entrega_telefono: "55332211",
      registrado_por: usrCli3.id,
    }, { transaction: t });

    await db.pedido_detalle.create({
      pedido_id: pedido7.id, variante_id: varVesMC.id, sku: "VES-M-CHP",
      descripcion: "Vestido Cóctel Midi — M / Champán",
      cantidad: 1, cantidad_despachada: 0,
      precio_unitario: 495.00, subtotal: 495.00,
    }, { transaction: t });

    await db.pedido_historial.bulkCreate([
      { pedido_id: pedido7.id, estado_anterior: null,             estado_nuevo: "REGISTRADO",     usuario_id: usrCli3.id,   fecha: ahora() },
      { pedido_id: pedido7.id, estado_anterior: "REGISTRADO",     estado_nuevo: "PENDIENTE_PAGO", usuario_id: usrCli3.id,   fecha: ahora() },
      { pedido_id: pedido7.id, estado_anterior: "PENDIENTE_PAGO", estado_nuevo: "PAGADO",         usuario_id: null, motivo: "Webhook Stripe confirmado", fecha: ahora() },
      { pedido_id: pedido7.id, estado_anterior: "PAGADO",         estado_nuevo: "EN_PREPARACION", usuario_id: usrVend1.id,  fecha: ahora() },
    ], { transaction: t });

    await db.transaccion_pago.create({
      pedido_id: pedido7.id, proveedor: "STRIPE", id_externo: "pi_3PsKXrGtest007",
      tipo: "PAGO", monto: 535.00, moneda: "GTQ", estado: "EXITOSA",
      mensaje_proveedor: "Payment succeeded", fecha: ahora(),
    }, { transaction: t });

    await registrarVenta({ variante: varVesMC, sucursal: sucTienda, cantidad: 1, costoUnit: 180.00, saldoPrev: 15, pedido: pedido7, comprobante: null });

    // ────────────────────────────────────────────────────────────────────────
    // PED-2026-0008 · CLI-005 · MAYORISTA · T001 · INTERNO · CREDITO · REGISTRADO
    // 3× CLT-U-NGR @ Q520 = Q1,560
    // ────────────────────────────────────────────────────────────────────────
    const pedido8 = await db.pedido.create({
      numero: "PED-2026-0008",
      cliente_id: cli5.id, tipo_cliente: "MAYORISTA",
      sucursal_id: sucTienda.id, canal: "INTERNO", es_lote: true,
      estado: "REGISTRADO", forma_pago: "CREDITO",
      subtotal: 1560.00, costo_envio: 0, total: 1560.00,
      entrega_tipo: "RETIRO_SUCURSAL",
      entrega_destinatario: "Importaciones del Norte S.A.",
      registrado_por: usrAdmin.id,
    }, { transaction: t });

    await db.pedido_detalle.create({
      pedido_id: pedido8.id, variante_id: varCltUN.id, sku: "CLT-U-NGR",
      descripcion: "Clutch Minaudière — Negro",
      cantidad: 3, cantidad_despachada: 0,
      precio_unitario: 520.00, subtotal: 1560.00,
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
      { carrito_id: carrito1.id, variante_id: varVesMC.id,  cantidad: 1 },
      { carrito_id: carrito1.id, variante_id: varBluXSB.id, cantidad: 1 },
    ], { transaction: t });

    const carrito2 = await db.carrito.create(
      { cliente_id: cli3.id, activo: true }, { transaction: t }
    );
    await db.carrito_detalle.bulkCreate([
      { carrito_id: carrito2.id, variante_id: varFalMC.id,  cantidad: 1 },
      { carrito_id: carrito2.id, variante_id: varPanSC.id,  cantidad: 1 },
    ], { transaction: t });

    const carrito3 = await db.carrito.create(
      { cliente_id: cli4.id, activo: true }, { transaction: t }
    );
    await db.carrito_detalle.create(
      { carrito_id: carrito3.id, variante_id: varCltUN.id, cantidad: 1 },
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

  await validar();
}

// ═════════════════════════════════════════════════════════════════════════════
// VALIDACIONES
// ═════════════════════════════════════════════════════════════════════════════
async function validar() {
  let todoOk = true;

  // ── 1. Conteo de filas ────────────────────────────────────────────────────
  // Movimientos: 17 ENTRADA_COMPRA
  //            + 9 SALIDA_TRASLADO1 + 9 ENTRADA_TRASLADO1
  //            + 8 SALIDA_TRASLADO2 + 8 ENTRADA_TRASLADO2
  //            + 8 SALIDA_VENTA (ped1..ped7 excluyendo ped8)
  //            = 59
  // Comprobante_detalle: 17 (compra) + 1 (ped1) + 2 (ped3) + 1 (ped4) = 21
  // Pedido_historial: 6+2+6+6+2+5+4+1 = 32
  // Precios: 17×3 + 3 OFERTA (Falda) = 54
  const modelos = [
    ["sucursal",              3],
    ["zona_envio",            6],
    ["parametro",             8],
    ["correlativo",           9],
    ["marca",                 4],
    ["temporada",             2],
    ["talla",                 5],
    ["color",                 5],
    ["categoria",             5],
    ["empleado",              5],
    ["proveedor",             3],
    ["cliente",               6],
    ["usuario",               8],
    ["direccion_cliente",     6],
    ["producto",              6],
    ["variante",             17],
    ["precio",               54],
    ["proveedor_producto",    6],
    ["existencia",           51],
    ["traslado",              2],
    ["traslado_detalle",     17],
    ["comprobante",           4],
    ["comprobante_detalle",  21],
    ["movimiento_inventario",59],
    ["pedido",                8],
    ["pedido_detalle",       10],
    ["pedido_historial",     32],
    ["transaccion_pago",      6],
    ["credito_movimiento",    4],
    ["carrito",               3],
    ["carrito_detalle",       5],
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
  console.log("\n── 4. Traversal: variante → producto → precios vigentes → existencias ──");
  const varT = await db.variante.findOne({
    where: { sku: "VES-S-NGR" },
    include: [
      { model: db.producto },
      { model: db.precio, where: { vigente_hasta: null }, required: false },
      { model: db.existencia, include: [{ model: db.sucursal }] },
    ],
  });

  if (!varT) {
    console.log("  ✗ Variante VES-S-NGR no encontrada");
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
    where: { nombre: "Vestidos" },
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
