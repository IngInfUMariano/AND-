// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "comprobante"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Comprobante = sequelize.define("comprobante", {
    numero: {
      type: Sequelize.STRING(25),
      allowNull: false
    },
    tipo: {
      // ENTRADA = compra/recepción; SALIDA = venta/despacho
      type: Sequelize.ENUM("ENTRADA", "SALIDA"),
      allowNull: false
    },
    subtipo: {
      // ENUM restringe los valores permitidos a nivel de base de datos
      type: Sequelize.ENUM("COMPRA", "MERMA", "VENTA", "TRASLADO", "DEVOLUCION", "AJUSTE"),
      allowNull: false
    },
    documento_externo: {
      // Número de factura o documento del proveedor externo
      type: Sequelize.STRING(40),
      allowNull: true
    },
    total: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    anulado: {
      // Los comprobantes nunca se eliminan; solo se marcan como anulados
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    motivo_anulacion: {
      type: Sequelize.STRING(250),
      allowNull: true
    },
    fecha_anulacion: {
      type: Sequelize.DATE,
      allowNull: true
    },
    fecha: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    observaciones: {
      type: Sequelize.STRING(500),
      allowNull: true
    }
  }, {
    // El comprobante nunca se modifica: es el documento contable oficial
    updatedAt: false,
    name: { singular: "comprobante", plural: "comprobantes" },
    indexes: [
      { unique: true, fields: ["numero"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Comprobante.associate = (db) => {
    // Un comprobante pertenece a una sucursal
    Comprobante.belongsTo(db.sucursal, { foreignKey: "sucursal_id" });
    // Un comprobante puede estar asociado a un proveedor (compras)
    Comprobante.belongsTo(db.proveedor, { foreignKey: "proveedor_id" });
    // Un comprobante puede estar asociado a un cliente (ventas/devoluciones)
    Comprobante.belongsTo(db.cliente, { foreignKey: "cliente_id" });
    // Un comprobante puede estar asociado a un pedido de venta
    Comprobante.belongsTo(db.pedido, { foreignKey: "pedido_id" });
    // Un comprobante puede estar asociado a un traslado entre sucursales
    Comprobante.belongsTo(db.traslado, { foreignKey: "traslado_id" });
    // El comprobante fue anulado por un usuario
    Comprobante.belongsTo(db.usuario, { foreignKey: "anulado_por", as: "anulador" });
    // El comprobante fue creado por un usuario
    Comprobante.belongsTo(db.usuario, { foreignKey: "usuario_id", as: "creador" });
    // Un comprobante tiene muchas líneas de detalle
    Comprobante.hasMany(db.comprobante_detalle, { foreignKey: "comprobante_id" });
    // Un comprobante puede generar muchos movimientos de inventario
    Comprobante.hasMany(db.movimiento_inventario, { foreignKey: "comprobante_id" });
  };

  return Comprobante;
};
