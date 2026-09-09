// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "pedido_detalle"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const PedidoDetalle = sequelize.define("pedido_detalle", {
    sku: {
      // Copia histórica del SKU al momento del pedido; la variante podría desactivarse después
      type: Sequelize.STRING(40),
      allowNull: false
    },
    descripcion: {
      // Copia histórica del nombre y talla/color al momento del pedido
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
    cantidad_despachada: {
      // Permite despachos parciales; cuando iguala cantidad el detalle está completo
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    precio_unitario: {
      // Precio congelado al momento del pedido; no cambia si el precio de lista varía después
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    subtotal: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    }
  }, {
    name: { singular: "pedido_detalle", plural: "pedido_detalles" }
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  PedidoDetalle.associate = (db) => {
    // Un detalle pertenece a un pedido
    PedidoDetalle.belongsTo(db.pedido, { foreignKey: "pedido_id" });
    // Un detalle hace referencia a la variante original (para consultas de stock)
    PedidoDetalle.belongsTo(db.variante, { foreignKey: "variante_id" });
  };

  return PedidoDetalle;
};
