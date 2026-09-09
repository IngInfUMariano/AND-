// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "proveedor_producto"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const ProveedorProducto = sequelize.define("proveedor_producto", {
    codigo_proveedor: {
      // Código que el propio proveedor usa para identificar el producto en su catálogo
      type: Sequelize.STRING(40),
      allowNull: true
    },
    costo_compra: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    es_principal: {
      // Indica el proveedor preferido para reposición automática
      type: Sequelize.BOOLEAN,
      defaultValue: false
    }
  }, {
    // Índice único: un proveedor no puede estar registrado dos veces para el mismo producto
    name: { singular: "proveedor_producto", plural: "proveedor_productos" },
    indexes: [
      {
        unique: true,
        fields: ["proveedor_id", "producto_id"]
      }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  ProveedorProducto.associate = (db) => {
    // Esta relación pertenece a un proveedor
    ProveedorProducto.belongsTo(db.proveedor, { foreignKey: "proveedor_id" });
    // Esta relación pertenece a un producto
    ProveedorProducto.belongsTo(db.producto, { foreignKey: "producto_id" });
  };

  return ProveedorProducto;
};
