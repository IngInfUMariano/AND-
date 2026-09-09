// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "pedido"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Pedido = sequelize.define("pedido", {
    numero: {
      type: Sequelize.STRING(20),
      allowNull: false
    },
    tipo_cliente: {
      // Copia histórica del tipo de cliente al momento del pedido; no varía si el cliente cambia de tipo
      type: Sequelize.ENUM("MINORISTA", "MAYORISTA"),
      allowNull: false
    },
    canal: {
      // TIENDA = tienda en línea; INTERNO = creado desde el panel de administración
      type: Sequelize.ENUM("TIENDA", "INTERNO"),
      allowNull: false
    },
    es_lote: {
      // Pedido mayorista que abarca múltiples líneas de gran volumen
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    estado: {
      // ENUM restringe los valores permitidos a nivel de base de datos
      type: Sequelize.ENUM(
        "REGISTRADO",
        "PENDIENTE_PAGO",
        "PAGADO",
        "EN_PREPARACION",
        "DESPACHADO",
        "ENTREGADO",
        "ANULADO"
      ),
      defaultValue: "REGISTRADO"
    },
    forma_pago: {
      type: Sequelize.ENUM("EN_LINEA", "CREDITO"),
      allowNull: false
    },
    subtotal: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    costo_envio: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    total: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    entrega_tipo: {
      type: Sequelize.ENUM("ENVIO", "RETIRO_SUCURSAL"),
      allowNull: false
    },
    entrega_destinatario: {
      // Copia del nombre del destinatario al momento del pedido; desvinculada de la dirección
      type: Sequelize.STRING(120),
      allowNull: true
    },
    entrega_direccion: {
      // Copia de la dirección al momento del pedido; no se actualiza si el cliente la cambia
      type: Sequelize.STRING(250),
      allowNull: true
    },
    entrega_municipio: {
      type: Sequelize.STRING(80),
      allowNull: true
    },
    entrega_departamento: {
      type: Sequelize.STRING(80),
      allowNull: true
    },
    entrega_telefono: {
      type: Sequelize.STRING(20),
      allowNull: true
    },
    motivo_anulacion: {
      type: Sequelize.STRING(250),
      allowNull: true
    },
    fecha_expiracion: {
      // Para pedidos en línea: fecha límite para completar el pago antes de liberar el stock
      type: Sequelize.DATE,
      allowNull: true
    },
    observaciones: {
      type: Sequelize.STRING(500),
      allowNull: true
    }
  }, {
    name: { singular: "pedido", plural: "pedidos" },
    indexes: [
      { unique: true, fields: ["numero"] },
      { fields: ["estado", "sucursal_id"] },
      { fields: ["cliente_id", "created_at"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Pedido.associate = (db) => {
    // Un pedido pertenece a un cliente
    Pedido.belongsTo(db.cliente, { foreignKey: "cliente_id" });
    // Un pedido puede estar asignado a una sucursal para preparación
    Pedido.belongsTo(db.sucursal, { foreignKey: "sucursal_id" });
    // Un pedido fue registrado por un usuario (null si fue desde la tienda en línea sin sesión interna)
    Pedido.belongsTo(db.usuario, { foreignKey: "registrado_por", as: "registrador" });
    // Un pedido tiene muchas líneas de detalle
    Pedido.hasMany(db.pedido_detalle, { foreignKey: "pedido_id" });
    // Un pedido tiene un historial de cambios de estado
    Pedido.hasMany(db.pedido_historial, { foreignKey: "pedido_id" });
    // Un pedido puede tener muchas transacciones de pago
    Pedido.hasMany(db.transaccion_pago, { foreignKey: "pedido_id" });
    // Un pedido puede aparecer en muchos comprobantes
    Pedido.hasMany(db.comprobante, { foreignKey: "pedido_id" });
  };

  return Pedido;
};
