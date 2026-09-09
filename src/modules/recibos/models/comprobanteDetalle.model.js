// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "comprobante_detalle"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const ComprobanteDetalle = sequelize.define("comprobante_detalle", {
    sku: {
      // Copia del SKU al momento del comprobante; desvinculada de cambios futuros en la variante
      type: Sequelize.STRING(40),
      allowNull: false
    },
    descripcion: {
      // Copia del nombre del producto al momento del comprobante
      type: Sequelize.STRING(200),
      allowNull: false
    },
    cantidad: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    costo_unitario: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    subtotal: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    }
  }, {
    name: { singular: "comprobante_detalle", plural: "comprobante_detalles" }
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  ComprobanteDetalle.associate = (db) => {
    // Un detalle pertenece a un comprobante
    ComprobanteDetalle.belongsTo(db.comprobante, { foreignKey: "comprobante_id" });
    // Un detalle hace referencia a la variante del producto
    ComprobanteDetalle.belongsTo(db.variante, { foreignKey: "variante_id" });
  };

  return ComprobanteDetalle;
};
