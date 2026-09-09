// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "variante"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Variante = sequelize.define("variante", {
    sku: {
      // El SKU es inmutable: identificador permanente de la variante en todo el sistema
      type: Sequelize.STRING(40),
      allowNull: false
    },
    codigo_barras: {
      type: Sequelize.STRING(50),
      allowNull: true
    },
    activo: {
      // Las bajas son lógicas: no se elimina el registro, se desactiva
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    // Índice único: la combinación producto + talla + color no puede repetirse
    name: { singular: "variante", plural: "variantes" },
    indexes: [
      { unique: true, fields: ["sku"] },
      { unique: true, fields: ["codigo_barras"] },
      { unique: true, fields: ["producto_id", "talla_id", "color_id"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Variante.associate = (db) => {
    // Una variante pertenece a un producto
    Variante.belongsTo(db.producto, { foreignKey: "producto_id" });
    // Una variante tiene una talla específica
    Variante.belongsTo(db.talla, { foreignKey: "talla_id" });
    // Una variante tiene un color específico
    Variante.belongsTo(db.color, { foreignKey: "color_id" });
    // Una variante tiene existencia registrada por sucursal
    Variante.hasMany(db.existencia, { foreignKey: "variante_id" });
    // Una variante tiene un historial de precios
    Variante.hasMany(db.precio, { foreignKey: "variante_id" });
    // Una variante tiene muchos movimientos de inventario
    Variante.hasMany(db.movimiento_inventario, { foreignKey: "variante_id" });
    // Una variante aparece en muchas líneas de detalle de pedido
    Variante.hasMany(db.pedido_detalle, { foreignKey: "variante_id" });
  };

  return Variante;
};
